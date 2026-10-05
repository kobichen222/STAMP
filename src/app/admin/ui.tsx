'use client';

import { useEffect, useState, useTransition } from 'react';

type SaveResult = { ok: true } | { ok: false; error: string };

/** Sticky save bar: shows unsaved changes, saving state and errors. */
export function SaveBar({ dirty, onSave, onReset }: { dirty: boolean; onSave: () => Promise<SaveResult>; onReset?: () => void }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!dirty || pending}
          className="btn-primary"
          onClick={() =>
            start(async () => {
              const r = await onSave();
              setMsg(r.ok ? { ok: true, text: 'נשמר – האתר מתעדכן מיד' } : { ok: false, text: r.error });
            })
          }
        >
          {pending ? 'שומר…' : 'שמירה'}
        </button>
        {onReset && dirty && (
          <button type="button" className="btn-ghost btn-sm" onClick={onReset} disabled={pending}>
            ביטול שינויים
          </button>
        )}
        {dirty && !pending && <span className="text-sm text-warn">יש שינויים שלא נשמרו</span>}
        {msg && !dirty && <span className={`text-sm ${msg.ok ? 'text-ok' : 'text-bad'}`}>{msg.text}</span>}
        {msg && !msg.ok && dirty && <span className="text-sm text-bad">{msg.text}</span>}
      </div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  step = 1,
  hint,
  allowEmpty = false,
}: {
  label: string;
  value: number | undefined | null;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  min?: number;
  step?: number;
  hint?: string;
  allowEmpty?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? (allowEmpty ? undefined : 0) : Number(e.target.value))}
          className="input !w-28 tabular-nums"
          dir="ltr"
        />
        {suffix && <span className="text-sm text-muted">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-ok' : 'bg-line'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'right-0.5' : 'right-[22px]'}`} />
    </button>
  );
}

export function Panel({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Deep-compare helper for "unsaved changes". */
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
