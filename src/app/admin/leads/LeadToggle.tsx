'use client';

import { useTransition } from 'react';
import { markLead } from '../settings-actions';

export function LeadToggle({ id, handled }: { id: number; handled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => markLead(id, !handled))}
      className={`btn-sm shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${handled ? 'border-ok/30 bg-ok/10 text-ok' : 'border-line bg-white text-ink hover:border-blue hover:text-blue'}`}
    >
      {pending ? '…' : handled ? '✓ טופל' : 'סימון כטופל'}
    </button>
  );
}
