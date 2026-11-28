'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PaymentFrame } from '@/components/PaymentFrame';
import { Icon } from '@/components/ui/Icon';
import { SITE } from '@/lib/config';

export function PrintButton() {
  return (
    <button type="button" className="btn-outline" onClick={() => window.print()}>
      <Icon name="download" size={17} /> הורדת אישור
    </button>
  );
}

export function ApprovalBox({ id, token }: { id: string; token: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [mode, setMode] = useState<'idle' | 'change' | 'busy'>('idle');
  const send = async (action: 'approve' | 'change') => {
    setMode('busy');
    await fetch(`/api/orders/${id}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action, note }) });
    router.refresh();
    setMode('idle');
  };
  return (
    <div className="mt-6 rounded-xl border border-blue/30 bg-blue-50 p-4">
      <p className="font-semibold">ההגהה מחכה לאישורך</p>
      <p className="mt-1 text-sm text-muted">בדקו את הטקסט בתמונה למטה. אחרי האישור החותמת עוברת לייצור.</p>
      {mode === 'change' ? (
        <div className="mt-3 space-y-2">
          <textarea className="input text-sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="מה לתקן?" />
          <button type="button" className="btn-dark btn-sm" onClick={() => send('change')} disabled={!note.trim()}>
            שליחת בקשת תיקון
          </button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-primary btn-sm" onClick={() => send('approve')} disabled={mode === 'busy'}>
            מאשר לייצור
          </button>
          <button type="button" className="btn-outline btn-sm" onClick={() => setMode('change')}>
            מבקש תיקון
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Right after the payment page: the bank's confirmation can arrive a few seconds after the customer.
 * After 12 quick refreshes the page says it is slow (and not to pay again), and keeps checking every
 * 10 seconds for 5 more minutes.
 */
export function PaymentWatcher() {
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (++n > 12) {
        clearInterval(t);
        setSlow(true);
        return;
      }
      router.refresh();
    }, 2500);
    return () => clearInterval(t);
  }, [router]);
  useEffect(() => {
    if (!slow) return;
    let n = 0;
    const t = setInterval(() => {
      router.refresh();
      if (++n >= 30) clearInterval(t);
    }, 10_000);
    return () => clearInterval(t);
  }, [slow, router]);
  if (slow)
    return (
      <>
        <h1 className="mt-4 text-3xl font-extrabold">האימות לוקח יותר מהרגיל</h1>
        <p className="mt-2 text-muted">אל תשלמו שוב. אם הכרטיס חויב, ההזמנה תתעדכן כאן לבד. לבירור: {SITE.phone}</p>
      </>
    );
  return (
    <>
      <h1 className="mt-4 text-3xl font-extrabold">מאמתים את התשלום…</h1>
      <p className="mt-2 text-muted">זה לוקח כמה שניות. הדף יתעדכן לבד.</p>
    </>
  );
}

/**
 * The "we sent you a confirmation" line of a new order, only for what was really sent. A card order's
 * notifications are saved a moment after it turns paid, so while nothing is recorded the page keeps
 * refreshing for 30 seconds before it says that nothing was sent. `hold` = the payment is still being verified.
 */
export function OrderConfirmation({
  sent,
  email,
  final,
  hold,
  link,
  selfWa,
}: {
  sent: 'email' | 'whatsapp' | null;
  email?: string;
  /** Nothing more will be recorded (the manual-payment order saves its notifications before the page opens). */
  final: boolean;
  hold: boolean;
  link: string;
  /** wa.me link to the customer's own mobile, with the order link. */
  selfWa?: string;
}) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const waiting = !sent && !final && !timedOut;
  // The 30 seconds run from the moment the payment is known on this page (page open, or the end of verifying).
  useEffect(() => {
    if (hold) return;
    const t = setTimeout(() => setTimedOut(true), 30_000);
    return () => clearTimeout(t);
  }, [hold]);
  useEffect(() => {
    if (hold || !waiting) return;
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [hold, waiting, router]);
  if (hold) return null;
  if (sent === 'email') return <p className="mt-2 text-muted">שלחנו אישור ל־{email} ונעדכן בכל שלב.</p>;
  if (sent === 'whatsapp') return <p className="mt-2 text-muted">שלחנו אישור בוואטסאפ ונעדכן בכל שלב.</p>;
  if (waiting) return null;
  return <SaveLink link={link} selfWa={selfWa} />;
}

/** No written confirmation reached the customer: the page itself is the confirmation, so help them keep its link. */
function SaveLink({ link, selfWa }: { link: string; selfWa?: string }) {
  const field = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      field.current?.focus();
      field.current?.select();
    }
  };
  return (
    <div className="mx-auto mt-5 max-w-md rounded-2xl border border-line p-5 text-center">
      <p className="font-bold">שמרו את הקישור לדף הזה</p>
      <p className="mt-1 text-sm text-muted">לא נשלח אליכם אישור בכתב. הדף הזה הוא האישור של ההזמנה, ודרכו עוקבים אחריה.</p>
      <input ref={field} readOnly value={link} dir="ltr" aria-label="הקישור לדף ההזמנה" className="input mt-3 text-sm" onFocus={(e) => e.currentTarget.select()} />
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-primary btn-sm" onClick={copy}>
          {copied ? 'הקישור הועתק' : 'העתקת הקישור'}
        </button>
        {selfWa && (
          <a href={selfWa} target="_blank" rel="noopener" className="btn-outline btn-sm">
            שליחה לעצמי בוואטסאפ
          </a>
        )}
      </div>
    </div>
  );
}

/** Copies the order number for a pickup customer (same clipboard pattern as SaveLink). */
export function CopyOrderId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
    } catch {
      /* no clipboard: the number is shown right next to the button */
    }
  };
  return (
    <button type="button" className="btn-outline btn-sm" onClick={copy}>
      {copied ? 'הועתק' : 'העתקת מספר ההזמנה'}
    </button>
  );
}

/** "Pay now" on the order page – opens the secure card form in place. */
export function PayNow({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  if (open) return <PaymentFrame url={url} className="mt-4 text-right" />;
  return (
    <button type="button" className="btn-primary mt-4" onClick={() => setOpen(true)}>
      לתשלום מאובטח
    </button>
  );
}
