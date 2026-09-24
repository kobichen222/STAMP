'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ProductCard } from './ProductCard';
import type { ProductSummary } from './types';

const SERIES: Record<string, string> = {
  printer: 'חותמת אוטומטית',
  pocket: 'חותמת כיס',
  pen: 'עט חותמת',
  dater: 'תאריכון',
  numberer: 'נומרטור',
  special: 'מיוחדים',
};
const SHAPES: Record<string, string> = { rect: 'מלבנית', square: 'מרובעת', round: 'עגולה' };
const SIZES = [
  { id: 's', label: 'קטנה (עד 40 מ"מ)', test: (w: number) => w <= 40 },
  { id: 'm', label: 'בינונית (41–55)', test: (w: number) => w > 40 && w <= 55 },
  { id: 'l', label: 'גדולה (56+)', test: (w: number) => w > 55 },
];
const LINES = [
  { id: '1-3', label: '1–3', test: (n: number) => n <= 3 },
  { id: '4-5', label: '4–5', test: (n: number) => n >= 4 && n <= 5 },
  { id: '6+', label: '6+', test: (n: number) => n >= 6 },
];
type Sort = 'recommended' | 'price-asc' | 'price-desc' | 'size';

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`chip ${on ? 'chip-on' : ''}`}>
      {children}
    </button>
  );
}

export function CatalogBrowser({ products, initialSeries }: { products: ProductSummary[]; initialSeries?: string }) {
  const [series, setSeries] = useState<string[]>(initialSeries ? [initialSeries] : []);
  const [shape, setShape] = useState<string[]>([]);
  const [size, setSize] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [onlyDesignable, setOnlyDesignable] = useState(false);
  const [sort, setSort] = useState<Sort>('recommended');
  const [open, setOpen] = useState(false);

  const priceCap = useMemo(() => Math.max(0, ...products.map((p) => p.price ?? 0)), [products]);
  const flip = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const available = (key: 'series' | 'shape') => [...new Set(products.map((p) => p[key]).filter(Boolean) as string[])];

  const filtered = useMemo(() => {
    const list = products.filter(
      (p) =>
        (!series.length || series.includes(p.series)) &&
        (!shape.length || (p.shape && shape.includes(p.shape))) &&
        (!size.length || (p.width != null && SIZES.filter((s) => size.includes(s.id)).some((s) => s.test(p.width!)))) &&
        (!lines.length || (p.maxLines != null && LINES.filter((l) => lines.includes(l.id)).some((l) => l.test(p.maxLines!)))) &&
        (!maxPrice || (p.price != null && p.price <= maxPrice)) &&
        (!onlyDesignable || p.designable),
    );
    if (sort === 'price-asc') list.sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
    if (sort === 'price-desc') list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    if (sort === 'size') list.sort((a, b) => (a.width ?? 0) * (a.height ?? 0) - (b.width ?? 0) * (b.height ?? 0));
    return list;
  }, [products, series, shape, size, lines, maxPrice, onlyDesignable, sort]);

  const activeCount = series.length + shape.length + size.length + lines.length + (maxPrice ? 1 : 0) + (onlyDesignable ? 1 : 0);
  const reset = () => {
    setSeries([]);
    setShape([]);
    setSize([]);
    setLines([]);
    setMaxPrice(0);
    setOnlyDesignable(false);
  };

  const filters = (
    <div className="space-y-6">
      {available('series').length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">סוג</legend>
          <div className="flex flex-wrap gap-2">
            {available('series').map((s) => (
              <Toggle key={s} on={series.includes(s)} onClick={() => flip(series, setSeries, s)}>
                {SERIES[s] ?? s}
              </Toggle>
            ))}
          </div>
        </fieldset>
      )}
      {available('shape').length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">צורה</legend>
          <div className="flex flex-wrap gap-2">
            {available('shape').map((s) => (
              <Toggle key={s} on={shape.includes(s)} onClick={() => flip(shape, setShape, s)}>
                {SHAPES[s]}
              </Toggle>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">מידה</legend>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <Toggle key={s.id} on={size.includes(s.id)} onClick={() => flip(size, setSize, s.id)}>
              {s.label}
            </Toggle>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">מספר שורות</legend>
        <div className="flex flex-wrap gap-2">
          {LINES.map((l) => (
            <Toggle key={l.id} on={lines.includes(l.id)} onClick={() => flip(lines, setLines, l.id)}>
              {l.label}
            </Toggle>
          ))}
        </div>
      </fieldset>
      {priceCap > 0 && (
        <label className="block">
          <span className="mb-2 flex justify-between text-sm font-semibold">
            מחיר עד <span className="font-normal text-muted">{maxPrice ? `₪${maxPrice}` : 'ללא הגבלה'}</span>
          </span>
          <input type="range" min={0} max={priceCap} step={10} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-full accent-blue" />
        </label>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyDesignable} onChange={(e) => setOnlyDesignable(e.target.checked)} className="h-4 w-4 accent-blue" />
        רק מוצרים לעיצוב אונליין
      </label>
      {activeCount > 0 && (
        <button type="button" onClick={reset} className="text-sm text-blue hover:underline">
          ניקוי סינון ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-24">{filters}</div>
      </aside>
      <div>
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{filtered.length} מוצרים</p>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-outline btn-sm lg:hidden" onClick={() => setOpen(true)}>
              <Icon name="settings" size={16} /> סינון {activeCount > 0 && `(${activeCount})`}
            </button>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input !w-auto !py-1.5 text-sm" aria-label="מיון">
              <option value="recommended">מומלץ</option>
              <option value="price-asc">מחיר: מהנמוך</option>
              <option value="price-desc">מחיר: מהגבוה</option>
              <option value="size">מידה</option>
            </select>
          </div>
        </div>
        {filtered.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        ) : (
          <div className="card grid place-items-center p-12 text-center text-muted">
            <p>לא נמצאו מוצרים לסינון שבחרתם.</p>
            <button type="button" onClick={reset} className="btn-outline btn-sm mt-4">
              ניקוי סינון
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="סינון">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] animate-fade-up overflow-y-auto rounded-t-3xl bg-white p-5 pb-8">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            {filters}
            <button type="button" className="btn-primary btn-lg mt-6 w-full" onClick={() => setOpen(false)}>
              הצגת {filtered.length} מוצרים
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
