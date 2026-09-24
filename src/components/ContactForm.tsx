'use client';

import { useState } from 'react';
import { Icon } from './ui/Icon';

export function ContactForm({ compact }: { compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, page: window.location.pathname }),
    }).catch(() => null);
    if (res?.ok) return setState('sent');
    setError((await res?.json().catch(() => null))?.error || 'השליחה נכשלה, נסו שוב');
    setState('error');
  }

  if (state === 'sent') {
    return (
      <div className="flex animate-pop items-center gap-3 rounded-xl bg-ok/10 p-5 text-ok">
        <Icon name="check" size={24} />
        <p className="font-medium">תודה! קיבלנו את הפנייה ונחזור אליכם בהקדם.</p>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className={`grid gap-4 ${compact ? '' : 'sm:grid-cols-2'}`}>
        <label>
          <span className="label">שם *</span>
          <input name="name" required placeholder="שם פרטי ומשפחה" autoComplete="name" className="input" />
        </label>
        <label>
          <span className="label">טלפון *</span>
          <input name="phone" type="tel" required placeholder="050-0000000" autoComplete="tel" dir="ltr" className="input text-right" />
        </label>
      </div>
      <label>
        <span className="label">אימייל</span>
        <input name="email" type="email" autoComplete="email" dir="ltr" className="input text-right" />
      </label>
      <label>
        <span className="label">הודעה</span>
        <textarea name="message" rows={4} className="input" />
      </label>
      <input name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden />
      <button className="btn-primary justify-self-start" disabled={state === 'sending'}>
        {state === 'sending' ? 'שולח…' : 'שליחה'}
      </button>
      {state === 'error' && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
