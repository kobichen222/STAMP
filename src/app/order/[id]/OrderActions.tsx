'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

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

/** Right after the payment page: the bank's confirmation can arrive a few seconds after the customer. */
export function PaymentWatcher() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (++n > 12) clearInterval(t);
      router.refresh();
    }, 2500);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
