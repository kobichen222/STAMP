'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Img } from '@/components/Img';
import { Icon } from '@/components/ui/Icon';
import { LazyTemplatePreview as TemplatePreview } from '@/designer/LazyTemplatePreview';
import { INK_COLORS, type InkColor, type StampModel } from '@/designer/types';
import { formatPrice } from '@/lib/format';
import type { ImageRef } from '@/lib/types';

export const BODY_COLORS = [
  { id: 'black', label: 'שחור', hex: '#1d1f24' },
  { id: 'grey', label: 'אפור', hex: '#9aa3ad' },
  { id: 'blue', label: 'כחול', hex: '#2446b8' },
  { id: 'red', label: 'אדום', hex: '#c3202f' },
];

export function QuantityStepper({ value, onChange, min = 1 }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-white">
      <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface" aria-label="הפחתה" onClick={() => onChange(Math.max(min, value - 1))}>
        <Icon name="minus" size={16} />
      </button>
      <input
        aria-label="כמות"
        inputMode="numeric"
        className="w-10 bg-transparent text-center font-semibold outline-none"
        value={value}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value, 10) || min))}
      />
      <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface" aria-label="הוספה" onClick={() => onChange(value + 1)}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

export function InkPicker({ value, onChange }: { value: InkColor; onChange: (v: InkColor) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="צבע דיו">
      {(Object.keys(INK_COLORS) as InkColor[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={`chip ${value === k ? '!border-ink ring-2 ring-ink/10' : ''}`}
        >
          <span className="h-3.5 w-3.5 rounded-full" style={{ background: INK_COLORS[k].hex }} />
          {INK_COLORS[k].label}
        </button>
      ))}
    </div>
  );
}

export function ProductVisual({ model, images, title }: { model: StampModel | null; images: ImageRef[]; title: string }) {
  const [view, setView] = useState<'impression' | 'product'>(model ? 'impression' : 'product');
  return (
    <div className="card overflow-hidden">
      <div className="relative grid aspect-[4/3] place-items-center bg-gradient-to-b from-surface to-white p-8">
        {view === 'impression' && model ? (
          <div className="w-full max-w-md" style={{ filter: 'drop-shadow(0 18px 30px rgb(11 20 38 / .08))' }}>
            <TemplatePreview
              model={model}
              className="w-full"
              content={
                model.shape === 'round'
                  ? { arcTop: 'שם העסק שלכם', arcBottom: 'חותמות 2 דקות', lines: ['הטקסט', 'שלכם'] }
                  : { lines: ['השם שלכם כאן', 'שורה שנייה לבחירתכם', 'טל׳ 03-1234567'].slice(0, Math.max(1, Math.min(3, model.maxLines ?? 3))) }
              }
            />
            <p className="mt-4 text-center text-xs text-muted">תצוגת הטביעה במידות אמיתיות – {model.shape === 'round' ? `⌀${model.width}` : `${model.width}×${model.height}`} מ״מ</p>
          </div>
        ) : images[0] ? (
          <Img image={images[0]} className="max-h-full w-auto object-contain mix-blend-multiply" priority />
        ) : (
          <span className="text-muted">{title}</span>
        )}
        {model && images[0] && (
          <div className="absolute top-4 left-4 flex gap-1 rounded-full border border-line bg-white p-1 text-sm shadow-soft">
            {(['impression', 'product'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`rounded-full px-3.5 py-1.5 ${view === v ? 'bg-ink text-white' : 'text-ink-2'}`}>
                {v === 'impression' ? 'טביעה' : 'המוצר'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductConfigurator({ slug, designable, price }: { slug: string; designable: boolean; price: number | null }) {
  const [ink, setInk] = useState<InkColor>('black');
  const [body, setBody] = useState('black');
  const [qty, setQty] = useState(1);
  const href = `/designer/${slug}/?ink=${ink}&qty=${qty}&body=${body}`;
  return (
    <div className="mt-6 space-y-5 rounded-2xl border border-line p-5">
      <div>
        <p className="label">צבע גוף</p>
        <div className="flex gap-2" role="radiogroup" aria-label="צבע גוף">
          {BODY_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={body === c.id}
              aria-label={c.label}
              title={c.label}
              onClick={() => setBody(c.id)}
              className={`h-9 w-9 rounded-full border-2 transition ${body === c.id ? 'scale-110 border-blue' : 'border-white ring-1 ring-line'}`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">בכפוף לזמינות במלאי</p>
      </div>
      <div>
        <p className="label">צבע דיו</p>
        <InkPicker value={ink} onChange={setInk} />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label">כמות</p>
          <QuantityStepper value={qty} onChange={setQty} />
        </div>
        {price != null && (
          <p className="text-left text-sm text-muted">
            סה״כ <strong className="block text-2xl text-ink">{formatPrice(price * qty)}</strong>
          </p>
        )}
      </div>
      {designable ? (
        <Link href={href} className="btn-primary btn-lg w-full">
          עיצוב החותמת <Icon name="arrowLeft" size={18} />
        </Link>
      ) : (
        <Link href="/contact/" className="btn-dark btn-lg w-full">
          להזמנה וייעוץ
        </Link>
      )}
      {designable && (
        <p className="text-center text-xs text-muted">
          יש לכם קובץ מוכן? <Link href={`/designer/${slug}/?upload=1`} className="text-blue underline">העלו אותו בעורך</Link>
        </p>
      )}
    </div>
  );
}

