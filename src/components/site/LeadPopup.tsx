'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/Icon';

/**
 * "Leave your details" – a button that opens a short call-back form.
 * A bottom sheet on phones, a centred card from tablets up. The lead goes through the same
 * /api/contact route as the contact page, so it lands in the studio inbox and in admin → פניות.
 */
export function LeadButton({ className, children, source = 'popup' }: { className?: string; children: ReactNode; source?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {children}
      </button>
      {open && <LeadDialog source={source} onClose={() => setOpen(false)} />}
    </>
  );
}

function LeadDialog({ onClose, source }: { onClose: () => void; source: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [shown, setShown] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const title = useId();

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => setShown(true));
    const focus = setTimeout(() => first.current?.focus({ preventScroll: true }), 250);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panel.current) return;
      // Keep the focus inside the dialog.
      const items = [...panel.current.querySelectorAll<HTMLElement>('button, a[href], input:not(.hp), textarea')].filter((el) => !el.hasAttribute('disabled'));
      if (!items.length) return;
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) (e.preventDefault(), z.focus());
      else if (!e.shiftKey && document.activeElement === z) (e.preventDefault(), a.focus());
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(focus);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch('/api/contact/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, page: `${window.location.pathname} (${source})` }),
    }).catch(() => null);
    if (res?.ok) return setState('sent');
    setError((await res?.json().catch(() => null))?.error || 'השליחה נכשלה, נסו שוב');
    setState('error');
  }

  return createPortal(
    <div className="fixed inset-0 z-[2147483600] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby={title}>
      <div className={`absolute inset-0 bg-ink/55 backdrop-blur-sm transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden />
      <div
        ref={panel}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-lift transition duration-300 ease-out sm:max-w-[27rem] sm:rounded-[1.75rem] ${shown ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-full opacity-0 sm:translate-y-4 sm:scale-95'}`}
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-blue to-violet px-5 pb-6 pt-3 text-white sm:px-7 sm:pt-6">
          <span className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-white/40 sm:hidden" aria-hidden />
          <span className="pointer-events-none absolute -end-10 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
          <span className="pointer-events-none absolute -bottom-16 start-6 h-32 w-32 rounded-full bg-white/10" aria-hidden />
          <button type="button" onClick={onClose} aria-label="סגירה" className="absolute end-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 sm:end-4 sm:top-4">
            <Icon name="close" size={18} />
          </button>
          <p className="relative text-[13px] font-semibold text-white/80">חוזרים אליכם מהר</p>
          <h2 id={title} className="relative mt-1 text-2xl font-extrabold leading-tight sm:text-[1.7rem]">
            השאירו פרטים
            <br />
            ונחזור אליכם
          </h2>
        </div>

        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7">
          {state === 'sent' ? (
            <div className="py-4 text-center">
              <span className="mx-auto grid h-16 w-16 animate-pop place-items-center rounded-full bg-ok/10 text-ok">
                <Icon name="check" size={34} />
              </span>
              <p className="mt-4 text-xl font-extrabold">תודה, קיבלנו!</p>
              <p className="mt-1 text-[15px] text-muted">נחזור אליכם בהקדם – בדרך כלל תוך שעה בשעות הפעילות.</p>
              <button type="button" onClick={onClose} className="btn-primary mt-6 w-full justify-center">
                סגירה
              </button>
            </div>
          ) : (
            <form className="grid gap-3.5" onSubmit={onSubmit}>
              <label>
                <span className="label">שם *</span>
                <input ref={first} name="name" required placeholder="שם פרטי ומשפחה" autoComplete="name" className="input" />
              </label>
              <label>
                <span className="label">טלפון *</span>
                <input name="phone" type="tel" inputMode="tel" required pattern="[\d\s+()\-]{7,}" title="מספר טלפון תקין" placeholder="050-0000000" autoComplete="tel" dir="ltr" className="input text-right" />
              </label>
              <label>
                <span className="label">
                  מה תרצו להזמין? <span className="font-normal text-muted">(לא חובה)</span>
                </span>
                <textarea name="message" rows={2} placeholder="למשל: חותמת לעסק עם לוגו, 3 יחידות" className="input resize-none" />
              </label>
              <input name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden />
              <button className="btn-primary mt-1 !h-13 w-full justify-center !text-base font-bold" disabled={state === 'sending'}>
                {state === 'sending' ? 'שולח…' : 'שלחו ונחזור אליכם'}
              </button>
              {state === 'error' && (
                <p role="alert" className="text-center text-sm text-bad">
                  {error}
                </p>
              )}
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                <Icon name="shield" size={14} />
                הפרטים משמשים רק כדי לחזור אליכם
              </p>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
