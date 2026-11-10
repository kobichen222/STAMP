'use client';

import { useState, useTransition } from 'react';
import { deleteOrder } from '../../order-edit-actions';

/** Danger zone: move the order to the recycle bin (restorable from there). */
export function DeleteOrder({ id, warnings }: { id: string; warnings: string[] }) {
  const [ask, setAsk] = useState(false);
  const [pending, start] = useTransition();
  if (!ask)
    return (
      <button type="button" onClick={() => setAsk(true)} className="btn-ghost btn-sm w-full text-bad">
        מחיקת ההזמנה
      </button>
    );
  return (
    <div className="rounded-xl border border-bad/30 bg-bad/5 p-3 text-sm">
      <p className="font-bold text-bad">למחוק את ההזמנה {id}?</p>
      <p className="mt-1 text-ink-2">ההזמנה תעבור לסל המחזור ותיעלם מהרשימות. אפשר לשחזר אותה משם.</p>
      {warnings.map((w) => (
        <p key={w} className="mt-1 font-semibold text-warn">
          ⚠ {w}
        </p>
      ))}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setAsk(false)} className="btn-outline btn-sm flex-1" disabled={pending}>
          ביטול
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn-sm flex-1 rounded-full bg-bad font-semibold text-white"
          onClick={() =>
            start(async () => {
              const r = await deleteOrder(id);
              // Full navigation so the list is fetched fresh (no cached copy with the deleted order).
              if (r.ok) window.location.href = '/admin/orders/';
            })
          }
        >
          {pending ? 'מוחק…' : 'כן, למחוק'}
        </button>
      </div>
    </div>
  );
}
