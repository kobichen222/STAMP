'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { purgeOrder, restoreOrder } from '../../order-edit-actions';

export function TrashActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <button type="button" disabled={pending} onClick={() => start(async () => void (await restoreOrder(id), router.refresh()))} className="btn-primary btn-sm flex-1 sm:flex-none">
        שחזור
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`למחוק את ${id} לצמיתות? אי אפשר יהיה לשחזר.`)) start(async () => void (await purgeOrder(id), router.refresh()));
        }}
        className="btn-ghost btn-sm flex-1 text-bad sm:flex-none"
      >
        מחיקה לצמיתות
      </button>
    </div>
  );
}
