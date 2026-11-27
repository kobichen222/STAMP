'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatPrice } from '@/lib/format';
import { inkStamp, splitStamps, stampTurn, warmStamps } from '@/stamp-bot/api';
import type { Stamp } from '@/stamp-bot/card-types';
import type { Msg } from '@/stamp-bot/form';
import { cardTotal, pickBody, StampCard, type StampCardData } from './StampCard';

const PLACEHOLDER = 'לדוגמה: ישראל ישראלי, עורך דין, מ.ר. 12345, הרצל 1 תל אביב, 050-1234567';
const PLACEHOLDER_MORE = 'להוסיף עוד חותמת…';
const UNAVAILABLE = 'הבוט לא זמין כרגע';
const INK_FAILED = 'לא הצלחנו להחליף צבע, נסו שוב';
const MAX_RUNNING = 3;

// The box is rendered twice on the page; the model processes need booting only once per page.
let warmed = false;

type Job = { id: string; msgs: Msg[] };

/**
 * The home page's single action, styled like a chat input: a growing box and a round send arrow.
 * Every message becomes one or more new stamp cards under it; each card is corrected inside itself.
 * Rendered twice (first screen and closing section), so every id is built from `idPrefix`.
 */
export function StampBox({ idPrefix, focusOnLoad = false }: { idPrefix: string; focusOnLoad?: boolean }) {
  const [text, setText] = useState('');
  const [cards, setCards] = useState<StampCardData[]>([]);
  const [splitting, setSplitting] = useState(false);
  const [splitErr, setSplitErr] = useState('');
  // A ref as well as state: two quick Enters can land before the re-render that disables the button.
  const splitRunning = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const textId = `${idPrefix}-text`;
  const placeholder = cards.length ? PLACEHOLDER_MORE : PLACEHOLDER;

  // The order so far: only cards that have a body and so a price.
  const priced = cards.flatMap((c) => {
    const total = cardTotal(c);
    return total == null ? [] : [{ qty: c.qty, total }];
  });
  const count = priced.reduce((n, p) => n + p.qty, 0);
  const sum = Math.round(priced.reduce((s, p) => s + p.total, 0) * 100) / 100;

  // The turn queue: at most MAX_RUNNING bot calls at once for this box, the rest wait in order.
  const queue = useRef<Job[]>([]);
  const running = useRef(0);
  const alive = useRef(new Set<string>()); // ids of cards still on screen
  const inking = useRef(new Set<string>()); // ids of cards with an ink redraw in flight
  const nextId = useRef(0);

  const patch = useCallback((id: string, p: Partial<StampCardData>) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  }, []);

  const pump = useCallback(() => {
    while (running.current < MAX_RUNNING && queue.current.length) {
      const job = queue.current.shift()!;
      if (!alive.current.has(job.id)) continue;
      running.current++;
      stampTurn(job.msgs)
        .then((res) => {
          if (!alive.current.has(job.id)) return;
          if (res.err) {
            patch(job.id, { busy: false, err: res.msg });
            return;
          }
          const { stamp, text: reply } = res;
          setCards((cs) =>
            cs.map((c): StampCardData =>
              c.id !== job.id
                ? c
                : {
                    ...c,
                    busy: false,
                    err: '',
                    msgs: [...job.msgs, { role: 'ai', text: reply, form: stamp?.form }],
                    reply,
                    // No stamp: keep the previous stamp, body and quantity.
                    stamp: stamp ?? c.stamp,
                    body: stamp ? pickBody(stamp, c.body) : c.body,
                    // No stamp means the bot asked or declined: open the row so the customer can answer.
                    panel: stamp ? null : 'fix',
                  },
            ),
          );
        })
        .catch(() => {
          if (alive.current.has(job.id)) patch(job.id, { busy: false, err: UNAVAILABLE });
        })
        .finally(() => {
          running.current--;
          pump();
        });
    }
  }, [patch]);

  const enqueue = useCallback(
    (id: string, msgs: Msg[]) => {
      queue.current.push({ id, msgs });
      pump();
    },
    [pump],
  );

  // Grow with the text (the CSS max height caps it at about five lines, then it scrolls).
  // While empty, size to the placeholder so it is never cut off on narrow screens; rows={2} keeps two lines.
  const grow = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    if (el.value) {
      el.style.height = `${el.scrollHeight}px`;
      return;
    }
    el.value = el.placeholder;
    const h = el.scrollHeight;
    el.value = '';
    el.style.height = `${h}px`;
  }, []);

  useEffect(() => {
    grow();
    window.addEventListener('resize', grow);
    return () => window.removeEventListener('resize', grow);
  }, [grow]);
  useEffect(grow, [text, placeholder, grow]);

  // Desktop only (fine pointer + hover), so a phone keyboard never opens by itself; and only when the
  // page was opened at its top without a hash, so a visitor arriving at /#stamps is not pulled away.
  useEffect(() => {
    if (!focusOnLoad || window.location.hash || window.scrollY > 0) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    area.current?.focus({ preventScroll: true });
  }, [focusOnLoad]);

  // Everything typed in the main box is a new stamp; it never corrects a card.
  async function send() {
    const t = text.trim();
    if (!t || splitRunning.current) return;
    splitRunning.current = true;
    setText('');
    setSplitErr('');
    setSplitting(true);
    try {
      const pieces = (await splitStamps(t)).map((p) => p.trim()).filter(Boolean);
      const jobs = (pieces.length ? pieces : [t]).map((piece): Job => {
        const id = String(++nextId.current);
        alive.current.add(id);
        return { id, msgs: [{ role: 'user', text: piece }] };
      });
      setCards((cs) => [
        ...cs,
        ...jobs.map(
          (j): StampCardData => ({ id: j.id, msgs: j.msgs, stamp: null, body: '', qty: 1, reply: '', err: '', busy: true, inking: false, panel: null }),
        ),
      ]);
      jobs.forEach((j) => enqueue(j.id, j.msgs));
    } catch {
      setSplitErr(UNAVAILABLE);
      // Give the customer their text back instead of losing it.
      setText((cur) => cur || t);
    }
    splitRunning.current = false;
    setSplitting(false);
  }

  function fix(card: StampCardData, t: string) {
    // A correction waits for an ink redraw, so it carries the form in the ink on screen.
    if (inking.current.has(card.id)) return;
    // The customer message carries the form as it is on screen now, so the model continues from it.
    // On an error the customer message stays in the list, as in the reference client.
    const next: Msg[] = [...card.msgs, { role: 'user', text: t, form: card.stamp?.form }];
    patch(card.id, { msgs: next, busy: true, err: '' });
    enqueue(card.id, next);
  }

  // Redraw the same stamp in another ink, without the model.
  async function changeInk(card: StampCardData, ink: string) {
    const cur = card.stamp;
    if (!cur || card.busy || ink === cur.ink || inking.current.has(card.id)) return;
    inking.current.add(card.id);
    patch(card.id, { inking: true, err: '' });
    const next: Stamp | null = await inkStamp(cur.form, ink).catch(() => null);
    inking.current.delete(card.id);
    if (!alive.current.has(card.id)) return;
    setCards((cs) =>
      cs.map((c): StampCardData =>
        c.id !== card.id
          ? c
          : next
            ? { ...c, inking: false, stamp: next, body: pickBody(next, c.body) }
            : { ...c, inking: false, err: INK_FAILED },
      ),
    );
  }

  function remove(id: string) {
    alive.current.delete(id);
    inking.current.delete(id);
    queue.current = queue.current.filter((j) => j.id !== id);
    setCards((cs) => cs.filter((c) => c.id !== id));
  }

  return (
    <div>
      <form
        data-stamp-box
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor={textId} className="sr-only">
          מה לכתוב בחותמת?
        </label>
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-white p-2 ps-4 shadow-soft transition focus-within:border-blue focus-within:ring-4 focus-within:ring-blue/10">
          <textarea
            ref={area}
            id={textId}
            rows={2}
            value={text}
            onChange={(e) => {
              if (!warmed) {
                warmed = true;
                warmStamps().catch(() => {});
              }
              setText(e.target.value);
            }}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter starts a new line.
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={placeholder}
            className="max-h-40 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-[17px] leading-7 outline-none placeholder:text-muted/70 focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={splitting}
            aria-label="הכינו לי חותמת"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue text-white transition hover:bg-blue-600 active:scale-[0.96] disabled:opacity-60"
          >
            <Icon name="arrowLeft" size={20} strokeWidth={2.25} />
          </button>
        </div>
      </form>
      <div aria-live="polite">
        {splitting ? (
          <p className="mt-4 text-center text-sm text-muted">מכינים את החותמות…</p>
        ) : (
          splitErr && <p className="mt-4 text-center text-sm font-medium text-ink">{splitErr}</p>
        )}
        {cards.length > 0 && (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {cards.map((c) => (
              <StampCard
                key={c.id}
                card={c}
                inputId={`${idPrefix}-fix-${c.id}`}
                optsId={`${idPrefix}-opts-${c.id}`}
                onChange={(p) => patch(c.id, p)}
                onFix={(t) => fix(c, t)}
                onInk={(ink) => void changeInk(c, ink)}
                onRemove={() => remove(c.id)}
              />
            ))}
          </ul>
        )}
        {priced.length > 0 && (
          <p className="mt-4 text-center text-sm text-ink">
            {count === 1 ? 'חותמת אחת' : `${count} חותמות`} · סה״כ <span className="font-semibold tabular-nums">{formatPrice(sum)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
