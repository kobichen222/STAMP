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
const LABEL = 'mb-1.5 block text-xs leading-[18px] text-muted';
const CHIP = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] leading-5';
const CHIP_ON = 'border-blue bg-blue/10 font-medium text-blue';
const CHIP_OFF = 'border-line text-muted';

const BONE = 'rounded-full bg-line/40';

/**
 * The options' place while the stamp is being made: the same rows at the same heights as one row of model chips,
 * so the card does not jump when the stamp arrives. Pulses while the card's turn runs, still while it waits its turn.
 */
export function StampOptionsSkeleton({ pulse }: { pulse: boolean }) {
  return (
    <div aria-hidden="true" className={`mt-3 sm:mt-0 ${pulse ? 'motion-safe:animate-pulse' : ''}`}>
      <div className="mb-1.5 flex h-[18px] items-center">
        <div className={`h-2.5 w-8 ${BONE}`} />
      </div>
      <div className="flex gap-1.5">
        {[64, 56, 72].map((w) => (
          <div key={w} className={`h-[34px] ${BONE}`} style={{ width: w }} />
        ))}
      </div>
      <div className="mt-3.5 mb-1.5 flex h-[18px] items-center">
        <div className={`h-2.5 w-14 ${BONE}`} />
      </div>
      <div className="flex items-center">
        <div className="flex gap-2.5">
          {INKS.map((k) => (
            <div key={k} className={`h-[26px] w-[26px] ${BONE}`} />
          ))}
        </div>
        <div className={`ms-auto h-[42px] w-[122px] ${BONE}`} />
      </div>
    </div>
  );
}

/** "+₪19" / "−₪19" against the selected model, '' when equal. */
function diffText(d: number) {
  const r = Math.round(d * 100) / 100;
  return r > 0 ? `+${formatPrice(r)}` : r < 0 ? `−${formatPrice(-r)}` : '';
}

/**
 * The card's model, ink, frame and quantity choice, always shown beside a ready, orderable stamp (under it on phones).
 * Low and wide: every model is a chip in one wrapping row, then the ink swatches, the frame toggle and the quantity share one row.
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
  onFrame,
}: {
  stamp: Stamp;
  body: string;
  qty: number;
  busy: boolean; // a bot turn is waiting or running
  inking: boolean; // an ink or frame redraw is in flight
  onBody: (slug: string) => void;
  onQty: (n: number) => void;
  onInk: (ink: string) => void;
  onFrame: (on: boolean) => void;
}) {
  const id = useId(); // names the body radios and labels the ink group
  const { bodies, ink, frame } = stamp;
  const unit = (price: number) => linePrice(price, 1, ink);
  const sel = bodies.find((b) => b.slug === body);
  const inkName = INK_COLORS[ink as InkColor]?.label ?? '';
  const inkExtra = DEFAULT_RULES.ink[ink] ?? 0;

  return (
    <div className="mt-3 sm:mt-0">
      {bodies.length === 1 ? (
        <div>
          <p className={LABEL}>דגם</p>
          <span className={`${CHIP} ${CHIP_ON}`}>
            <span aria-hidden="true">{bodies[0].short}</span>
            <span className="sr-only">{bodies[0].title}</span>
          </span>
        </div>
      ) : (
        bodies.length > 1 && (
          <fieldset disabled={busy}>
            <legend className={LABEL}>דגם</legend>
            <div className="flex flex-wrap gap-1.5">
              {bodies.map((b) => {
                const on = b.slug === body;
                const diff = !on && sel ? diffText(unit(b.price) - unit(sel.price)) : '';
                return (
                  <label key={b.slug} className="cursor-pointer has-[:disabled]:cursor-default">
                    <input
                      type="radio"
                      name={`${id}-body`}
                      value={b.slug}
                      checked={on}
                      onChange={() => onBody(b.slug)}
                      aria-label={diff ? `${b.title} ${diff}` : b.title}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`${CHIP} border-line text-ink transition peer-checked:border-blue peer-checked:bg-blue/10 peer-checked:font-medium peer-checked:text-blue peer-focus-visible:ring-2 peer-focus-visible:ring-blue peer-focus-visible:ring-offset-2 peer-disabled:opacity-60`}
                    >
                      {b.short}
                      {diff && <span className="tabular-nums text-muted">{diff}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )
      )}

      <p id={`${id}-ink`} className={`${LABEL} mt-3.5`}>
        צבע דיו
        {inkName && (
          <>
            {' · '}
            <span className="font-medium text-ink">{inkName}</span>
            {inkExtra > 0 && <span className="tabular-nums"> +{formatPrice(inkExtra)}</span>}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-y-3">
        <div role="group" aria-labelledby={`${id}-ink`} className="flex gap-2.5">
          {INKS.map((k) => {
            const on = k === ink;
            const extra = DEFAULT_RULES.ink[k] ?? 0;
            const name = extra > 0 ? `${INK_COLORS[k].label} (+${formatPrice(extra)})` : INK_COLORS[k].label;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                aria-label={name}
                title={name}
                disabled={busy || inking}
                onClick={() => {
                  if (!on) onInk(k);
                }}
                className={`h-[26px] w-[26px] rounded-full disabled:opacity-50 ${on ? 'ring-2 ring-ink ring-offset-2' : ''}`}
                style={{ backgroundColor: INK_COLORS[k].hex }}
              />
            );
          })}
        </div>

        {/* Rect stamps only: round, square and status stamps are always framed. */}
        {frame != null && (
          <button
            type="button"
            aria-pressed={frame}
            disabled={busy || inking}
            onClick={() => onFrame(!frame)}
            className={`${CHIP} ms-3.5 transition disabled:opacity-60 ${frame ? CHIP_ON : CHIP_OFF}`}
          >
            <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true" className="shrink-0">
              <rect x="0.75" y="0.75" width="12.5" height="8.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            מסגרת
          </button>
        )}

        {bodies.length > 0 && (
          <div className="ms-auto">
            <QuantityStepper value={qty} onChange={(n) => onQty(Math.min(MAX_QTY, n))} />
          </div>
        )}
      </div>
    </div>
  );
}
