'use client';

import { useState, useTransition } from 'react';
import { cancelZigZag, refreshZigZagStatus, sendToZigZag, type ShipResult } from './actions';

/** Send / cancel / track the order's ZigZag shipment (through DataLogics). */
export function ZigZagBox({
  id,
  card,
  configured,
  tracking,
  labelUrl,
  history,
}: {
  id: string;
  card: string;
  configured: boolean;
  tracking?: string;
  labelUrl?: string;
  history?: { status: string; date: string }[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ShipResult | null>(null);
  const run = (fn: (id: string) => Promise<ShipResult>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => setMsg(await fn(id)));
  };
  return (
    <div className="mt-3 rounded-xl border border-line p-3 text-sm">
      <p className="font-semibold">
        זיג זג · כרטיס לקוח <span dir="ltr">{card}</span>
      </p>
      {!configured ? (
        <p className="mt-1 text-muted">
          שידור אוטומטי לא הוגדר עדיין – משדרים ידנית ב
          <a href="https://www.zig-zag.co.il/" target="_blank" rel="noopener" className="text-blue underline">
            אתר זיג זג
          </a>
          .
        </p>
      ) : tracking ? (
        <>
          <p className="mt-1">
            שודר · מספר מעקב <strong dir="ltr">{tracking}</strong>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {labelUrl && (
              <a href={labelUrl} target="_blank" rel="noopener" className="btn-primary btn-sm">
                תווית משלוח
              </a>
            )}
            <button type="button" className="btn-outline btn-sm" disabled={pending} onClick={() => run(refreshZigZagStatus)}>
              עדכון סטטוס
            </button>
            <button type="button" className="btn-ghost btn-sm text-bad" disabled={pending} onClick={() => run(cancelZigZag, 'לבטל את המשלוח בזיג זג?')}>
              ביטול משלוח
            </button>
          </div>
          {!!history?.length && (
            <ol className="mt-2 space-y-0.5 text-xs text-muted">
              {history.map((h, i) => (
                <li key={i}>
                  {h.date} · {h.status}
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <button type="button" className="btn-primary btn-sm mt-2" disabled={pending} onClick={() => run(sendToZigZag, `לשדר את המשלוח לזיג זג בכרטיס ${card}?`)}>
          {pending ? 'משדר…' : 'שידור משלוח לזיג זג'}
        </button>
      )}
      {msg && <p className={`mt-2 ${msg.ok ? 'text-ok' : 'text-bad'}`}>{msg.msg}</p>}
    </div>
  );
}
