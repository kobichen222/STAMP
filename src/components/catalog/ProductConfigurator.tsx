'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
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

type Slide = { kind: 'impression' } | { kind: 'image'; image: ImageRef };

function Impression({ model }: { model: StampModel }) {
  return (
    <TemplatePreview
      model={model}
      className="w-full"
      content={
        model.shape === 'round'
          ? { arcTop: 'שם העסק שלכם', arcBottom: 'חותמות 2 דקות', lines: ['הטקסט', 'שלכם'] }
          : { lines: ['השם שלכם כאן', 'שורה שנייה לבחירתכם', 'טל׳ 03-1234567'].slice(0, Math.max(1, Math.min(3, model.maxLines ?? 3))) }
      }
    />
  );
}

/** Interactive product gallery: impression + photos, thumbnails, arrows, swipe, keyboard, zoom. */
export function ProductVisual({ model, images, title }: { model: StampModel | null; images: ImageRef[]; title: string }) {
  const slides: Slide[] = [...(model ? [{ kind: 'impression' as const }] : []), ...images.map((image) => ({ kind: 'image' as const, image }))];
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touch = useRef<number | null>(null);
  const count = slides.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);
  const slide = slides[index];

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(false);
      if (e.key === 'ArrowLeft') go(1);
      if (e.key === 'ArrowRight') go(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [zoom, go]);

  if (!slide) return <div className="card grid aspect-[4/3] place-items-center text-muted">{title}</div>;

  const render = (s: Slide, big = false) =>
    s.kind === 'impression' && model ? (
      <div className={`w-full ${big ? 'max-w-3xl' : 'max-w-md'}`} style={{ filter: 'drop-shadow(0 18px 30px rgb(11 20 38 / .08))' }}>
        <Impression model={model} />
      </div>
    ) : s.kind === 'image' ? (
      <Img image={s.image} className={`max-h-full w-auto object-contain ${big ? '' : 'mix-blend-multiply'}`} priority={!big && index === 0} />
    ) : null;

  const arrows = count > 1 && (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="הקודם" className="absolute top-1/2 right-3 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow-soft transition hover:scale-105">
        <Icon name="arrowRight" size={18} />
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="הבא" className="absolute top-1/2 left-3 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/95 shadow-soft transition hover:scale-105">
        <Icon name="arrowLeft" size={18} />
      </button>
    </>
  );

  return (
    <div>
      <div
        className="card relative overflow-hidden"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx > 0 ? 1 : -1); // RTL: swipe right = next
          touch.current = null;
        }}
      >
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="relative grid aspect-[4/3] w-full cursor-zoom-in place-items-center bg-gradient-to-b from-surface to-white p-8"
          aria-label="הגדלת תמונה"
        >
          <div key={index} className="grid h-full w-full animate-fade-up place-items-center">
            {render(slide)}
          </div>
        </button>
        {slide.kind === 'impression' && model && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-muted">
            תצוגת הטביעה במידות אמיתיות – {model.shape === 'round' ? `⌀${model.width}` : `${model.width}×${model.height}`} מ״מ
          </p>
        )}
        {arrows}
        {count > 1 && (
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs tabular-nums shadow-soft">
            {index + 1}/{count}
          </span>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="תמונות המוצר">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.kind === 'impression' ? 'תצוגת טביעה' : `תמונה ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border-2 bg-white p-1 transition ${i === index ? 'border-blue' : 'border-line hover:border-ink/30'}`}
            >
              {s.kind === 'impression' && model ? (
                <span className="grid h-full w-full place-items-center text-[10px] font-semibold text-blue">
                  <Icon name="sparkles" size={18} />
                  טביעה
                </span>
              ) : s.kind === 'image' ? (
                <Img image={s.image} className="h-full w-full object-contain" />
              ) : null}
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-ink/90 p-4" role="dialog" aria-modal="true" aria-label="תצוגה מוגדלת" onClick={() => setZoom(false)}>
          <button type="button" onClick={() => setZoom(false)} aria-label="סגירה" className="absolute top-4 left-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white text-ink">
            <Icon name="close" size={22} />
          </button>
          <div className="relative grid h-full max-h-[86vh] w-full max-w-5xl place-items-center rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            {render(slide, true)}
            {arrows}
          </div>
        </div>
      )}
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

