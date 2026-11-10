'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { printSize, withCutLine } from '@/lib/cut-line';
import { logPrint, markInProduction, printQueue, type PrintJob } from '../actions';

const ON_KEY = 's2g-autoprint-since';
const DONE_KEY = 's2g-autoprint-done';
const PRINTER = 'Trotec Engraver v9.3.2 (תחנה אוטומטית)';
const POLL_MS = 20_000;
const CUT_KEY = 's2g-cutline';
const cutOn = () => {
  try {
    return localStorage.getItem(CUT_KEY) !== '0';
  } catch {
    return true;
  }
};

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const fmt = (iso: string) => new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });

function readDone(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Keeps polling the production queue and prints each new paid order on the
 * default printer (the Trotec). With Edge/Chrome started with --kiosk-printing
 * the job goes straight to the laser with no dialog.
 */
export function AutoPrint() {
  const [since, setSince] = useState<string | null>(null);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [plate, setPlate] = useState<{ svg: string; w: number; h: number } | null>(null);
  const [checked, setChecked] = useState<string>('');
  const running = useRef(false);

  useEffect(() => {
    try {
      setSince(localStorage.getItem(ON_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const note = (t: string) => setLog((l) => [`${fmt(new Date().toISOString())} · ${t}`, ...l].slice(0, 40));

  /** Print every copy of every item of one order, then log it and move it to "in production". */
  const printJob = useCallback(async (job: PrintJob) => {
    for (const it of job.items) {
      for (let c = 0; c < Math.max(1, it.quantity); c++) {
        const cut = cutOn();
        const size = printSize(it.w, it.h, cut);
        setPlate({ svg: cut ? withCutLine(it.svg, it.shape, it.w, it.h) : it.svg, w: size.w, h: size.h });
        await nextFrame();
        window.print(); // kiosk-printing: straight to the default printer
        await new Promise((r) => setTimeout(r, 400));
      }
      await logPrint(job.orderId, { index: it.index, printer: PRINTER, mirror: it.mirror, size: `${it.w}×${it.h} מ"מ`, device: 'תחנת הדפסה אוטומטית' }).catch(() => {});
    }
    await markInProduction(job.orderId).catch(() => {});
    setPlate(null);
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify([job.orderId, ...readDone()].slice(0, 300)));
    } catch {
      /* ignore */
    }
  }, []);

  const tick = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const list = await printQueue();
      setJobs(list);
      setChecked(new Date().toISOString());
      const on = localStorage.getItem(ON_KEY);
      if (!on) return;
      const done = readDone();
      // Only orders that became ready after the station was switched on; older ones wait for a manual click.
      const fresh = list.filter((j) => j.readyAt >= on && !done.includes(j.orderId));
      for (const job of fresh) {
        setBusy(true);
        note(`מדפיס ${job.orderId} · ${job.customer}`);
        await printJob(job);
        note(`✓ ${job.orderId} נשלח למכונה ועבר ל״בייצור״`);
      }
      if (fresh.length) setJobs(await printQueue());
    } catch {
      note('אין חיבור לשרת – ננסה שוב בעוד רגע');
    } finally {
      setBusy(false);
      running.current = false;
    }
  }, [printJob]);

  useEffect(() => {
    tick();
    const t = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(t);
  }, [tick]);

  // Keep the screen (and the station) awake while switched on.
  useEffect(() => {
    if (!since || !('wakeLock' in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock
      .request('screen')
      .then((l) => (lock = l))
      .catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [since]);

  const toggle = () => {
    try {
      if (since) {
        localStorage.removeItem(ON_KEY);
        setSince(null);
        note('הדפסה אוטומטית כובתה');
      } else {
        const now = new Date().toISOString();
        localStorage.setItem(ON_KEY, now);
        setSince(now);
        note('הדפסה אוטומטית הופעלה – הזמנות חדשות יודפסו לבד');
      }
    } catch {
      /* ignore */
    }
  };

  const done = readDone();
  const waiting = jobs.filter((j) => !done.includes(j.orderId) && (!since || j.readyAt < since));

  return (
    <>
      <style>{`
        #print-root { display: none }
        @media print {
          ${plate ? `@page { size: ${plate.w}mm ${plate.h}mm; margin: 0 }` : ''}
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; height: auto !important; overflow: visible !important }
          body > *:not(#print-root) { display: none !important }
          #print-root { display: block !important; margin: 0; padding: 0; overflow: hidden; ${plate ? `width: ${plate.w}mm; height: ${plate.h}mm;` : ''} }
          #print-root svg { display: block; ${plate ? `width: ${plate.w}mm; height: ${plate.h}mm;` : ''} }
        }
      `}</style>
      {plate && createPortal(<div id="print-root" dangerouslySetInnerHTML={{ __html: plate.svg }} />, document.body)}

      <section className={`card p-4 sm:p-5 ${since ? 'ring-2 ring-ok/40' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`h-3.5 w-3.5 rounded-full ${since ? 'animate-pulse bg-ok' : 'bg-line'}`} />
            <div>
              <p className="font-bold">{since ? (busy ? 'מדפיס…' : 'פעיל – ממתין להזמנות') : 'כבוי'}</p>
              <p className="text-xs text-muted">{checked ? `בדיקה אחרונה ${fmt(checked)} · כל ${POLL_MS / 1000} שניות` : 'בודק…'}</p>
            </div>
          </div>
          <button type="button" onClick={toggle} className={since ? 'btn-outline' : 'btn-primary'}>
            {since ? 'כיבוי' : 'הפעלת הדפסה אוטומטית'}
          </button>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="font-bold">ממתינות לייצור ({jobs.length})</h2>
        <p className="mt-0.5 text-xs text-muted">הזמנות שהיו מוכנות לפני ההפעלה לא מודפסות לבד – לוחצים ״הדפסה״ ליד כל אחת.</p>
        <ul className="mt-3 divide-y divide-line text-sm">
          {waiting.map((j) => (
            <li key={j.orderId} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="font-semibold" dir="ltr">
                  {j.orderId}
                </span>{' '}
                {j.urgent && <span className="rounded-full bg-bad px-1.5 text-[10px] font-bold text-white">דחוף</span>}
                <span className="block truncate text-xs text-muted">
                  {j.customer} · {j.items.map((i) => `${i.name} ${i.w}×${i.h}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')}
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                className="btn-primary btn-sm"
                onClick={async () => {
                  setBusy(true);
                  note(`מדפיס ${j.orderId}`);
                  await printJob(j);
                  note(`✓ ${j.orderId} נשלח למכונה`);
                  setJobs(await printQueue().catch(() => jobs));
                  setBusy(false);
                }}
              >
                הדפסה
              </button>
            </li>
          ))}
          {!waiting.length && <li className="py-4 text-center text-muted">אין הזמנות שממתינות.</li>}
        </ul>
      </section>

      {log.length > 0 && (
        <section className="card p-4 sm:p-5">
          <h2 className="font-bold">פעילות התחנה</h2>
          <ul className="mt-2 space-y-1 text-xs text-ink-2">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
