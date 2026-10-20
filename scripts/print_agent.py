#!/usr/bin/env python3
"""Stamp2Go Windows production bridge (Python 3.10+, stdlib only).

Safe default: save a verified PDF and JSON ticket to a local folder.
Opt-in printing requires a separately tested local adapter executable.
This agent MUST run on the studio PC, not on Vercel.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_PDF_BYTES = 20 * 1024 * 1024
ORDER_ID = re.compile(r"^ORD-[A-Za-z0-9-]{5,64}$")
FILENAME_VERSION = 1


class BlockRedirects(HTTPRedirectHandler):
    """Do not forward machine credentials across HTTP redirects."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RuntimeError("Redirect blocked; configure STAMP_SITE_URL to the site's canonical HTTPS URL")


HTTP = build_opener(BlockRedirects)


def stamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def required_env(key: str) -> str:
    value = os.getenv(key, "").strip()
    if not value:
        raise ValueError(f"Missing {key} environment variable")
    return value


def config():
    base = required_env("STAMP_SITE_URL").rstrip("/")
    parts = urlsplit(base)
    if parts.scheme != "https" and not (parts.scheme == "http" and parts.hostname in ("localhost", "127.0.0.1")):
        raise ValueError("STAMP_SITE_URL must be HTTPS (except localhost)")
    if parts.path not in ("", "/") or parts.query or parts.fragment or not parts.netloc:
        raise ValueError("STAMP_SITE_URL must contain only the origin, e.g. https://www.stamp2go.co.il")
    token = required_env("STAMP_PRINT_AGENT_TOKEN")
    if len(token) < 32:
        raise ValueError("STAMP_PRINT_AGENT_TOKEN needs at least 32 characters")
    path = Path(os.getenv("STAMP_PRINT_DIR", str(Path.home() / "Stamp2Go" / "Production"))).expanduser().resolve()
    mode = os.getenv("STAMP_PRINT_MODE", "stage").strip().lower()
    if mode not in ("stage", "command"):
        raise ValueError("STAMP_PRINT_MODE must be 'stage' or 'command'")
    if mode == "command" and os.getenv("STAMP_ENABLE_REAL_PRINT", "") != "YES_I_TESTED_IT":
        raise ValueError("Real printing disabled. Confirm adapter tests before enabling it.")
    args = None
    if mode == "command":
        args = json.loads(required_env("STAMP_PRINT_COMMAND_JSON"))
        if not isinstance(args, list) or not args or not all(isinstance(a, str) for a in args):
            raise ValueError("STAMP_PRINT_COMMAND_JSON must be a JSON list of command arguments")
        if not any("{file}" in a for a in args) or not any("{copies}" in a for a in args):
            raise ValueError("Print command must include {file} and {copies}")
        if not Path(args[0]).is_file():
            raise ValueError("Printer adapter executable not found; use an absolute file path")
    interval = max(15, min(3600, int(os.getenv("STAMP_POLL_SECONDS", "30"))))
    path.mkdir(parents=True, exist_ok=True)
    return base, token, path, mode, args, interval


def request_bytes(base: str, token: str, resource: str) -> bytes:
    if not resource.startswith("/api/print-agent/") or urlsplit(resource).scheme or urlsplit(resource).netloc:
        raise ValueError("Refusing unexpected or external print-agent URL")
    req = Request(
        base + resource,
        headers={
            "Authorization": "Bearer " + token,
            "Accept": "application/pdf, application/json",
            "User-Agent": "Stamp2Go-Local-Bridge/1.0",
        },
    )
    with HTTP.open(req, timeout=25) as response:
        size = response.headers.get("Content-Length")
        if size and int(size) > MAX_PDF_BYTES:
            raise ValueError("Job response larger than permitted maximum")
        data = response.read(MAX_PDF_BYTES + 1)
        if len(data) > MAX_PDF_BYTES:
            raise ValueError("Job response larger than permitted maximum")
        return data


def database(folder: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(folder / "agent-state.sqlite3", timeout=30)
    conn.execute("""CREATE TABLE IF NOT EXISTS jobs (
        job_id TEXT PRIMARY KEY, state TEXT NOT NULL,
        sha256 TEXT NOT NULL, pdf_path TEXT NOT NULL,
        updated_at TEXT NOT NULL, detail TEXT NOT NULL DEFAULT ''
    )""")
    conn.commit()
    return conn


def state(conn: sqlite3.Connection, job_id: str):
    return conn.execute("SELECT state, sha256, pdf_path FROM jobs WHERE job_id=?", (job_id,)).fetchone()


def record(conn: sqlite3.Connection, job_id: str, status: str, digest: str, pdf_path: Path, detail: str = ""):
    conn.execute(
        """INSERT INTO jobs(job_id, state, sha256, pdf_path, updated_at, detail)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(job_id) DO UPDATE SET state=excluded.state,
           sha256=excluded.sha256, pdf_path=excluded.pdf_path,
           updated_at=excluded.updated_at, detail=excluded.detail""",
        (job_id, status, digest, str(pdf_path), stamp(), detail[:1000]),
    )
    conn.commit()


def validate_job(job: dict) -> tuple[str, Path]:
    job_id = job["jobId"]
    oid = job["orderId"]
    index = job["itemIndex"]
    version = job["designVersionId"]
    uri = job["fileUrl"]
    if not isinstance(job_id, str) or not isinstance(oid, str) or not ORDER_ID.fullmatch(oid):
        raise ValueError("Invalid order ID")
    if type(index) is not int or index < 0 or index > 999:
        raise ValueError("Invalid item index")
    if not isinstance(version, str) or len(version) > 80 or not version:
        raise ValueError("Invalid design version")
    if job_id != f"{oid}:{index}:{version}":
        raise ValueError("Invalid job identity")
    if not isinstance(uri, str) or not uri.startswith("/api/print-agent/files/?"):
        raise ValueError("Invalid file endpoint")
    copies = job.get("quantity")
    if type(copies) is not int or not 1 <= copies <= 500:
        raise ValueError("Invalid number of copies")
    width, height = job.get("widthMm"), job.get("heightMm")
    if type(width) not in (float, int) or type(height) not in (float, int):
        raise ValueError("Missing dimensions")
    if not 0 < width <= 300 or not 0 < height <= 300:
        raise ValueError("Invalid dimensions")
    safe_key = hashlib.sha256(job_id.encode("utf-8")).hexdigest()[:16]
    return job_id, Path(f"{oid}_{index + 1}_{safe_key}.pdf")


def stage_one(job: dict, base: str, token: str, folder: Path, conn: sqlite3.Connection, mode: str, args):
    job_id, filename = validate_job(job)
    previous = state(conn, job_id)
    if previous and previous[0] in ("submitted", "submitting", "review_required"):
        return "skipped (already attempted; manual review needed if incomplete)"
    if previous and previous[0] == "staged" and mode == "stage":
        return "already staged"

    pdf_path = folder / filename
    data = request_bytes(base, token, job["fileUrl"])
    if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-4096:]:
        raise ValueError("Not a complete PDF production file")
    digest = hashlib.sha256(data).hexdigest()
    if previous and previous[1] != digest:
        record(conn, job_id, "review_required", digest, pdf_path, "Production file changed without design version change")
        return "manual review: PDF changed for existing job"

    if not pdf_path.is_file() or hashlib.sha256(pdf_path.read_bytes()).hexdigest() != digest:
        temp = pdf_path.with_suffix(".pdf.part")
        temp.write_bytes(data)
        os.replace(temp, pdf_path)

    ticket_path = pdf_path.with_suffix(".json")
    ticket = {
        "schemaVersion": FILENAME_VERSION, "jobId": job_id, "orderId": job["orderId"],
        "itemIndex": job["itemIndex"], "designVersionId": job["designVersionId"],
        "copies": job["quantity"], "widthMm": job["widthMm"], "heightMm": job["heightMm"],
        "mirror": job["mirror"], "profileId": job["profileId"],
        "sha256": digest, "receivedAtUtc": stamp(), "pdf": pdf_path.name,
    }
    temp_ticket = ticket_path.with_suffix(".json.part")
    temp_ticket.write_text(json.dumps(ticket, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(temp_ticket, ticket_path)
    record(conn, job_id, "staged", digest, pdf_path)
    if mode == "stage":
        return f"STAGED (NO PRINT): {pdf_path.name}"

    # The local adapter must already have been tested with Corel and the target machine.
    # 'submitting' is persisted BEFORE invocation to avoid blind reprints after crashes.
    variables = {
        "{file}": str(pdf_path), "{metadata}": str(ticket_path),
        "{copies}": str(job["quantity"]), "{width_mm}": str(job["widthMm"]),
        "{height_mm}": str(job["heightMm"]), "{mirror}": "1" if job["mirror"] else "0",
        "{job_id}": job_id,
    }
    command = []
    for arg in args:
        for marker, value in variables.items():
            arg = arg.replace(marker, value)
        command.append(arg)
    record(conn, job_id, "submitting", digest, pdf_path, "Adapter invocation started")
    try:
        result = subprocess.run(command, shell=False, timeout=120, capture_output=True, text=True)
        if result.returncode != 0:
            detail = f"Adapter exit {result.returncode}: {result.stderr[-400:]}"
            record(conn, job_id, "review_required", digest, pdf_path, detail)
            return "manual review: " + detail
        record(conn, job_id, "submitted", digest, pdf_path, "Adapter accepted job, physical print not verified")
        return f"SUBMITTED to adapter: {pdf_path.name}"
    except Exception as exc:
        record(conn, job_id, "review_required", digest, pdf_path, f"Adapter exception: {type(exc).__name__}")
        return "manual review: adapter failed or timed out"


def run_once(base: str, token: str, folder: Path, mode: str, args):
    payload = json.loads(request_bytes(base, token, "/api/print-agent/jobs/?limit=100"))
    jobs = payload.get("jobs")
    if not isinstance(jobs, list):
        raise ValueError("Invalid production queue response")
    with database(folder) as conn:
        for job in jobs:
            try:
                result = stage_one(job, base, token, folder, conn, mode, args)
                print(stamp(), job.get("orderId", "?"), result, flush=True)
            except Exception as exc:
                print(stamp(), job.get("orderId", "?"), "ERROR:", str(exc), file=sys.stderr, flush=True)


def main():
    parser = argparse.ArgumentParser(description="Stamp2Go printer bridge; local PC only")
    parser.add_argument("--once", action="store_true", help="Stage current jobs and exit")
    options = parser.parse_args()
    try:
        base, token, folder, mode, args, interval = config()
        print(f"Stamp2Go bridge: mode={mode}, folder={folder}, polling={interval}s", flush=True)
        while True:
            try:
                run_once(base, token, folder, mode, args)
            except (ValueError, HTTPError, URLError, TimeoutError, OSError) as exc:
                print(stamp(), "QUEUE ERROR:", str(exc), file=sys.stderr, flush=True)
            if options.once:
                return 0
            time.sleep(interval)
    except (ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"Startup error: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(main())
