'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Issue } from '../validate';
import { isProductionReady } from '../validate';

export function PreflightBadge({ issues, onFix, onSelect }: { issues: Issue[]; onFix: () => void; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ready = isProductionReady(issues);
  const list = issues.filter((i) => i.severity !== 'info');
  const errors = list.filter((i) => i.severity === 'error').length;
  const fixable = list.some((i) => i.fix && i.fix !== 'vectorize');
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium shadow-soft backdrop-blur transition ${
          ready ? 'border-ok/30 bg-white/90 text-ok' : 'border-bad/30 bg-white/90 text-bad'
        }`}
      >
        <Icon name={ready ? 'check' : 'alert'} size={17} />
        {ready ? 'מוכן לייצור' : `נדרשים תיקונים (${errors})`}
        {ready && list.length > 0 && <span className="rounded-full bg-warn/15 px-1.5 text-xs text-warn">{list.length}</span>}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-2 w-80 animate-pop rounded-2xl border border-line bg-white p-3 shadow-lift">
          <p className="px-1 text-sm font-semibold">{list.length ? `נמצאו ${list.length} הערות` : 'הקובץ תקין ✓'}</p>
          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {list.map((i, n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => i.elementId && i.elementId !== 'border' && onSelect(i.elementId)}
                  className="flex w-full items-start gap-2 rounded-lg p-2 text-right text-sm hover:bg-surface"
                >
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i.severity === 'error' ? 'bg-bad' : 'bg-warn'}`} />
                  {i.message}
                </button>
              </li>
            ))}
          </ul>
          {fixable && (
            <button
              type="button"
              className="btn-primary btn-sm mt-2 w-full"
              onClick={() => {
                onFix();
                setOpen(false);
              }}
            >
              <Icon name="wand" size={16} /> תקן עבורי
            </button>
          )}
          <p className="mt-2 px-1 text-[11px] text-muted">{issues.find((i) => i.severity === 'info')?.message}</p>
        </div>
      )}
    </div>
  );
}
