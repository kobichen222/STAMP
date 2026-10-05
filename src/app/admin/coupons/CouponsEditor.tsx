'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { AdminCoupon } from '@/lib/admin-settings';
import { saveCoupons } from '../settings-actions';
import { SaveBar, same, Switch } from '../ui';

const blank = (): AdminCoupon => ({ code: '', type: 'percent', value: 10, active: true });

export function CouponsEditor({ initial }: { initial: AdminCoupon[] }) {
  const [saved, setSaved] = useState(initial);
  const [list, setList] = useState(initial);
  const set = (i: number, patch: Partial<AdminCoupon>) => setList((l) => l.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <>
      <div className="mt-4 space-y-3">
        {list.map((c, i) => (
          <div key={i} className={`card grid items-end gap-3 p-4 sm:grid-cols-[1.2fr_auto_auto_auto_1fr_1.4fr_auto] ${c.active ? '' : 'opacity-60'}`}>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">קוד</span>
              <input value={c.code} onChange={(e) => set(i, { code: e.target.value.toUpperCase().replace(/\s/g, '') })} className="input font-mono" dir="ltr" placeholder="SUMMER10" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">סוג</span>
              <select value={c.type} onChange={(e) => set(i, { type: e.target.value as AdminCoupon['type'] })} className="input !w-auto">
                <option value="percent">אחוז</option>
                <option value="fixed">סכום ₪</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">{c.type === 'percent' ? 'הנחה %' : 'הנחה ₪'}</span>
              <input type="number" min={0} value={c.value} onChange={(e) => set(i, { value: Number(e.target.value) })} className="input !w-24" dir="ltr" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">מינימום הזמנה ₪</span>
              <input type="number" min={0} value={c.minSubtotal ?? ''} onChange={(e) => set(i, { minSubtotal: e.target.value === '' ? undefined : Number(e.target.value) })} className="input !w-24" dir="ltr" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">בתוקף עד</span>
              <input type="date" value={c.expiresAt?.slice(0, 10) ?? ''} onChange={(e) => set(i, { expiresAt: e.target.value ? `${e.target.value}T23:59:59` : undefined })} className="input" dir="ltr" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">הערה פנימית</span>
              <input value={c.note ?? ''} onChange={(e) => set(i, { note: e.target.value || undefined })} className="input" placeholder="למשל: קמפיין פייסבוק" />
            </label>
            <div className="flex items-center gap-2 pb-2">
              <Switch on={c.active} onChange={(on) => set(i, { active: on })} label={`הפעלת ${c.code}`} />
              <button type="button" aria-label="מחיקה" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:text-bad" onClick={() => setList((l) => l.filter((_, j) => j !== i))}>
                <Icon name="trash" size={17} />
              </button>
            </div>
          </div>
        ))}
        {!list.length && <p className="card p-6 text-center text-sm text-muted">אין קופונים. הוסיפו קופון ראשון.</p>}
      </div>
      <button type="button" className="btn-outline btn-sm mt-3" onClick={() => setList((l) => [...l, blank()])}>
        <Icon name="plus" size={16} /> קופון חדש
      </button>
      <SaveBar
        dirty={!same(list, saved)}
        onReset={() => setList(saved)}
        onSave={async () => {
          const clean = list.filter((c) => c.code.trim());
          const r = await saveCoupons(clean);
          if (r.ok) {
            setSaved(clean);
            setList(clean);
          }
          return r;
        }}
      />
    </>
  );
}
