'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { compact, duration, int, nis, pct } from '@/lib/numbers';
import type { Bucket, Kpi } from '@/lib/reports';

/** Shared pieces of the admin dashboards (reports, control panel): tiles, deltas, the trend chart. */

export { compact, duration, int, nis, pct };

export type Metric = 'revenue' | 'orders' | 'stamps';
export const METRICS: { id: Metric; label: string; fmt: (n: number) => string }[] = [
  { id: 'revenue', label: 'הכנסות', fmt: nis },
  { id: 'orders', label: 'הזמנות', fmt: int },
  { id: 'stamps', label: 'חותמות', fmt: int },
];

/* ── small building blocks ──────────────────────────────────────────────── */
export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition ${o.id === value ? 'bg-white font-semibold text-ink shadow-soft' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card({ title, hint, action, children, className = '' }: { title: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card min-w-0 p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="font-bold">{title}</h2>
          {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Change against the previous period: an arrow and a number, coloured by whether up is good. */
export function Delta({ k, points = false, upIsGood = true }: { k: Kpi; points?: boolean; upIsGood?: boolean | null }) {
  if (k.prev === null) return null;
  const diff = k.value - k.prev;
  const flat = Math.abs(diff) < 0.5 && (points || k.prev !== 0 || k.value === 0);
  const text = flat ? 'ללא שינוי' : points ? `${Math.abs(Math.round(diff))} נק׳` : k.prev === 0 ? 'חדש' : `${Math.abs(Math.round((diff / k.prev) * 100))}%`;
  const good = upIsGood === null || flat ? null : diff > 0 === upIsGood;
  const tone = good === null ? 'bg-surface text-muted' : good ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`} title={`בתקופה הקודמת: ${points ? pct(k.prev) : int(k.prev)}`}>
      {!flat && <span aria-hidden>{diff > 0 ? '▲' : '▼'}</span>}
      <span className="sr-only">{flat ? '' : diff > 0 ? 'עלייה של' : 'ירידה של'}</span>
      {text}
    </span>
  );
}

export function Spark({ values }: { values: number[] }) {
  if (values.length < 2 || !values.some(Boolean)) return null;
  const w = 96;
  const h = 30;
  const max = Math.max(...values);
  const pts = values.map((v, i) => [2 + (i / (values.length - 1)) * (w - 6), h - 3 - (v / max) * (h - 8)] as const);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--color-blue)" strokeOpacity={0.45} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} fill="var(--color-blue)" stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}

export function Tile({ label, value, k, sub, spark, points, upIsGood }: { label: string; value: string; k: Kpi; sub?: string; spark?: number[]; points?: boolean; upIsGood?: boolean | null }) {
  return (
    <div className="card flex min-w-0 flex-col justify-between gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] text-muted">{label}</p>
        <Delta k={k} points={points} upIsGood={upIsGood} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-extrabold leading-none">{value}</p>
        {spark && <Spark values={spark} />}
      </div>
      {sub && <p className="truncate text-xs text-muted">{sub}</p>}
    </div>
  );
}

/* ── the main chart: this period over the previous one ──────────────────── */
function niceScale(max: number) {
  if (max <= 0) return { top: 4, step: 1 };
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const whole = Math.max(1, step);
  return { top: whole * 4, step: whole };
}

export function Trend({ series, metric, hasPrev }: { series: Bucket[]; metric: Metric; hasPrev: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const fmt = METRICS.find((m) => m.id === metric)!.fmt;
  const cur = series.map((s) => s[metric]);
  const old = hasPrev && metric !== 'stamps' ? series.map((s) => (metric === 'revenue' ? s.prevRevenue : s.prevOrders) ?? 0) : null;
  const H = w < 480 ? 220 : 280;
  const pad = { l: 46, r: 14, t: 14, b: 28 };
  const pw = Math.max(10, w - pad.l - pad.r);
  const ph = H - pad.t - pad.b;
  const { top, step } = niceScale(Math.max(...cur, ...(old ?? [0])));
  const n = series.length;
  const x = (i: number) => pad.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
  const y = (v: number) => pad.t + ph - (v / top) * ph;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const every = Math.max(1, Math.ceil(n / (w < 480 ? 4 : w < 800 ? 7 : 10)));
  const pick = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setHover(Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left - pad.l) / pw) * (n - 1)))));
  };
  const h = hover !== null ? series[hover] : null;
  const tipLeft = hover !== null ? x(hover) : 0;

  return (
    <div ref={box} className="relative select-none" dir="ltr">
      <svg
        width={w}
        height={H}
        role="img"
        aria-label="גרף לאורך התקופה. חיצים ימינה ושמאלה עוברים בין הנקודות."
        tabIndex={0}
        className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-blue/40"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          setHover((i) => Math.max(0, Math.min(n - 1, (i ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1))));
        }}
      >
        <defs>
          <linearGradient id="trend-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-blue)" stopOpacity={0.16} />
            <stop offset="1" stopColor="var(--color-blue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t * step)} y2={y(t * step)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t * step) + 4} textAnchor="end" className="fill-muted text-[11px] tabular-nums">
              {metric === 'revenue' ? `₪${compact(t * step)}` : compact(t * step)}
            </text>
          </g>
        ))}
        {series.map((s, i) =>
          i % every === 0 || i === n - 1 ? (
            i === n - 1 && (n - 1) % every !== 0 && (n - 1) % every < every / 2 ? null : (
              <text key={s.key} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="fill-muted text-[11px] tabular-nums">
                {s.label}
              </text>
            )
          ) : null,
        )}
        {old && <path d={path(old)} fill="none" stroke="#8a94a6" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />}
        <path d={`${path(cur)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill="url(#trend-wash)" />
        <path d={path(cur)} fill="none" stroke="var(--color-blue)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover === null && <circle cx={x(n - 1)} cy={y(cur[n - 1])} r={4} fill="var(--color-blue)" stroke="#fff" strokeWidth={2} />}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ph} stroke="var(--color-ink)" strokeOpacity={0.25} strokeWidth={1} />
            {old && <circle cx={x(hover)} cy={y(old[hover])} r={4} fill="#8a94a6" stroke="#fff" strokeWidth={2} />}
            <circle cx={x(hover)} cy={y(cur[hover])} r={5} fill="var(--color-blue)" stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div
          dir="rtl"
          className="pointer-events-none absolute top-2 z-10 w-44 rounded-xl border border-line bg-white p-3 text-[13px] shadow-lift"
          style={{ left: Math.max(0, Math.min(w - 176, tipLeft > w / 2 ? tipLeft - 188 : tipLeft + 12)) }}
        >
          <p className="mb-1.5 font-semibold">{h.long}</p>
          <p className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-muted">
              <i className="h-0.5 w-3 rounded bg-blue" />
              התקופה
            </span>
            <b className="tabular-nums">{fmt(cur[hover])}</b>
          </p>
          {old && (
            <p className="mt-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-muted">
                <i className="h-0.5 w-3 rounded bg-[#8a94a6]" />
                קודמת
              </span>
              <b className="tabular-nums">{fmt(old[hover])}</b>
            </p>
          )}
          {metric === 'revenue' && <p className="mt-1.5 border-t border-line pt-1.5 text-xs text-muted">{h.orders} הזמנות · {h.stamps} חותמות</p>}
        </div>
      )}
    </div>
  );
}
