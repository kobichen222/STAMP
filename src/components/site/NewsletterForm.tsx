'use client';

import { useState } from 'react';

/** Footer newsletter sign-up – a welcome e-mail goes out right away. */
export function NewsletterForm() {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'already'>('idle');
  const [error, setError] = useState('');
  if (state === 'done' || state === 'already')
    return (
      <p className="mt-5 rounded-xl bg-ok/10 px-3 py-2.5 text-sm font-semibold text-ok" role="status">
        {state === 'done' ? '✓ נרשמתם! שלחנו לכם מייל ברוכים הבאים.' : '✓ אתם כבר רשומים לעדכונים.'}
      </p>
    );
  return (
    <form
      className="mt-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setState('busy');
        setError('');
        const r = await fetch('/api/newsletter/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: fd.get('email'), website: fd.get('website'), page: location.pathname }),
        }).catch(() => null);
        const j = (await r?.json().catch(() => null)) as { ok?: boolean; already?: boolean; error?: string } | null;
        if (r?.ok && j?.ok) setState(j.already ? 'already' : 'done');
        else {
          setState('idle');
          setError(j?.error || 'ההרשמה נכשלה, נסו שוב');
        }
      }}
    >
      <label htmlFor="nl-email" className="text-sm font-semibold">
        מבצעים ועדכונים למייל
      </label>
      <div className="mt-2 flex gap-1.5">
        <input id="nl-email" name="email" type="email" required dir="ltr" placeholder="name@example.com" className="input !h-10 min-w-0 flex-1 !text-sm" autoComplete="email" />
        <input name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />
        <button className="btn-primary !h-10 shrink-0 !px-4 text-sm" disabled={state === 'busy'}>
          {state === 'busy' ? '…' : 'הרשמה'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-bad">{error}</p>}
    </form>
  );
}
