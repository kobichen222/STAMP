'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatPrice } from '@/lib/format';
import type { Stamp } from '@/stamp-bot/card-types';
import type { Msg } from '@/stamp-bot/form';
import { linePrice, StampOptions } from './StampOptions';

/** One stamp under the home page box: its own conversation with the bot, its own image, its own order line. */
export type StampCardData = {
  id: string;
  msgs: Msg[];
  stamp: Stamp | null;
  body: string; // slug of the chosen body, '' when the stamp has none
  qty: number;
  reply: string;
  err: string;
  busy: boolean; // a bot turn is waiting in the queue or running
  inking: boolean; // an ink redraw is in flight
  panel: 'fix' | null; // the fix form is open; model, ink and quantity are always shown beside a ready stamp
};

/** Keep the chosen body when the new stamp still offers it, otherwise the cheapest one. */
export const pickBody = (stamp: Stamp, prev: string) =>
  stamp.bodies.some((b) => b.slug === prev) ? prev : (stamp.bodies[0]?.slug ?? '');

/** The card's line total, or null when it has nothing to order (no stamp, no body, or not orderable yet). */
export function cardTotal(c: StampCardData): number | null {
  const b = c.stamp?.bodies.find((x) => x.slug === c.body);
  return c.stamp?.orderable && b ? linePrice(b.price, c.qty, c.stamp.ink) : null;
}

function sizeLabel(s: Stamp) {
  const [w, h] = s.size.split('x');
  return s.kind === 'round' ? `עגול ${w} מ״מ` : `${w}×${h} מ״מ`;
}

export function StampCard({
  card,
  inputId,
  onChange,
  onFix,
  onInk,
  onRemove,
}: {
  card: StampCardData;
  inputId: string;
  onChange: (p: Partial<StampCardData>) => void;
  onFix: (text: string) => void;
  onInk: (ink: string) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  // Focus only when the customer opened the row, not when it opened by itself after a question.
  const wantFocus = useRef(false);
  const fixOpen = card.panel === 'fix';
  const { stamp } = card;
  const body = stamp?.bodies.find((b) => b.slug === card.body);
  const total = cardTotal(card);
  const blocked = stamp != null && !stamp.orderable;
  // The bot often says the same thing as `why`; print it once.
  const reply = blocked && card.reply.trim() === stamp?.why.trim() ? '' : card.reply;

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (wantFocus.current) {
      wantFocus.current = false;
      el.focus();
    }
  }, [text, fixOpen]);

  function send() {
    const t = text.trim();
    if (!t || card.busy || card.inking) return;
    setText('');
    onFix(t);
  }

  // Desktop: a low, wide card once the stamp is ready - a narrow fixed stamp column (stamp, messages, actions)
  // on the right (first in RTL), the options filling the rest on the left. Phones: one column; the stamp column
  // dissolves (display: contents) so `order` puts the options under the messages, and the fix form and actions after them.
  return (
    <li
      className={`card flex flex-col p-4 ${stamp && !blocked ? 'sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:items-start sm:gap-5' : ''}`}
    >
      <div className="contents sm:flex sm:flex-col">
        {(stamp || card.busy) && (
          <div className="grid aspect-[3/2] place-items-center rounded-xl bg-[#fdfcf8] p-4">
            {stamp ? (
              <img
                src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stamp.svg)}
                alt="החותמת שלכם"
                className={`h-full w-full object-contain transition ${card.busy || card.inking ? 'opacity-40' : ''}`}
              />
            ) : (
              <div className="h-full w-full animate-pulse rounded-lg bg-line/40" />
            )}
          </div>
        )}

        {stamp && blocked && <p className="mt-1.5 text-sm text-ink">{stamp.why}</p>}

        {stamp && !blocked && (
          <p className="mt-1.5 text-sm text-ink">
            {body ? (
              <>
                {body.title} · {sizeLabel(stamp)}
                {card.qty > 1 && ` · ${card.qty} יח׳`} · <span className="font-semibold tabular-nums">{formatPrice(total)}</span>
              </>
            ) : (
              <span className="text-muted">המידה הזו לא זמינה כרגע</span>
            )}
          </p>
        )}

        {/* While a turn runs the faded image or the pulsing placeholder says the stamp is being made. */}
        {!card.busy &&
          (card.err ? (
            <p className="mt-1.5 text-sm font-medium text-bad">{card.err}</p>
          ) : (
            reply && <p className="mt-1.5 text-sm text-muted">{reply}</p>
          ))}

        {fixOpen && (
          <form
            className="order-2 mt-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
              מה לשנות בחותמת הזו?
            </label>
            <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-1.5 ps-3 transition focus-within:border-blue focus-within:ring-4 focus-within:ring-blue/10">
              <textarea
                ref={area}
                id={inputId}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                className="max-h-28 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-[15px] leading-6 outline-none focus-visible:outline-none"
              />
              <button
                type="submit"
                disabled={card.busy || card.inking}
                aria-label="שליחת התיקון"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue text-white transition hover:bg-blue-600 active:scale-[0.96] disabled:opacity-60"
              >
                <Icon name="arrowLeft" size={16} strokeWidth={2.25} />
              </button>
            </div>
          </form>
        )}

        <div className="order-2 mt-auto flex gap-4 pt-1 text-sm font-medium">
          <button
            type="button"
            aria-expanded={fixOpen}
            aria-controls={fixOpen ? inputId : undefined}
            onClick={() => {
              wantFocus.current = !fixOpen;
              onChange({ panel: fixOpen ? null : 'fix' });
            }}
            className="min-h-10 text-blue hover:underline"
          >
            תיקון
          </button>
          <button type="button" onClick={onRemove} className="min-h-10 text-muted hover:text-ink hover:underline">
            הסרה
          </button>
        </div>
      </div>

      {stamp && !blocked && (
        <StampOptions
          stamp={stamp}
          body={card.body}
          qty={card.qty}
          busy={card.busy}
          inking={card.inking}
          onBody={(slug) => onChange({ body: slug })}
          onQty={(qty) => onChange({ qty })}
          onInk={onInk}
        />
      )}
    </li>
  );
}
