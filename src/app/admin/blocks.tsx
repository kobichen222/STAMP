import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The admin's shared page furniture – one look for every screen: a title with a line of context,
 * a strip of headline numbers, and pill tabs. (Server components; the charts live in charts.tsx.)
 */

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export interface Stat {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'bad' | 'warn' | 'ok' | 'blue';
  href?: string;
  on?: boolean;
}
const TONE = { bad: 'text-bad', warn: 'text-warn', ok: 'text-ok', blue: 'text-blue' };
const COLS: Record<number, string> = { 2: 'lg:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-3 lg:grid-cols-5', 6: 'sm:grid-cols-3 lg:grid-cols-6' };

/** Headline numbers at the top of a screen; a stat with an href is a shortcut to that slice. */
export function Stats({ items }: { items: Stat[] }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${COLS[items.length] ?? 'sm:grid-cols-4'}`}>
      {items.map((s) => {
        const body = (
          <>
            <p className="truncate text-[13px] text-muted">{s.label}</p>
            <p className={`mt-1.5 text-2xl font-extrabold leading-none ${s.tone ? TONE[s.tone] : ''}`}>{s.value}</p>
            {s.sub && <p className="mt-1.5 truncate text-xs text-muted">{s.sub}</p>}
          </>
        );
        const cls = `card block min-w-0 p-4 ${s.on ? '!border-blue bg-blue-50' : ''}`;
        return s.href ? (
          <Link key={s.label} href={s.href} className={`${cls} transition hover:border-blue/40 hover:shadow-soft`}>
            {body}
          </Link>
        ) : (
          <div key={s.label} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export interface Tab {
  href: string;
  label: string;
  count?: number;
  on?: boolean;
  tone?: string;
}

/** Pill tabs that are links (the same look as the reports' segmented controls). */
export function Tabs({ items, label }: { items: Tab[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-3 overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div className="inline-flex gap-0.5 rounded-full bg-white p-1 shadow-soft ring-1 ring-line">
        {items.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.on ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition ${t.on ? 'bg-ink font-semibold text-white' : 'text-muted hover:bg-surface hover:text-ink'} ${!t.on && t.count === 0 ? 'opacity-50' : ''}`}
          >
            <span className={!t.on ? t.tone : ''}>{t.label}</span>
            {t.count !== undefined && <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${t.on ? 'bg-white/20' : 'bg-surface'}`}>{t.count}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** A section title inside a screen (column heads, day groups). */
export function SectionTitle({ children, count, side }: { children: ReactNode; count?: number; side?: ReactNode }) {
  return (
    <h2 className="mb-2 flex items-center justify-between gap-3 px-1">
      <span className="flex items-center gap-2 text-sm font-bold">
        {children}
        {count !== undefined && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line tabular-nums">{count}</span>}
      </span>
      {side && <span className="text-xs text-muted tabular-nums">{side}</span>}
    </h2>
  );
}
