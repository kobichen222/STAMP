'use client';

import { useEffect, useState, useTransition } from 'react';
import { finishJob, startJob } from '../actions';

const KEY = 's2g-worker';

export function WorkerName() {
  const [name, setName] = useState('');
  useEffect(() => {
    try {
      setName(localStorage.getItem(KEY) ?? '');
    } catch {
      /* ignore */
    }
  }, []);
  return (
    <label className="flex items-center gap-2 text-sm">
      עובד:
      <input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          try {
            localStorage.setItem(KEY, e.target.value);
          } catch {
            /* ignore */
          }
        }}
        placeholder="שם"
        className="input !w-36 !py-1.5 text-sm"
      />
    </label>
  );
}

export function ProductionControls({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const worker = () => {
    try {
      return localStorage.getItem(KEY) ?? '';
    } catch {
      return '';
    }
  };
  if (status === 'READY_FOR_PRODUCTION') {
    return (
      <button type="button" disabled={pending} className="btn-primary btn-lg mt-4 w-full" onClick={() => start(() => startJob(id, worker()))}>
        {pending ? '…' : 'התחל ייצור'}
      </button>
    );
  }
  if (status === 'IN_PRODUCTION') {
    return (
      <button type="button" disabled={pending} className="btn-dark btn-lg mt-4 w-full" onClick={() => start(() => finishJob(id, worker()))}>
        {pending ? '…' : 'הושלם'}
      </button>
    );
  }
  return (
    <a href={`/admin/orders/${id}/`} className="btn-outline mt-4 w-full">
      פתח הזמנה לטיפול
    </a>
  );
}
