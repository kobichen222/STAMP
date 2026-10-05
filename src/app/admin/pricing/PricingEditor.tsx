'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { INK_COLORS } from '@/designer/types';
import { BASE_PRICING, type PricingSettings } from '@/lib/admin-settings';
import { ADDONS } from '@/lib/pricing';
import { savePricing } from '../settings-actions';
import { NumberField, Panel, SaveBar, same, Switch } from '../ui';

export function PricingEditor({ initial }: { initial: PricingSettings }) {
  const [saved, setSaved] = useState(initial);
  const [v, setV] = useState(initial);
  const up = <K extends keyof PricingSettings>(k: K, val: PricingSettings[K]) => setV((p) => ({ ...p, [k]: val }));

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="תוספות למחיר החותמת" description="נוספות למחיר הבסיס של כל חותמת">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="מסגרת (חותמת מלבנית)" value={v.frame} onChange={(x) => up('frame', x ?? 0)} suffix="₪" />
            <NumberField label="עיבוד לוגו" value={v.logo} onChange={(x) => up('logo', x ?? 0)} suffix="₪" hint="0 = ללא תוספת" />
          </div>
          <h3 className="mt-5 mb-2 text-sm font-semibold">צבע דיו</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(INK_COLORS).map(([id, c]) => (
              <div key={id} className="flex items-center gap-2">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: c.hex }} />
                <NumberField label={c.label} value={v.ink[id] ?? 0} onChange={(x) => up('ink', { ...v.ink, [id]: x ?? 0 })} suffix="₪" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="הנחות" description="מחושבות לפי הסדר: כמות → עיצוב באתר">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="הנחת עיצוב באתר" value={v.onlineDesignPct} onChange={(x) => up('onlineDesignPct', x ?? 0)} suffix="%" />
            <NumberField label="קוד אישי להזמנה הבאה" value={v.rewardPct} onChange={(x) => up('rewardPct', x ?? 0)} suffix="%" hint="נשלח ללקוח אחרי תשלום · 0 = כבוי" />
          </div>
          <h3 className="mt-5 mb-2 text-sm font-semibold">הנחות כמות</h3>
          <ul className="space-y-2">
            {v.quantityTiers.map((t, i) => (
              <li key={i} className="flex flex-wrap items-end gap-3">
                <NumberField label="מכמות" value={t.min} min={2} onChange={(x) => up('quantityTiers', v.quantityTiers.map((q, j) => (j === i ? { ...q, min: x ?? 2 } : q)))} suffix="יח׳" />
                <NumberField label="הנחה" value={t.discountPct} onChange={(x) => up('quantityTiers', v.quantityTiers.map((q, j) => (j === i ? { ...q, discountPct: x ?? 0 } : q)))} suffix="%" />
                <button type="button" className="btn-ghost btn-sm text-bad" onClick={() => up('quantityTiers', v.quantityTiers.filter((_, j) => j !== i))}>
                  <Icon name="trash" size={16} /> הסרה
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-outline btn-sm mt-3" onClick={() => up('quantityTiers', [...v.quantityTiers, { min: 20, discountPct: 20 }])}>
            <Icon name="plus" size={16} /> מדרגה
          </button>
        </Panel>
      </div>

      <Panel title="משלוח ואיסוף" description="השיטות הפעילות מוצגות בקופה">
        <div className="space-y-3">
          {v.shipping.map((m, i) => {
            const set = (patch: Partial<typeof m>) => up('shipping', v.shipping.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <div key={m.id} className={`grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_auto_auto_1fr_auto] ${m.active === false ? 'opacity-60' : ''}`}>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">שם</span>
                  <input value={m.label} onChange={(e) => set({ label: e.target.value })} className="input" />
                </label>
                <NumberField label="מחיר" value={m.price} onChange={(x) => set({ price: x ?? 0 })} suffix="₪" />
                <NumberField label="חינם מעל" value={m.freeFrom} allowEmpty onChange={(x) => set({ freeFrom: x })} suffix="₪" />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">זמן אספקה</span>
                  <input value={m.eta} onChange={(e) => set({ eta: e.target.value })} className="input" />
                </label>
                <div className="flex items-center gap-2 pb-2">
                  <Switch on={m.active !== false} onChange={(on) => set({ active: on })} label={`הפעלת ${m.label}`} />
                  <span className="text-sm">{m.active !== false ? 'פעיל' : 'כבוי'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="מוצרים נוספים בסיכום ההזמנה">
        <ul className="divide-y divide-line">
          {v.addons.map((a, i) => {
            const meta = ADDONS.find((x) => x.id === a.id)!;
            const set = (patch: Partial<typeof a>) => up('addons', v.addons.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <li key={a.id} className={`flex flex-wrap items-center gap-4 py-3 ${a.active ? '' : 'opacity-60'}`}>
                <Switch on={a.active} onChange={(on) => set({ active: on })} label={`הפעלת ${meta.label}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{meta.label}</p>
                  <p className="text-xs text-muted">
                    {meta.description}
                    {meta.pro ? ' · מוצע רק לחותמות מקצועיות' : ''}
                  </p>
                </div>
                {meta.pctOfUnit != null ? (
                  <NumberField label="מחיר (% ממחיר החותמת)" value={a.pctOfUnit} onChange={(x) => set({ pctOfUnit: x ?? 0 })} suffix="%" />
                ) : (
                  <NumberField label="מחיר" value={a.price} onChange={(x) => set({ price: x ?? 0 })} suffix="₪" />
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <button type="button" className="text-sm text-muted underline hover:text-ink" onClick={() => confirm('לחזור לכל ערכי ברירת המחדל?') && setV(BASE_PRICING)}>
        חזרה לברירת המחדל
      </button>
      <SaveBar
        dirty={!same(v, saved)}
        onReset={() => setV(saved)}
        onSave={async () => {
          const r = await savePricing(v);
          if (r.ok) setSaved(v);
          return r;
        }}
      />
    </div>
  );
}
