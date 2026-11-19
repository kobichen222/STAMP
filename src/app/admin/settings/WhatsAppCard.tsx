'use client';

import { useState } from 'react';

const STATE: Record<string, string> = {
  authorized: 'מחובר – הטלפון מקושר',
  notAuthorized: 'המופע קיים אבל הטלפון לא מקושר (סרקו את קוד ה-QR ב-Green API)',
  blocked: 'המספר חסום בוואטסאפ',
  sleepMode: 'הטלפון לא מחובר לאינטרנט',
  starting: 'המופע עולה – נסו שוב בעוד רגע',
  yellowCard: 'וואטסאפ הגביל זמנית את השליחה מהמספר',
};

/** WhatsApp (Green API) status and a test message. */
export function WhatsAppCard({ initial }: { initial: { configured: boolean; state?: string; error?: string; staff: number; customer: boolean } }) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const test = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/whatsapp/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; sent?: number };
      setMsg(res.ok ? { ok: true, text: `נשלחה הודעת בדיקה (${data.sent ?? 1})` } : { ok: false, text: data.error ?? 'השליחה נכשלה' });
    } catch {
      setMsg({ ok: false, text: 'השליחה נכשלה' });
    } finally {
      setBusy(false);
    }
  };

  const linked = initial.state === 'authorized';
  const status = !initial.configured ? 'לא מוגדר – ממתין למופע Green API' : initial.error ? `אין תשובה מ-Green API (${initial.error})` : (STATE[initial.state ?? ''] ?? initial.state ?? 'לא ידוע');

  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold">התראות וואטסאפ (Green API)</h2>
      <ul className="mt-3 divide-y divide-line text-sm">
        <li className="flex items-center justify-between gap-3 py-2.5">
          <span>מופע</span>
          <span className={linked ? 'font-medium text-ok' : 'text-warn'}>{status}</span>
        </li>
        <li className="flex items-center justify-between gap-3 py-2.5">
          <span>מספרי צוות להתראות</span>
          <span className={initial.staff ? 'font-medium text-ok' : 'text-warn'}>{initial.staff ? `${initial.staff} מספרים` : 'לא הוגדרו (WHATSAPP_ADMIN_TO)'}</span>
        </li>
        <li className="flex items-center justify-between gap-3 py-2.5">
          <span>הודעות ללקוחות</span>
          <span className={initial.customer ? 'font-medium text-ok' : 'text-muted'}>{initial.customer ? 'פעיל' : 'כבוי'}</span>
        </li>
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input className="input !h-10 min-w-0 flex-1" dir="ltr" inputMode="tel" placeholder="מספר לבדיקה" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="מספר לבדיקה" />
        <button type="button" className="btn-outline btn-sm" disabled={busy || !initial.configured} onClick={() => void test()}>
          {busy ? 'שולח…' : 'שליחת הודעת בדיקה'}
        </button>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-ok' : 'text-bad'}`}>{msg.text}</p>}
      <p className="mt-2 text-xs text-muted">בלי מספר – הבדיקה נשלחת למספרי הצוות.</p>
      <div className="mt-4 rounded-xl bg-surface p-3 text-xs text-ink-2">
        <p className="font-semibold">משתני סביבה ב-Vercel (ואחריהם Redeploy):</p>
        <ul className="mt-1.5 space-y-1">
          {[
            ['GREEN_API_INSTANCE', 'מספר המופע (idInstance)'],
            ['GREEN_API_TOKEN', 'הטוקן של המופע (apiTokenInstance)'],
            ['GREEN_API_URL', 'כתובת ה-API של המופע, אם מופיעה במסוף Green API'],
            ['WHATSAPP_ADMIN_TO', 'מספרי הצוות להתראות, מופרדים בפסיק'],
            ['WHATSAPP_CUSTOMER', '0 מכבה הודעות ללקוחות (לא חובה)'],
          ].map(([k, v]) => (
            <li key={k} className="flex flex-wrap items-baseline gap-x-2">
              <code dir="ltr" className="font-mono font-semibold">
                {k}
              </code>
              <span className="text-muted">{v}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
