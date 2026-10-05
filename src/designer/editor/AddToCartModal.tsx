'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatPrice } from '@/lib/format';
import { ADDONS, type AddonSelection, type PriceLine } from '@/lib/pricing';
import { formatSize } from '../models';
import type { RenderResult } from '../render';
import { INK_COLORS, type InkColor } from '../types';
import type { Issue } from '../validate';
import { isProductionReady } from '../validate';
import type { DesignerProduct } from './Editor';
import { InkImpression } from './PreviewMode';

export function AddToCartModal({
  render,
  product,
  issues,
  qty,
  onQty,
  ink,
  onInk,
  total,
  lines,
  addons,
  onAddons,
  pro,
  onRequest,
  onFix,
  onConfirm,
  onClose,
}: {
  render: RenderResult;
  product: DesignerProduct;
  issues: Issue[];
  qty: number;
  onQty: (n: number) => void;
  ink: InkColor;
  onInk: (i: InkColor) => void;
  total: number;
  lines: PriceLine[];
  addons: AddonSelection;
  onAddons: (a: AddonSelection) => void;
  pro: boolean;
  onRequest: boolean;
  onFix: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ready = isProductionReady(issues);
  const outside = issues.some((i) => i.code === 'out-of-bounds');
  const logoIssue = issues.some((i) => i.code === 'logo-resolution' && i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const errors = issues.filter((i) => i.severity === 'error');
  const [triedFix, setTriedFix] = useState(false);
  const checks = [
    { ok: ready, label: ready ? 'קובץ תקין לייצור' : 'בקובץ יש בעיות שחוסמות ייצור' },
    { ok: !outside, label: outside ? 'יש אלמנטים מחוץ לגבולות' : 'כל האלמנטים בתוך הגבולות' },
    { ok: !logoIssue, label: logoIssue ? 'איכות הלוגו נמוכה מדי' : 'איכות לוגו תקינה' },
  ];
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-labelledby="atc-title">
      <div className="card max-h-[92dvh] w-full max-w-lg animate-pop overflow-y-auto p-6 shadow-lift">
        <div className="flex items-start justify-between">
          <h2 id="atc-title" className="text-xl font-extrabold">
            {ready ? 'החותמת מוכנה' : 'כמעט מוכן'}
          </h2>
          <button type="button" onClick={onClose} aria-label="סגירה" className="btn-ghost !p-1.5">
            <Icon name="close" />
          </button>
        </div>
        <div className="mt-4 grid place-items-center rounded-xl bg-[#fdfcf8] p-5">
          <InkImpression render={render} ink={ink} soft className="max-h-48 w-full" />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted">מוצר</dt>
          <dd className="font-medium">{product.title}</dd>
          <dt className="text-muted">מידות</dt>
          <dd>{formatSize(product.model)}</dd>
          <dt className="text-muted">צבע דיו</dt>
          <dd className="flex gap-1.5">
            {(Object.keys(INK_COLORS) as InkColor[]).map((k) => (
              <button key={k} type="button" aria-label={INK_COLORS[k].label} title={INK_COLORS[k].label} onClick={() => onInk(k)} className={`h-6 w-6 rounded-full border-2 ${ink === k ? 'border-blue' : 'border-white ring-1 ring-line'}`} style={{ background: INK_COLORS[k].hex }} />
            ))}
          </dd>
          <dt className="text-muted">כמות</dt>
          <dd className="flex items-center gap-2">
            <button type="button" className="btn-outline !h-7 !w-7 !p-0" aria-label="הפחתה" onClick={() => onQty(Math.max(1, qty - 1))}>
              −
            </button>
            <span className="w-6 text-center font-semibold">{qty}</span>
            <button type="button" className="btn-outline !h-7 !w-7 !p-0" aria-label="הוספה" onClick={() => onQty(qty + 1)}>
              +
            </button>
          </dd>
        </dl>
        {!onRequest && (
          <section className="mt-5" aria-labelledby="addons-title">
            <h3 id="addons-title" className="text-sm font-bold">
              מוצרים נוספים
            </h3>
            <ul className="mt-2 space-y-2">
              {ADDONS.filter((a) => a.active !== false && (!a.pro || pro)).map((a) => {
                const n = addons[a.id] ?? 0;
                const price = a.pctOfUnit ? '10% הנחה' : formatPrice(a.price ?? 0);
                return (
                  <li key={a.id} className={`flex items-center gap-3 rounded-xl border p-3 transition ${n ? 'border-blue bg-blue-50/60' : 'border-line'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {a.label} <span className="font-normal text-blue">· {price}</span>
                      </p>
                      <p className="text-xs text-muted">{a.description}</p>
                    </div>
                    {n ? (
                      <div className="flex items-center gap-1.5">
                        <button type="button" className="btn-outline !h-7 !w-7 !p-0" aria-label={`הפחתת ${a.label}`} onClick={() => onAddons({ ...addons, [a.id]: n - 1 })}>
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">{n}</span>
                        <button type="button" className="btn-outline !h-7 !w-7 !p-0" aria-label={`הוספת ${a.label}`} onClick={() => onAddons({ ...addons, [a.id]: n + 1 })}>
                          +
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="btn-outline btn-sm shrink-0" onClick={() => onAddons({ ...addons, [a.id]: 1 })}>
                        <Icon name="plus" size={15} /> הוספה
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {!onRequest && lines.length > 1 && (
          <dl className="mt-4 space-y-1 rounded-xl bg-surface p-3 text-sm">
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-3">
                <dt className={l.amount < 0 ? 'text-ok' : 'text-ink-2'}>{l.label}</dt>
                <dd className={`tabular-nums ${l.amount < 0 ? 'text-ok' : ''}`}>{l.amount < 0 ? `−${formatPrice(-l.amount)}` : formatPrice(l.amount)}</dd>
              </div>
            ))}
          </dl>
        )}
        <ul className="mt-5 space-y-1.5 rounded-xl bg-surface p-4 text-sm">
          {checks.map((c) => (
            <li key={c.label} className={`flex items-center gap-2 ${c.ok ? 'text-ok' : 'text-bad'}`}>
              <Icon name={c.ok ? 'check' : 'alert'} size={16} /> {c.label}
            </li>
          ))}
          {warnings.length > 0 && <li className="text-xs text-warn">{warnings.length} הערות שכדאי לבדוק (לא חוסמות)</li>}
        </ul>
        {!ready && (
          <div className="mt-3 rounded-xl border border-bad/20 bg-bad/5 p-3 text-sm">
            <p className="font-semibold text-bad">{triedFix ? 'לא הכול תוקן אוטומטית:' : 'מה צריך לתקן:'}</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-5 text-ink-2">
              {errors.slice(0, 3).map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
            {triedFix && <p className="mt-2 text-xs text-muted">נסו לקצר את הטקסט המסומן באדום או להסיר שורה – ואז חזרו לכאן.</p>}
          </div>
        )}
        <div className="mt-5 flex items-center justify-between">
          <p className="text-2xl font-bold">{onRequest ? 'מחיר לפי הצעה' : formatPrice(total)}</p>
          {ready ? (
            <button type="button" className="btn-primary btn-lg" onClick={onConfirm}>
              אישור והוספה לסל
            </button>
          ) : (
            <div className="flex gap-2">
              {triedFix && (
                <button type="button" className="btn-outline" onClick={onClose}>
                  חזרה לעריכה
                </button>
              )}
              <button
                type="button"
                className="btn-dark btn-lg"
                onClick={() => {
                  onFix();
                  setTriedFix(true);
                }}
              >
                <Icon name="wand" size={18} /> תקן עבורי
              </button>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">באישור אתם מאשרים שהטקסט והעיצוב נכונים. הקובץ יועבר לייצור בדיוק כפי שמוצג.</p>
      </div>
    </div>
  );
}
