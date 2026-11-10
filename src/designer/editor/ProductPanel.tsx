'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatPrice } from '@/lib/format';
import { composeForProduction } from '../autofix';
import { contentOf, type LayoutContent } from '../compose';
import { formatSize } from '../models';
import { profileForModel } from '../profiles';
import { renderDesign } from '../render';
import { StampSvg } from '../StampSvg';
import { useEditor } from './context';
import { productSwitcher, type DesignerProduct } from './Editor';

const SAMPLE: LayoutContent = { lines: ['ישראל ישראלי', 'עורך דין ונוטריון', 'מ.ר. 12345'] };
const price = (p: DesignerProduct) => (p.price != null ? formatPrice(p.price) : 'לפי הצעה');

/**
 * Step 1 of the editor: product and size. Every size with its photo and price;
 * tapping one opens it in place with a preview of the customer's design (or a
 * sample) on that size, and a button to confirm.
 */
export function ProductPanel() {
  const { design, resolveFace, openPanel, closePanel } = useEditor();
  const products = productSwitcher.products;
  const current = products.find((p) => p.slug === productSwitcher.current) ?? products[0];
  const [shape, setShape] = useState<'rect' | 'round'>(current?.model.shape === 'round' ? 'round' : 'rect');
  const [open, setOpen] = useState<string>(current?.slug ?? '');
  const empty = design.elements.length === 0;
  // Keep the opened size (preview + button) in view.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => document.querySelector(`[data-product="${CSS.escape(open)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    return () => clearTimeout(t);
  }, [open, shape]);

  const list = useMemo(
    () =>
      products
        .filter((p) => (shape === 'round' ? p.model.shape === 'round' : p.model.shape !== 'round'))
        .sort((a, b) => a.model.width * a.model.height - b.model.width * b.model.height || (a.price ?? 0) - (b.price ?? 0)),
    [products, shape],
  );
  const content = useMemo(() => {
    const c = contentOf(design);
    return c.lines.length || c.logo || c.arcTop ? c : SAMPLE;
  }, [design]);

  if (!current) return null;
  const choose = (p: DesignerProduct) => {
    if (p.slug !== current.slug) productSwitcher.onChange(p.slug);
    if (empty) openPanel('templates');
    else closePanel();
  };

  return (
    <div className="p-4">
      <p className="text-[13px] leading-relaxed text-muted">בחרו את סוג החותמת והמידה. לחיצה על מידה מציגה איך העיצוב ייראה בה.</p>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 text-sm font-semibold" role="tablist">
        {(['rect', 'round'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={shape === s}
            onClick={() => setShape(s)}
            className={`rounded-lg py-2 transition ${shape === s ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
          >
            {s === 'rect' ? 'מלבניות' : 'עגולות'}
          </button>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {list.map((p) => {
          const isOpen = p.slug === open;
          const isCurrent = p.slug === current.slug;
          return (
            <li key={p.slug} data-product={p.slug} className={`overflow-hidden rounded-xl border transition ${isOpen ? 'border-blue ring-2 ring-blue/15' : 'border-line'}`}>
              <ProductRow p={p} current={isCurrent} on={isOpen} onPick={() => setOpen(isOpen ? '' : p.slug)} />
              {isOpen && (
                <div className="animate-fade-up border-t border-line/70 bg-gradient-to-b from-blue-50/50 to-white p-3">
                  <Preview p={p} content={content} />
                  <p className="mt-1.5 text-center text-[11px] text-muted">{content === SAMPLE ? 'דוגמה – הטקסט שלכם יופיע כאן' : 'כך ייראה העיצוב שלכם במידה הזו'}</p>
                  {isCurrent && !empty ? (
                    <p className="mt-2 py-1.5 text-center text-sm font-semibold text-ok">✓ זה המוצר של העיצוב שלכם</p>
                  ) : (
                    <button type="button" className="btn-primary mt-3 w-full" onClick={() => choose(p)}>
                      {isCurrent ? 'המשך עם המוצר הזה' : `בחירה · ${price(p)}`}
                      {empty && <span className="font-normal opacity-80">– ולבחירת תבנית</span>}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Preview({ p, content }: { p: DesignerProduct; content: LayoutContent }) {
  const { resolveFace, design } = useEditor();
  const render = useMemo(() => {
    try {
      const d = composeForProduction(p.model, content, 'classic', resolveFace, profileForModel(p.model)).design;
      return renderDesign({ ...d, inkColor: design.inkColor }, resolveFace);
    } catch {
      return null;
    }
  }, [p, content, resolveFace, design.inkColor]);
  return (
    <div className="grid min-h-[110px] place-items-center rounded-lg bg-white p-3 shadow-sm">
      {render ? <StampSvg render={render} className="max-h-[140px] w-full max-w-[260px]" pad={1} /> : <p className="text-sm text-muted">אין תצוגה למידה הזו</p>}
    </div>
  );
}

function ProductRow({ p, on, current, onPick }: { p: DesignerProduct; on: boolean; current: boolean; onPick: () => void }) {
  const m = p.model;
  // Size swatch roughly to scale.
  const w = Math.max(10, Math.min(44, m.width / 2));
  const h = Math.max(8, Math.min(44, m.height / 2));
  return (
    <button type="button" onClick={onPick} aria-expanded={on} className={`flex w-full items-center gap-3 p-2 text-start transition ${on ? 'bg-blue-50/60' : 'bg-white hover:bg-surface'}`}>
      {p.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain" />
      ) : (
        <span className="h-14 w-14 shrink-0 rounded-lg bg-surface" />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold">{p.title}</span>
          {current && <span className="shrink-0 rounded-full bg-ok/10 px-1.5 py-0.5 text-[10px] font-bold text-ok">נבחר</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span
            className={`inline-block shrink-0 border-[1.5px] border-ink/50 ${m.shape === 'round' ? 'rounded-full' : 'rounded-[2px]'}`}
            style={{ width: m.shape === 'round' ? h : w, height: h }}
            aria-hidden
          />
          {formatSize(m)}
          {m.maxLines ? ` · עד ${m.maxLines} שורות` : ''}
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold tabular-nums">{p.price != null ? formatPrice(p.price) : '—'}</span>
    </button>
  );
}
