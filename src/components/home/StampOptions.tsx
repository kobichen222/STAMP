'use client';

import { useId } from 'react';
import { QuantityStepper } from '@/components/catalog/ProductConfigurator';
import { INK_COLORS, type InkColor } from '@/designer/types';
import { formatPrice } from '@/lib/format';
import { DEFAULT_RULES, quoteLine } from '@/lib/pricing';
import type { Stamp } from '@/stamp-bot/card-types';

export const MAX_QTY = 500;

/** Line total of a stamp on one body. Bot stamps carry no frame surcharge (decision). */
export const linePrice = (basePrice: number, quantity: number, ink: string) =>
  quoteLine({ basePrice, quantity, ink, designedOnline: true }).total;

const INKS = Object.keys(INK_COLORS) as InkColor[];
const LABEL = 'mb-1.5 text-xs font-bold text-ink';

/** The card's model, ink and quantity choice, always shown beside a ready, orderable stamp (under it on phones). */
export function StampOptions({
  stamp,
  body,
  qty,
  busy,
  inking,
  onBody,
  onQty,
  onInk,
}: {
  stamp: Stamp;
  body: string;
  qty: number;
  busy: boolean; // a bot turn is waiting or running
  inking: boolean; // an ink redraw is in flight
  onBody: (slug: string) => void;
  onQty: (n: number) => void;
  onInk: (ink: string) => void;
}) {
  const id = useId(); // names the body radios and labels the ink group
  const { bodies, ink } = stamp;
  const unit = (price: number) => formatPrice(linePrice(price, 1, ink));

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-line p-3 sm:mt-0">
      {bodies.length === 1 ? (
        <div>
          <p className={LABEL}>דגם</p>
          <p className="flex justify-between gap-2 text-sm">
            <span>{bodies[0].title}</span>
            <span className="shrink-0 tabular-nums text-muted">{unit(bodies[0].price)}</span>
          </p>
        </div>
      ) : (
        bodies.length > 1 && (
          <fieldset disabled={busy}>
            <legend className={LABEL}>דגם</legend>
            <div className="divide-y divide-line rounded-xl border border-line">
              {bodies.map((b) => (
                <label key={b.slug} className="flex min-h-10 cursor-pointer items-center gap-2 px-3 text-sm has-[:disabled]:cursor-default has-[:disabled]:opacity-60">
                  <input
                    type="radio"
                    name={`${id}-body`}
                    value={b.slug}
                    checked={b.slug === body}
                    onChange={() => onBody(b.slug)}
                    className="accent-blue"
                  />
                  <span className="min-w-0 flex-1">{b.title}</span>
                  <span className="shrink-0 tabular-nums text-muted">{unit(b.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )
      )}

      <div>
        <p id={`${id}-ink`} className={LABEL}>
          צבע דיו
        </p>
        <div role="group" aria-labelledby={`${id}-ink`} className="flex flex-wrap gap-x-3">
          {INKS.map((k) => {
            const on = k === ink;
            const extra = DEFAULT_RULES.ink[k] ?? 0;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                disabled={busy || inking}
                onClick={() => {
                  if (!on) onInk(k);
                }}
                className="flex min-h-10 items-center gap-1.5 text-sm disabled:opacity-50"
              >
                <span
                  className={`h-5 w-5 shrink-0 rounded-full ${on ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                  style={{ backgroundColor: INK_COLORS[k].hex }}
                />
                <span className={on ? 'font-semibold text-ink' : 'text-muted'}>{INK_COLORS[k].label}</span>
                {extra > 0 && <span className="text-xs tabular-nums text-muted">+{formatPrice(extra)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {bodies.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-ink">כמות</p>
          <QuantityStepper value={qty} onChange={(n) => onQty(Math.min(MAX_QTY, n))} />
        </div>
      )}
    </div>
  );
}
