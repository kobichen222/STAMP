'use client';

import { useMemo, useRef, useState } from 'react';
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

/** Shrinks a photo in the browser (keeps transparency) so uploads stay small and fast. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('convert'))), 'image/webp', 0.9));
}

/** The product photo: click to replace it, with a way back to the original. */
function Photo({ row, current, onChange, size }: { row: AdminProductRow; current?: string; onChange: (url: string | undefined) => void; size: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const src = current ?? row.image;
  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const blob = await shrink(file);
      const body = new FormData();
      body.set('slug', row.slug);
      body.set('file', new File([blob], 'photo.webp', { type: 'image/webp' }));
      const r = await fetch('/api/admin/product-image/', { method: 'POST', body });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'ההעלאה נכשלה');
      onChange(j.url);
    } catch (e) {
      setError(e instanceof Error && e.message !== 'convert' ? e.message : 'לא הצלחנו לקרוא את התמונה');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        title="החלפת תמונת המוצר"
        aria-label={`החלפת התמונה של ${row.title}`}
        className={`group relative ${size} overflow-hidden rounded-lg border bg-white transition hover:border-blue ${current ? 'border-blue' : 'border-line'}`}
      >
        {src ? <img src={encodeURI(src)} alt="" className="h-full w-full object-contain mix-blend-multiply" /> : <span className="block h-full w-full bg-surface" />}
        <span className={`absolute inset-0 grid place-items-center bg-ink/55 text-[11px] font-semibold text-white transition ${busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>{busy ? 'מעלה…' : 'החלפה'}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void upload(f);
        }}
      />
      {current && !busy && (
        <button type="button" className="text-[11px] text-muted hover:text-ink" onClick={() => onChange(undefined)}>
          תמונה מקורית
        </button>
      )}
      {error && <span className="max-w-24 text-center text-[10px] leading-tight text-bad">{error}</span>}
    </div>
  );
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
      if (next.image) clean.image = next.image;
      const copy = { ...v };
      if (Object.keys(clean).length) copy[slug] = clean;
      else delete copy[slug];
      return copy;
    });
  const changedCount = Object.keys(value).length;

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input value={q} type="search" onChange={(e) => setQ(e.target.value)} placeholder="חיפוש מוצר…" className="input w-full sm:max-w-xs" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyHidden} onChange={(e) => setOnlyHidden(e.target.checked)} className="h-4 w-4 accent-blue" /> רק מוסתרים
        </label>
        <span className="ms-auto text-sm text-muted">
          {rows.length} מוצרים · {changedCount} עם שינוי
        </span>
      </div>
      {/* Phones: one card per product */}
      <ul className="mt-4 space-y-2 md:hidden">
        {list.map((r) => {
          const o = value[r.slug];
          const price = o?.price !== undefined ? o.price : r.basePrice;
          return (
            <li key={r.slug} className={`card flex items-center gap-3 p-3 ${o?.hidden ? 'opacity-60' : ''}`}>
              <Photo row={r} current={o?.image} onChange={(image) => set(r.slug, { image })} size="h-14 w-14" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{r.title}</p>
                <p className="truncate text-xs text-muted">
                  {r.size ?? r.series}
                  {r.basePrice != null && o?.price !== undefined ? ` · מקורי ₪${r.basePrice}` : ''}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-sm text-muted">₪</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
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
                    <button type="button" className="text-xs text-muted" onClick={() => set(r.slug, { price: undefined })}>
                      איפוס
                    </button>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <Switch on={!o?.hidden} onChange={(on) => set(r.slug, { hidden: !on })} label={`הצגת ${r.title}`} />
                <span className="text-[10px] text-muted">{o?.hidden ? 'מוסתר' : 'באתר'}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="card mt-4 hidden overflow-x-auto md:block">
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
                      <Photo row={r} current={o?.image} onChange={(image) => set(r.slug, { image })} size="h-14 w-16" />
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
