'use client';

import { useMemo, useState } from 'react';
import type { ProductOverride } from '@/lib/admin-settings';
import { saveProducts } from '../settings-actions';
import { SaveBar, same, Switch } from '../ui';

export interface AdminProductRow {
  slug: string;
  title: string;
  image: string | null;
  series: string;
  size: string | null;
  basePrice: number | null;
  designable: boolean;
}

export function ProductsEditor({ rows, initial }: { rows: AdminProductRow[]; initial: Record<string, ProductOverride> }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [q, setQ] = useState('');
  const [onlyHidden, setOnlyHidden] = useState(false);
  const list = useMemo(
    () => rows.filter((r) => (!q || `${r.title} ${r.slug} ${r.series}`.includes(q)) && (!onlyHidden || value[r.slug]?.hidden)),
    [rows, q, onlyHidden, value],
  );
  const set = (slug: string, patch: ProductOverride) =>
    setValue((v) => {
      const next = { ...(v[slug] ?? {}), ...patch };
      const clean: ProductOverride = {};
      if (next.price !== undefined) clean.price = next.price;
      if (next.hidden) clean.hidden = true;
      const copy = { ...v };
      if (Object.keys(clean).length) copy[slug] = clean;
      else delete copy[slug];
      return copy;
    });
  const changedCount = Object.keys(value).length;

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש מוצר…" className="input max-w-xs" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyHidden} onChange={(e) => setOnlyHidden(e.target.checked)} className="h-4 w-4 accent-blue" /> רק מוסתרים
        </label>
        <span className="ms-auto text-sm text-muted">
          {rows.length} מוצרים · {changedCount} עם שינוי
        </span>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-surface text-right text-xs text-muted">
            <tr>
              <th className="px-3 py-2.5 font-medium">מוצר</th>
              <th className="px-3 py-2.5 font-medium">סדרה · מידה</th>
              <th className="px-3 py-2.5 font-medium">מחיר מקורי</th>
              <th className="px-3 py-2.5 font-medium">מחיר באתר</th>
              <th className="px-3 py-2.5 font-medium">מוצג באתר</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((r) => {
              const o = value[r.slug];
              const price = o?.price !== undefined ? o.price : r.basePrice;
              return (
                <tr key={r.slug} className={o?.hidden ? 'bg-surface/70 text-muted' : ''}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {r.image ? <img src={encodeURI(r.image)} alt="" className="h-10 w-12 shrink-0 rounded object-contain mix-blend-multiply" /> : <span className="h-10 w-12 shrink-0 rounded bg-surface" />}
                      <div className="min-w-0">
                        <a href={`/stamp/${r.slug}/`} target="_blank" className="font-semibold hover:text-blue hover:underline">
                          {r.title}
                        </a>
                        {!r.designable && <p className="text-xs text-muted">לא לעיצוב אונליין</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {r.series}
                    {r.size && ` · ${r.size}`}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted">{r.basePrice != null ? `₪${r.basePrice}` : 'לפי הצעה'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted">₪</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        dir="ltr"
                        value={price ?? ''}
                        placeholder="הצעה"
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          set(r.slug, { price: v === r.basePrice ? undefined : v });
                        }}
                        className={`input !h-9 !w-24 !py-1 tabular-nums ${o?.price !== undefined ? '!border-blue font-semibold text-blue' : ''}`}
                        aria-label={`מחיר ${r.title}`}
                      />
                      {o?.price !== undefined && (
                        <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => set(r.slug, { price: undefined })}>
                          איפוס
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Switch on={!o?.hidden} onChange={(on) => set(r.slug, { hidden: !on })} label={`הצגת ${r.title}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SaveBar
        dirty={!same(value, saved)}
        onReset={() => setValue(saved)}
        onSave={async () => {
          const r = await saveProducts(value);
          if (r.ok) setSaved(value);
          return r;
        }}
      />
    </>
  );
}
