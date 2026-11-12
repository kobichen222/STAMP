'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import { PRESETS, PRESET_LABEL, WEEKDAYS, type Breakdown, type Bucket, type Kpi, type Report } from '@/lib/reports';

/* ── formatting ─────────────────────────────────────────────────────────── */
const int = (n: number) => Math.round(n).toLocaleString('he-IL');
const nis = (n: number) => `₪${int(n)}`;
const pct = (n: number) => `${Math.round(n)}%`;
const compact = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${+(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K` : int(n));
const duration = (h: number | null) => (h === null ? '—' : h < 1 ? 'פחות משעה' : h < 36 ? `${Math.round(h)} שעות` : `${+(h / 24).toFixed(1)} ימים`);

type Metric = 'revenue' | 'orders' | 'stamps';
const METRICS: { id: Metric; label: string; fmt: (n: number) => string }[] = [
  { id: 'revenue', label: 'הכנסות', fmt: nis },
  { id: 'orders', label: 'הזמנות', fmt: int },
  { id: 'stamps', label: 'חותמות', fmt: int },
];

/* ── small building blocks ──────────────────────────────────────────────── */
function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; label: string }) {
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

function Card({ title, hint, action, children, className = '' }: { title: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string }) {
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
function Delta({ k, points = false, upIsGood = true }: { k: Kpi; points?: boolean; upIsGood?: boolean | null }) {
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

function Spark({ values }: { values: number[] }) {
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

function Tile({ label, value, k, sub, spark, points, upIsGood }: { label: string; value: string; k: Kpi; sub?: string; spark?: number[]; points?: boolean; upIsGood?: boolean | null }) {
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

function Trend({ series, metric, hasPrev }: { series: Bucket[]; metric: Metric; hasPrev: boolean }) {
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

function TrendTable({ series, hasPrev }: { series: Bucket[]; hasPrev: boolean }) {
  return (
    <div className="max-h-80 overflow-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface text-[13px] text-muted">
          <tr>
            <th className="px-3 py-2 text-start font-medium">תקופה</th>
            <th className="px-3 py-2 text-start font-medium">הכנסות</th>
            {hasPrev && <th className="px-3 py-2 text-start font-medium">קודמת</th>}
            <th className="px-3 py-2 text-start font-medium">הזמנות</th>
            <th className="px-3 py-2 text-start font-medium">חותמות</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {[...series].reverse().map((s) => (
            <tr key={s.key} className="border-t border-line">
              <td className="px-3 py-2">{s.long}</td>
              <td className="px-3 py-2 font-semibold">{nis(s.revenue)}</td>
              {hasPrev && <td className="px-3 py-2 text-muted">{nis(s.prevRevenue ?? 0)}</td>}
              <td className="px-3 py-2">{s.orders}</td>
              <td className="px-3 py-2">{s.stamps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── funnel ─────────────────────────────────────────────────────────────── */
function Funnel({ steps }: { steps: Report['funnel'] }) {
  const top = Math.max(1, steps[0].count);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const before = i ? steps[i - 1].count : 0;
        return (
          <li key={s.label} className="group">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <b>{s.label}</b> <span className="text-[13px] text-muted">· {s.hint}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                <b>{int(s.count)}</b>
                <span className="text-muted"> · {nis(s.value)}</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-blue-50">
                <div className="h-full rounded-full bg-blue transition-all duration-500 group-hover:bg-blue-600" style={{ width: `${(s.count / top) * 100}%` }} />
              </div>
              <span className="w-20 shrink-0 whitespace-nowrap text-end text-xs text-muted tabular-nums" title="מתוך השלב הקודם">{i === 0 ? '100%' : before ? `${pct((s.count / before) * 100)} מהקודם` : '—'}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── when orders come in: weekday × hour ────────────────────────────────── */
function Heat({ heat }: { heat: Report['heat'] }) {
  const [tip, setTip] = useState<{ d: number; h: number } | null>(null);
  const shade = (n: number) => (n === 0 ? 'var(--color-surface)' : `color-mix(in oklab, var(--color-blue) ${Math.round(18 + (n / heat.max) * 82)}%, white)`);
  if (!heat.max) return <p className="text-sm text-muted">אין הזמנות בתקופה.</p>;
  return (
    <div>
      <div dir="ltr" className="grid gap-[2px]" style={{ gridTemplateColumns: 'auto repeat(24, minmax(0, 1fr))' }} onPointerLeave={() => setTip(null)}>
        {WEEKDAYS.map((name, d) => (
          <div key={name} className="contents">
            <span className="pe-2 text-end text-[11px] leading-5 text-muted sm:text-xs sm:leading-7" dir="rtl">
              {name}
            </span>
            {heat.counts[d].map((n, h) => (
              <button
                key={h}
                type="button"
                aria-label={`יום ${name} ${h}:00 – ${n} הזמנות`}
                onPointerEnter={() => setTip({ d, h })}
                onFocus={() => setTip({ d, h })}
                onBlur={() => setTip(null)}
                className={`h-5 rounded-[3px] outline-none transition sm:h-7 ${tip?.d === d && tip.h === h ? 'ring-2 ring-ink/60' : ''}`}
                style={{ background: shade(n) }}
              />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="pt-1 text-center text-[10px] text-muted tabular-nums">
            {h % 3 === 0 ? h : ''}
          </span>
        ))}
      </div>
      <div className="mt-3 flex min-h-5 flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="text-ink">
          {tip ? (
            <>
              יום {WEEKDAYS[tip.d]}, {String(tip.h).padStart(2, '0')}:00–{String(tip.h + 1).padStart(2, '0')}:00 · <b>{heat.counts[tip.d][tip.h]} הזמנות</b>
            </>
          ) : (
            <span className="text-muted">עברו על המשבצות לפרטים</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          פחות
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <i key={t} className="h-3 w-4 rounded-[3px]" style={{ background: shade(t * heat.max) }} />
          ))}
          יותר ({heat.max})
        </span>
      </div>
    </div>
  );
}

/* ── ranked breakdowns with tabs ────────────────────────────────────────── */
function Ranked({ title, hint, groups }: { title: string; hint: string; groups: Breakdown[] }) {
  const [tab, setTab] = useState(groups[0].id);
  const [by, setBy] = useState<'revenue' | 'count'>('revenue');
  const [all, setAll] = useState(false);
  const g = groups.find((x) => x.id === tab) ?? groups[0];
  const key = g.hasRevenue ? by : 'count';
  const rows = [...g.rows].sort((a, b) => b[key] - a[key]);
  const total = rows.reduce((s, r) => s + r[key], 0) || 1;
  const max = Math.max(1, ...rows.map((r) => r[key]));
  const shown = all ? rows : rows.slice(0, 6);
  return (
    <Card
      title={title}
      hint={hint}
      action={
        g.hasRevenue && (
          <Seg
            label="מדד"
            value={by}
            onChange={setBy}
            options={[
              { id: 'revenue', label: '₪' },
              { id: 'count', label: 'כמות' },
            ]}
          />
        )
      }
    >
      <div className="mb-4">
        <Seg
          label={title}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setAll(false);
          }}
          options={groups.map((x) => ({ id: x.id, label: x.label }))}
        />
      </div>
      <ul className="space-y-3">
        {shown.map((r, i) => (
          <li key={r.label} className="group">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="w-4 shrink-0 text-xs text-muted tabular-nums">{i + 1}</span>
                <span className="truncate" title={r.label}>
                  {r.label}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                <b>{key === 'revenue' ? nis(r.revenue) : `${int(r.count)} ${g.unit}`}</b>
                <span className="text-xs text-muted"> · {pct((r[key] / total) * 100)}</span>
              </span>
            </div>
            <div className="ms-6 mt-1.5 h-2 overflow-hidden rounded-full bg-surface" title={g.hasRevenue ? `${nis(r.revenue)} · ${int(r.count)} ${g.unit}` : `${int(r.count)} ${g.unit}`}>
              <div className="h-full rounded-full bg-blue/85 transition-all duration-500 group-hover:bg-blue" style={{ width: `${(r[key] / max) * 100}%` }} />
            </div>
          </li>
        ))}
        {!rows.length && <li className="py-6 text-center text-sm text-muted">אין נתונים לתקופה.</li>}
      </ul>
      {rows.length > 6 && (
        <button onClick={() => setAll(!all)} className="mt-4 text-[13px] font-semibold text-blue hover:underline">
          {all ? 'הצג פחות' : `הצג את כל ה-${rows.length}`}
        </button>
      )}
    </Card>
  );
}

/* ── the page ───────────────────────────────────────────────────────────── */
export function ReportsDashboard({ report: r }: { report: Report }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [metric, setMetric] = useState<Metric>('revenue');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [from, setFrom] = useState(r.range.from);
  const [to, setTo] = useState(r.range.to);
  useEffect(() => {
    setFrom(r.range.from);
    setTo(r.range.to);
  }, [r.range.from, r.range.to]);
  const go = (qs: string) => start(() => router.push(`/admin/reports/?${qs}`, { scroll: false }));
  const hasPrev = r.series.some((s) => s.prevRevenue !== null);
  const by = (id: string) => r.breakdowns.find((b) => b.id === id)!;
  const k = r.kpis;
  const sparks = useMemo(() => ({ revenue: r.series.map((s) => s.revenue), orders: r.series.map((s) => s.orders), stamps: r.series.map((s) => s.stamps) }), [r.series]);

  const exportCsv = () => {
    const rows = [['תקופה', 'הכנסות', 'הזמנות', 'חותמות'], ...r.series.map((s) => [s.long, Math.round(s.revenue), s.orders, s.stamps])];
    const csv = '﻿' + rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `stamp2go-report-${r.range.from}_${r.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const custTotal = r.extra.newCustomers + r.extra.returningCustomers;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* filters – one row, scoping everything below */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">דוחות</h1>
          <p className="mt-0.5 text-sm text-muted">
            {r.range.label}
            {r.prev && <> · בהשוואה ל-{r.prev.label}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Seg label="תקופה" value={(r.range.preset === 'custom' ? '' : r.range.preset) as string} onChange={(p) => go(`range=${p}`)} options={PRESETS.map((p) => ({ id: p as string, label: PRESET_LABEL[p] }))} />
          <form
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${r.range.preset === 'custom' ? 'border-blue bg-blue-50' : 'border-line bg-white'}`}
            onSubmit={(e) => {
              e.preventDefault();
              if (from && to) go(`from=${from}&to=${to}`);
            }}
          >
            <input type="date" aria-label="מתאריך" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-[7.5rem] bg-transparent py-1 outline-none" />
            <span className="text-muted">–</span>
            <input type="date" aria-label="עד תאריך" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-[7.5rem] bg-transparent py-1 outline-none" />
            <button className="rounded-full bg-ink px-3 py-1 font-semibold text-white">הצג</button>
          </form>
          <button onClick={exportCsv} className="rounded-full border border-line bg-white px-3 py-2 text-[13px] font-semibold hover:border-ink">
            ייצוא CSV
          </button>
        </div>
      </div>

      <div className={`space-y-5 transition-opacity ${pending ? 'opacity-50' : ''}`} aria-busy={pending}>
        {/* headline numbers */}
        <div className="grid gap-3 lg:grid-cols-[1.25fr_2fr]">
          <div className="card relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -end-10 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-blue/15 to-violet/15 blur-2xl" />
            <div className="relative flex items-center justify-between gap-2">
              <p className="text-sm text-muted">הכנסות בתקופה</p>
              <Delta k={k.revenue} />
            </div>
            <p className="relative mt-2 text-5xl font-extrabold leading-none tracking-tight">{nis(k.revenue.value)}</p>
            {k.revenue.prev !== null && <p className="relative mt-2 text-[13px] text-muted">בתקופה הקודמת {nis(k.revenue.prev)}</p>}
            <dl className="relative mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-[13px]">
              {[
                ['שולם בפועל', nis(r.extra.paid)],
                ['ממתין לתשלום', nis(r.extra.unpaid)],
                ['מזה דמי משלוח', nis(r.extra.shippingIncome)],
              ].map(([l, v]) => (
                <div key={l} className="min-w-0">
                  <dt className="truncate text-muted">{l}</dt>
                  <dd className="mt-0.5 font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Tile label="הזמנות" value={int(k.orders.value)} k={k.orders} spark={sparks.orders} />
            <Tile label="ממוצע הזמנה" value={nis(k.aov.value)} k={k.aov} sub={`${(k.orders.value ? k.stamps.value / k.orders.value : 0).toFixed(1)} חותמות להזמנה`} />
            <Tile label="חותמות" value={int(k.stamps.value)} k={k.stamps} spark={sparks.stamps} />
            <Tile label="לקוחות" value={int(k.customers.value)} k={k.customers} sub={`${r.extra.newCustomers} חדשים · ${r.extra.returningCustomers} חוזרים`} />
            <Tile label="המרה בקופה" value={pct(k.conversion.value)} k={k.conversion} points sub={`${r.extra.abandonedCount} נטשו בתשלום`} />
            <Tile label="הנחות קופון" value={nis(k.discounts.value)} k={k.discounts} upIsGood={null} sub={`${r.extra.couponOrders} הזמנות עם קופון`} />
          </div>
        </div>

        {/* insights */}
        {r.insights.length > 0 && (
          <div className="flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-5">
            {r.insights.map((x) => (
              <div key={x.title} className="min-w-[15rem] flex-1 snap-start rounded-2xl sm:min-w-0 border border-blue/15 bg-gradient-to-br from-blue-50 to-white p-4">
                <p className="text-xs font-bold text-blue">{x.title}</p>
                <p className="mt-1 text-sm leading-snug">{x.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* trend */}
        <Card
          title="לאורך התקופה"
          hint={r.granularity === 'hour' ? 'לפי שעה' : r.granularity === 'day' ? 'לפי יום' : r.granularity === 'week' ? 'לפי שבוע' : 'לפי חודש'}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {view === 'chart' && <Seg label="מדד" value={metric} onChange={setMetric} options={METRICS} />}
              <Seg
                label="תצוגה"
                value={view}
                onChange={setView}
                options={[
                  { id: 'chart', label: 'גרף' },
                  { id: 'table', label: 'טבלה' },
                ]}
              />
            </div>
          }
        >
          {view === 'chart' ? (
            <>
              <Trend series={r.series} metric={metric} hasPrev={hasPrev} />
              {hasPrev && metric !== 'stamps' && (
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <i className="h-0.5 w-4 rounded bg-blue" />
                    התקופה ({r.range.label})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-0.5 w-4 rounded bg-[#8a94a6]" />
                    התקופה הקודמת ({r.prev?.label})
                  </span>
                </div>
              )}
            </>
          ) : (
            <TrendTable series={r.series} hasPrev={hasPrev} />
          )}
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="משפך ההזמנות" hint="מהקופה ועד המסירה, להזמנות שנפתחו בתקופה">
            <Funnel steps={r.funnel} />
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[13px]">
              <Link href="/admin/orders/?view=abandoned" className="rounded-xl bg-surface p-3 transition hover:bg-blue-50">
                <p className="text-muted">ננטשו בתשלום</p>
                <p className="mt-0.5 font-bold">
                  {r.extra.abandonedCount} · {nis(r.extra.abandonedValue)}
                </p>
              </Link>
              <div className="rounded-xl bg-surface p-3">
                <p className="text-muted">בוטלו / הוחזרו</p>
                <p className="mt-0.5 font-bold">
                  {r.extra.lostCount} · {nis(r.extra.lostValue)}
                </p>
              </div>
            </div>
          </Card>
          <Card title="מתי מזמינים" hint="מספר ההזמנות לפי יום בשבוע ושעה">
            <Heat heat={r.heat} />
          </Card>

          <Ranked title="מה נמכר" hint="מוצרים, מידות, דיו ותוספות" groups={[by('products'), by('sizes'), by('inks'), by('addons')]} />
          <Ranked title="איך קונים" hint="משלוח, תשלום, ערים וקופונים" groups={[by('shipping'), by('payment'), by('cities'), by('coupons')]} />

          <Card title="לקוחות מובילים" hint="לפי הכנסות בתקופה">
            {custTotal > 0 && (
              <div className="mb-4">
                <div className="flex h-2 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${r.extra.newCustomers} לקוחות חדשים, ${r.extra.returningCustomers} חוזרים`}>
                  {r.extra.newCustomers > 0 && <i className="bg-blue" style={{ width: `${(r.extra.newCustomers / custTotal) * 100}%` }} />}
                  {r.extra.returningCustomers > 0 && <i className="bg-violet" style={{ width: `${(r.extra.returningCustomers / custTotal) * 100}%` }} />}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-sm bg-blue" />
                    חדשים <b className="text-ink">{r.extra.newCustomers}</b>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="h-2 w-2 rounded-sm bg-violet" />
                    חוזרים <b className="text-ink">{r.extra.returningCustomers}</b> ({pct(k.returning.value)})
                  </span>
                </div>
              </div>
            )}
            <ul className="divide-y divide-line">
              {r.topCustomers.map((c, i) => (
                <li key={c.phone + i}>
                  <Link href={`/admin/orders/?q=${encodeURIComponent(c.phone)}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition hover:bg-surface">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-4 shrink-0 text-xs text-muted tabular-nums">{i + 1}</span>
                      <span className="truncate font-medium">{c.name}</span>
                      {!c.isNew && <span className="shrink-0 rounded-full bg-violet/10 px-1.5 py-0.5 text-[11px] font-semibold text-violet">חוזר</span>}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <b>{nis(c.revenue)}</b>
                      <span className="text-xs text-muted"> · {c.orders} הזמנות</span>
                    </span>
                  </Link>
                </li>
              ))}
              {!r.topCustomers.length && <li className="py-6 text-center text-sm text-muted">אין נתונים לתקופה.</li>}
            </ul>
          </Card>

          <Card title="קצב העבודה" hint="זמן חציוני מקבלת ההזמנה">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface p-3">
                <p className="text-[13px] text-muted">עד שמוכן</p>
                <p className="mt-0.5 text-xl font-extrabold">{duration(r.ops.toReadyHours)}</p>
              </div>
              <div className="rounded-xl bg-surface p-3">
                <p className="text-[13px] text-muted">עד מסירה ללקוח</p>
                <p className="mt-0.5 text-xl font-extrabold">{duration(r.ops.toDeliveredHours)}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">
              מבוסס על {r.ops.sample} הזמנות שהושלמו בתקופה{r.extra.urgent ? ` · ${r.extra.urgent} דחופות` : ''}
            </p>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <h3 className="text-sm font-bold">פתוחות כרגע</h3>
              <Link href="/admin/production/" className="text-[13px] font-semibold text-blue hover:underline">
                {r.ops.openTotal} בתור ←
              </Link>
            </div>
            <ul className="mt-3 space-y-2.5">
              {r.ops.open.map((s) => (
                <li key={s.label} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
                  <span className="truncate">{s.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-surface">
                    <span className="block h-full rounded-full bg-blue/85" style={{ width: `${(s.count / Math.max(1, r.ops.open[0].count)) * 100}%` }} />
                  </span>
                  <b className="tabular-nums">{s.count}</b>
                </li>
              ))}
              {!r.ops.open.length && <li className="text-sm text-muted">אין הזמנות פתוחות.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
