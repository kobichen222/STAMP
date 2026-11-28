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
const CHIP = 'inline-flex items-center rounded-full border px-3 py-1.5 text-[13px] leading-5';
const CHIP_ON = 'border-blue bg-blue/10 font-medium text-blue';

/** Body titles all start with "חותמת"; the chip drops it so every model fits on a line or two. */
const shortTitle = (title: string) => title.replace(/^חותמת\s+/, '');

/**
 * The card's model, ink and quantity choice, always shown beside a ready, orderable stamp (under it on phones).
 * Low and wide so the card stays short: every model is a chip in one wrapping row, then ink swatches and
 * quantity share one row.
 */
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
  const inkName = INK_COLORS[ink as InkColor]?.label ?? '';

  return (
    <div className="mt-3 space-y-3.5 sm:mt-0">
      {bodies.length === 1 ? (
        <div>
          <p className={LABEL}>דגם</p>
          <span className={`${CHIP} ${CHIP_ON}`}>
            {shortTitle(bodies[0].title)} · <span className="tabular-nums">{unit(bodies[0].price)}</span>
          </span>
        </div>
      ) : (
        bodies.length > 1 && (
          <fieldset disabled={busy}>
            <legend className={LABEL}>דגם</legend>
            <div className="flex flex-wrap gap-1.5">
              {bodies.map((b) => (
                <label key={b.slug} className="cursor-pointer has-[:disabled]:cursor-default">
                  <input
                    type="radio"
                    name={`${id}-body`}
                    value={b.slug}
                    checked={b.slug === body}
                    onChange={() => onBody(b.slug)}
                    className="peer sr-only"
                  />
                  <span
                    className={`${CHIP} border-line text-ink transition peer-checked:border-blue peer-checked:bg-blue/10 peer-checked:font-medium peer-checked:text-blue peer-focus-visible:ring-2 peer-focus-visible:ring-blue peer-focus-visible:ring-offset-2 peer-disabled:opacity-60`}
                  >
                    {shortTitle(b.title)} · <span className="tabular-nums">{unit(b.price)}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p id={`${id}-ink`} className={LABEL}>
            צבע דיו{inkName && ` · ${inkName}`}
          </p>
          <div role="group" aria-labelledby={`${id}-ink`} className="flex gap-1">
            {INKS.map((k) => {
              const on = k === ink;
              const extra = DEFAULT_RULES.ink[k] ?? 0;
              const add = extra > 0 ? `+${formatPrice(extra)}` : '';
              const name = add ? `${INK_COLORS[k].label} (${add})` : INK_COLORS[k].label;
              return (
                <div key={k} className="flex flex-col items-center">
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={name}
                    title={name}
                    disabled={busy || inking}
                    onClick={() => {
                      if (!on) onInk(k);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-50"
                  >
                    <span
                      className={`h-6 w-6 rounded-full ${on ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                      style={{ backgroundColor: INK_COLORS[k].hex }}
                    />
                  </button>
                  {/* Same height under every swatch, so the ones without an add-on stay aligned. */}
                  <span aria-hidden="true" className="h-4 text-[11px] leading-4 tabular-nums text-muted">
                    {add}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {bodies.length > 0 && (
          <div>
            <p className={LABEL}>כמות</p>
            <QuantityStepper value={qty} onChange={(n) => onQty(Math.min(MAX_QTY, n))} />
          </div>
        )}
      </div>
    </div>
  );
}
