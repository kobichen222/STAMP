'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LazyTemplatePreview as TemplatePreview } from '@/designer/LazyTemplatePreview';
import { TEMPLATE_CATEGORIES, TEMPLATES, type TemplateCategory } from '@/designer/templates';
import type { StampModel } from '@/designer/types';

const RECT: StampModel = { id: 'print-40', name: 'PRINT 40', shape: 'rect', width: 58, height: 22 };
const ROUND: StampModel = { id: 'print-r-540', name: 'R 540', shape: 'round', width: 40, height: 40 };
const LIST = TEMPLATES.filter((t) => t.content.lines.length || t.content.arcTop || t.content.logo);
const CATS = TEMPLATE_CATEGORIES.filter((c) => LIST.some((t) => t.category === c.id));
const AUTOPLAY_MS = 3200;

/** Home-page template carousel: category chips, snap track, arrows, autoplay and progress. */
export function TemplateStrip() {
  const [cat, setCat] = useState<TemplateCategory | 'all'>('all');
  const [progress, setProgress] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });
  const track = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const inView = useRef(false);
  const list = cat === 'all' ? LIST : LIST.filter((t) => t.category === cat);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft); // RTL: scrollLeft runs 0 → negative
    setProgress(max > 0 ? pos / max : 1);
    setEdges({ start: pos < 4, end: pos > max - 4 });
  }, []);

  /** dir 1 = forward (towards the left in RTL). */
  const go = useCallback((dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-card]');
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    if (dir === 1 && pos > max - 4) el.scrollTo({ left: 0, behavior: 'smooth' });
    else el.scrollBy({ left: -dir * step, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    measure();
    track.current?.scrollTo({ left: 0 });
  }, [cat, measure]);

  // Gentle autoplay – only while visible, never during interaction or with reduced motion.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (inView.current = e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    const t = window.setInterval(() => {
      if (!paused.current && inView.current && !document.hidden) go(1);
    }, AUTOPLAY_MS);
    return () => {
      io.disconnect();
      window.clearInterval(t);
    };
  }, [go]);

  const pause = (v: boolean) => () => (paused.current = v);

  return (
    <section className="overflow-hidden py-20 sm:py-28" aria-roledescription="carousel" aria-label="תבניות חותמות">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">תבניות</p>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">מתחילים מתבנית, מסיימים בדקה</h2>
            <p className="mt-2 text-muted">בוחרים עיצוב, מחליפים את הפרטים – והחותמת מוכנה לייצור.</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button type="button" onClick={() => go(-1)} disabled={edges.start} aria-label="הקודם" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white shadow-soft transition hover:border-blue hover:text-blue disabled:opacity-35">
              <Icon name="arrowRight" size={19} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="הבא" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white shadow-soft transition hover:border-blue hover:text-blue">
              <Icon name="arrowLeft" size={19} />
            </button>
          </div>
        </div>

        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" role="tablist" aria-label="סינון לפי תחום">
          {[{ id: 'all' as const, label: 'הכול' }, ...CATS].map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${cat === c.id ? 'bg-ink text-white shadow-soft' : 'border border-line bg-white text-ink-2 hover:border-ink/30'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-6">
        {/* Edge fades */}
        <div aria-hidden className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white transition-opacity sm:w-24 ${edges.start ? 'opacity-0' : 'opacity-100'}`} />
        <div aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white transition-opacity sm:w-24 ${edges.end ? 'opacity-0' : 'opacity-100'}`} />
        <div
          ref={track}
          onScroll={measure}
          onPointerEnter={pause(true)}
          onPointerLeave={pause(false)}
          onTouchStart={pause(true)}
          onFocus={pause(true)}
          onBlur={pause(false)}
          className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 pt-2 pb-6 [scrollbar-width:none] sm:scroll-px-6 sm:px-6 lg:scroll-px-[max(2rem,calc((100vw-1240px)/2+2rem))] lg:px-[max(2rem,calc((100vw-1240px)/2+2rem))] [&::-webkit-scrollbar]:hidden"
        >
          {list.map((t, i) => {
            const round = t.shape === 'round';
            const model = round ? ROUND : RECT;
            const label = TEMPLATE_CATEGORIES.find((c) => c.id === t.category)?.label;
            return (
              <Link
                key={t.id}
                data-card
                href={`/designer/?template=${t.id}`}
                aria-label={`${t.name} – עצבו דומה`}
                className="group relative flex w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition duration-300 hover:-translate-y-1.5 hover:border-blue/30 hover:shadow-lift sm:w-[300px]"
              >
                <div className="relative grid aspect-[4/3] place-items-center bg-gradient-to-b from-surface to-blue-50/60 p-6">
                  <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink-2 shadow-soft">{label}</span>
                  <span className="absolute top-3 left-3 rounded-full bg-ink/80 px-2 py-1 text-[10px] font-medium text-white tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className={`${round ? 'h-[82%]' : 'w-[92%]'} drop-shadow-[0_10px_18px_rgba(11,20,38,.12)] transition duration-500 group-hover:scale-[1.05] group-hover:-rotate-1`}>
                    <TemplatePreview model={model} content={t.content} style={t.style} className={round ? 'h-full' : 'w-full'} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{t.name}</p>
                    <p className="text-xs text-muted">
                      {model.name} · <bdi dir="ltr">{round ? `⌀${model.width}` : `${model.width}×${model.height}`}</bdi> מ״מ
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue transition group-hover:bg-blue group-hover:text-white">
                    עצבו דומה <Icon name="arrowLeft" size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
          <Link
            href="/templates/"
            data-card
            className="flex w-[60%] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line p-6 text-center transition hover:border-blue hover:text-blue sm:w-[220px]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue">
              <Icon name="template" size={22} />
            </span>
            <span className="font-bold">לכל התבניות</span>
            <span className="text-xs text-muted">כולל סינון לפי מקצוע וגודל</span>
          </Link>
        </div>
      </div>

      <div className="container-x">
        <div className="mx-auto h-1 max-w-xs overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full origin-right rounded-full bg-blue transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0.08, progress)})` }} />
        </div>
      </div>
    </section>
  );
}
