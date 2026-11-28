'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { addToCart } from '@/lib/cart-store';
import { formatPrice } from '@/lib/format';
import { motionReduced } from '@/lib/motion';
import { frameStamp, inkStamp, orderLines, warmStamps } from '@/stamp-bot/api';
import type { CardResult, OrderAsk, Stamp } from '@/stamp-bot/card-types';
import type { Msg } from '@/stamp-bot/form';
import { enterSends, SLOW_MS, statusLine, takeJobs, type Job } from './stamp-box-logic';
import { cardTotal, pickBody, StampCard, type StampCardData } from './StampCard';

const PLACEHOLDER = 'לדוגמה: ישראל ישראלי, עורך דין, מ.ר. 12345, הרצל 1 תל אביב, 050-1234567';
const PLACEHOLDER_MORE = 'להוסיף עוד חותמת…';
const UNAVAILABLE = 'הבוט לא זמין כרגע';
const TIMED_OUT = 'הבוט לא ענה בזמן';
const INK_FAILED = 'לא הצלחנו להחליף צבע, נסו שוב';
const FRAME_FAILED = 'לא הצלחנו לשנות את המסגרת, נסו שוב';
const ORDER_FAILED = 'לא הצלחנו להעביר לסל, נסו שוב';
const MAX_RUNNING = 3;
const TURN_MS = 60_000; // one card's turn, from the moment it starts running (not while it waits its turn)
const SPLIT_MS = 30_000; // the split; after it the whole message goes on as one stamp

// The box is rendered twice on the page; the model processes need booting only once per page.
let warmed = false;

/** A message the customer sent from the main box; its cards sit under it. */
type Sent = { id: string; text: string };

// The two long bot calls are routes, not server actions: Next runs a page's server actions one after the other.
async function post<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** The customer's own message above its cards: muted, two lines at most, with a toggle when it is longer. */
function SentText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setLong(el.scrollHeight > el.clientHeight + 1);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, text]);

  return (
    <div className="text-sm text-muted">
      <p ref={ref} className={`whitespace-pre-line break-words ${open ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      {(long || open) && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mt-0.5 text-[13px] font-medium text-blue hover:underline">
          {open ? 'הצגה מקוצרת' : 'הצגת הכול'}
        </button>
      )}
    </div>
  );
}

/**
 * The home page's single action, styled like a chat input: a growing box and a round send arrow.
 * Every message becomes one or more new stamp cards under it; each card is corrected inside itself.
 * Rendered twice (first screen and closing section), so every id is built from `idPrefix`.
 */
export function StampBox({ idPrefix, focusOnLoad = false }: { idPrefix: string; focusOnLoad?: boolean }) {
  const [text, setText] = useState('');
  const [cards, setCards] = useState<StampCardData[]>([]);
  const [sent, setSent] = useState<Sent[]>([]);
  const [splitting, setSplitting] = useState(''); // id of the message being split, '' when none
  const [splitErr, setSplitErr] = useState('');
  // A ref as well as state: two quick Enters can land before the re-render that disables the button.
  const splitRunning = useRef(false);
  const splitCall = useRef<AbortController | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const textId = `${idPrefix}-text`;
  const cardDomId = (id: string) => `${idPrefix}-card-${id}`;
  const placeholder = cards.length ? PLACEHOLDER_MORE : PLACEHOLDER;
  const router = useRouter();
  const [ordering, setOrdering] = useState(false);
  const [orderErr, setOrderErr] = useState('');
  const orderRunning = useRef(false);
  const scrollTo = useRef(''); // a card to bring into view once it shows its order error

  // The order so far: only orderable cards that have a body and so a price. Exactly these go to the cart.
  const priced = cards.flatMap((c) => {
    const total = cardTotal(c);
    return total == null || !c.stamp ? [] : [{ card: c, stamp: c.stamp, total }];
  });
  const count = priced.reduce((n, p) => n + p.card.qty, 0);
  const sum = Math.round(priced.reduce((s, p) => s + p.total, 0) * 100) / 100;
  // Stamps on screen that will not go with the order (not orderable yet, or no body at this size).
  const left = cards.filter((c) => c.stamp && cardTotal(c) == null).length;
  // A card still changing could send an outdated drawing or price.
  const settling = cards.some((c) => c.busy || c.inking);

  // The turn queue: at most MAX_RUNNING bot calls at once for this box, the rest wait in order.
  const queue = useRef<Job[]>([]);
  const running = useRef(0);
  const calls = useRef(new Map<string, AbortController>()); // the running turns, by card id
  const alive = useRef(new Set<string>()); // ids of cards still on screen
  const inking = useRef(new Set<string>()); // ids of cards with an ink redraw in flight
  const nextId = useRef(0);

  // The run behind the status line: it starts when the box goes from idle to busy and ends when nothing is busy.
  const [run, setRun] = useState<{ start: number; ids: string[] } | null>(null);
  const [slowRun, setSlowRun] = useState(0); // the start of the run that passed SLOW_MS
  const active = !!splitting || cards.some((c) => c.busy);
  const join = useCallback((id?: string) => {
    setRun((r) => {
      const cur = r ?? { start: Date.now(), ids: [] };
      return id && !cur.ids.includes(id) ? { ...cur, ids: [...cur.ids, id] } : cur;
    });
  }, []);
  useEffect(() => {
    if (!active) setRun(null);
  }, [active]);
  const runStart = run?.start;
  useEffect(() => {
    if (runStart == null) return;
    const t = setTimeout(() => setSlowRun(runStart), Math.max(0, runStart + SLOW_MS - Date.now()));
    return () => clearTimeout(t);
  }, [runStart]);
  const runCards = run ? cards.filter((c) => run.ids.includes(c.id)) : [];
  const status =
    run && active
      ? statusLine({ splitting: !!splitting, total: runCards.length, ready: runCards.filter((c) => !c.busy && !c.err).length, slow: slowRun === run.start })
      : '';

  const patch = useCallback((id: string, p: Partial<StampCardData>) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  }, []);

  const pump = useCallback(() => {
    const { start, rest } = takeJobs(queue.current, running.current, MAX_RUNNING, (id) => alive.current.has(id));
    queue.current = rest;
    for (const job of start) {
      running.current++;
      const call = new AbortController();
      calls.current.set(job.id, call);
      let late = false;
      const timer = setTimeout(() => {
        late = true;
        call.abort();
      }, TURN_MS);
      patch(job.id, { running: true });
      post<CardResult>('/api/stamp-bot/turn/', { msgs: job.msgs }, call.signal)
        .then((res) => {
          if (!alive.current.has(job.id)) return;
          if (res.err) {
            patch(job.id, { busy: false, running: false, err: res.msg === TIMED_OUT ? TIMED_OUT : UNAVAILABLE, retry: true });
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
                    running: false,
                    err: '',
                    retry: false,
                    msgs: [...job.msgs, { role: 'ai', text: reply, form: stamp?.form }],
                    // Show the bot's text only when it returned no stamp: then it is a question or a refusal the
                    // customer must answer. With a stamp the image says it; the full text stays in `msgs`.
                    reply: stamp ? '' : reply,
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
          // Aborted by the timer: the time ran out. Anything else (network, 429, a removed card): unavailable.
          if (alive.current.has(job.id)) patch(job.id, { busy: false, running: false, err: late ? TIMED_OUT : UNAVAILABLE, retry: true });
        })
        .finally(() => {
          clearTimeout(timer);
          calls.current.delete(job.id);
          running.current--;
          pump();
        });
    }
  }, [patch]);

  const enqueue = useCallback(
    (id: string, msgs: Msg[]) => {
      queue.current.push({ id, msgs });
      join(id);
      pump();
    },
    [join, pump],
  );

  // A page left mid-turn stops the bot's calls on the server too.
  useEffect(() => {
    const live = calls.current;
    return () => {
      for (const call of live.values()) call.abort();
      splitCall.current?.abort();
    };
  }, []);

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

  // After an order error lands on its cards, bring the first of them into view.
  useEffect(() => {
    const id = scrollTo.current;
    if (!id) return;
    scrollTo.current = '';
    document.getElementById(id)?.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'center' });
  }, [cards]);

  // Everything typed in the main box is a new stamp; it never corrects a card.
  async function send() {
    const t = text.trim();
    if (!t || splitRunning.current) return;
    splitRunning.current = true;
    const group = `m${++nextId.current}`;
    setText('');
    setSplitErr('');
    setSent((ss) => [...ss, { id: group, text: t }]);
    setSplitting(group);
    join();
    const call = new AbortController();
    splitCall.current = call;
    let late = false;
    const timer = setTimeout(() => {
      late = true;
      call.abort();
    }, SPLIT_MS);
    // null = the split failed; [] = no usable piece, the whole message is one stamp
    let pieces: string[] | null = null;
    try {
      const got = await post<unknown>('/api/stamp-bot/split/', { text: t }, call.signal);
      pieces = (Array.isArray(got) ? got : [])
        .filter((p): p is string => typeof p === 'string')
        .map((p) => p.trim())
        .filter(Boolean);
    } catch {
      // Too slow: go on with the whole message as one stamp, as the server does when it is unsure.
      if (late) pieces = [];
    }
    clearTimeout(timer);
    splitCall.current = null;
    splitRunning.current = false;
    setSplitting('');
    if (!pieces) {
      setSplitErr(UNAVAILABLE);
      setSent((ss) => ss.filter((s) => s.id !== group));
      // Give the customer their text back instead of losing it.
      setText((cur) => cur || t);
      return;
    }
    const jobs = (pieces.length ? pieces : [t]).map((piece): Job => {
      const id = String(++nextId.current);
      alive.current.add(id);
      return { id, msgs: [{ role: 'user', text: piece }] };
    });
    setCards((cs) => [
      ...cs,
      ...jobs.map(
        (j): StampCardData => ({
          id: j.id,
          group,
          msgs: j.msgs,
          stamp: null,
          body: '',
          qty: 1,
          reply: '',
          err: '',
          retry: false,
          orderErr: '',
          busy: true,
          running: false,
          inking: false,
          panel: null,
        }),
      ),
    ]);
    jobs.forEach((j) => enqueue(j.id, j.msgs));
  }

  function fix(card: StampCardData, t: string) {
    // A correction waits for an ink redraw, so it carries the form in the ink on screen.
    if (inking.current.has(card.id)) return;
    // The customer message carries the form as it is on screen now, so the model continues from it.
    // On an error the customer message stays in the list, as in the reference client.
    const next: Msg[] = [...card.msgs, { role: 'user', text: t, form: card.stamp?.form }];
    patch(card.id, { msgs: next, busy: true, err: '', retry: false, orderErr: '' });
    enqueue(card.id, next);
  }

  // The same turn again after an error: the card's last message (its first text, or the failed correction) with
  // the same history. The previous stamp, if any, stays on screen meanwhile.
  function retry(card: StampCardData) {
    if (card.busy || inking.current.has(card.id) || card.msgs.at(-1)?.role !== 'user') return;
    patch(card.id, { busy: true, err: '', retry: false, orderErr: '' });
    enqueue(card.id, card.msgs);
  }

  // Redraw the same stamp in another ink or frame, without the model.
  async function redraw(card: StampCardData, draw: (form: string) => Promise<Stamp | null>, failed: string) {
    const cur = card.stamp;
    if (!cur || card.busy || inking.current.has(card.id)) return;
    inking.current.add(card.id);
    patch(card.id, { inking: true, err: '', retry: false, orderErr: '' });
    const next: Stamp | null = await draw(cur.form).catch(() => null);
    inking.current.delete(card.id);
    if (!alive.current.has(card.id)) return;
    setCards((cs) =>
      cs.map((c): StampCardData =>
        c.id !== card.id
          ? c
          : next
            ? { ...c, inking: false, stamp: next, body: pickBody(next, c.body) }
            : { ...c, inking: false, err: failed },
      ),
    );
  }

  function changeInk(card: StampCardData, ink: string) {
    if (ink !== card.stamp?.ink) void redraw(card, (form) => inkStamp(form, ink), INK_FAILED);
  }

  function changeFrame(card: StampCardData, on: boolean) {
    if (card.stamp?.frame != null && on !== card.stamp.frame) void redraw(card, (form) => frameStamp(form, on), FRAME_FAILED);
  }

  function remove(id: string) {
    alive.current.delete(id);
    inking.current.delete(id);
    queue.current = queue.current.filter((j) => j.id !== id);
    calls.current.get(id)?.abort(); // the server stops working on it
    setCards((cs) => cs.filter((c) => c.id !== id));
  }

  // The server builds the cart lines (it redraws each stamp and reads the catalog); the browser only adds them.
  async function order() {
    if (orderRunning.current || settling || !priced.length) return;
    orderRunning.current = true;
    setOrdering(true);
    setOrderErr('');
    setCards((cs) => cs.map((c) => (c.orderErr ? { ...c, orderErr: '' } : c)));
    const sentIds = priced.map((p) => p.card.id);
    const asks = priced.map(({ card, stamp }): OrderAsk => ({ id: card.id, form: stamp.form, slug: card.body, ink: stamp.ink, quantity: card.qty }));
    try {
      const res = await orderLines(asks);
      if (res.err) {
        setOrderErr(res.msg);
        // Each stamp that did not go through says why on its own card; the first of them is brought into view.
        const bad = new Map((res.cards ?? []).map((m) => [m.id, m.msg]));
        const first = sentIds.find((id) => bad.has(id));
        if (first) {
          scrollTo.current = cardDomId(first);
          setCards((cs) => cs.map((c) => (bad.has(c.id) ? { ...c, orderErr: bad.get(c.id)! } : c)));
        }
      } else {
        res.lines.forEach((line) => addToCart(line));
        sentIds.forEach(remove);
        router.push('/cart/?added=' + res.lines.length);
      }
    } catch {
      setOrderErr(ORDER_FAILED);
    }
    orderRunning.current = false;
    setOrdering(false);
  }

  // The messages that still have cards (or are being split now), each with its cards under it.
  const groups = sent
    .map((s) => ({ ...s, cards: cards.filter((c) => c.group === s.id) }))
    .filter((g) => g.cards.length || g.id === splitting);

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
              if (enterSends(e)) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={placeholder}
            className="max-h-40 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-[17px] leading-7 outline-none placeholder:text-muted/70 focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={!!splitting}
            aria-label="הכינו לי חותמת"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue text-white transition hover:bg-blue-600 active:scale-[0.96] disabled:opacity-60"
          >
            <Icon name="arrowLeft" size={20} strokeWidth={2.25} />
          </button>
        </div>
      </form>
      <div aria-live="polite">
        {status && <p className="mt-4 text-center text-sm text-muted">{status}</p>}
        {!splitting && splitErr && <p className="mt-4 text-center text-sm font-medium text-ink">{splitErr}</p>}
      </div>
      {groups.length > 0 && (
        <div className="mt-4 grid gap-6">
          {groups.map((g) => (
            <div key={g.id}>
              <SentText text={g.text} />
              {g.cards.length > 0 && (
                <ul className="mt-2 grid gap-4">
                  {g.cards.map((c) => (
                    <StampCard
                      key={c.id}
                      card={c}
                      domId={cardDomId(c.id)}
                      inputId={`${idPrefix}-fix-${c.id}`}
                      onChange={(p) => patch(c.id, 'body' in p || 'qty' in p ? { ...p, orderErr: '' } : p)}
                      onFix={(t) => fix(c, t)}
                      onRetry={() => retry(c)}
                      onInk={(ink) => changeInk(c, ink)}
                      onFrame={(on) => changeFrame(c, on)}
                      onRemove={() => remove(c.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {priced.length > 0 && (
        <div className="mt-4">
          {/* One bar: the count and sum on the right, the order button on the left. */}
          <div className="card flex items-center justify-between gap-3 py-3 ps-5 pe-3 shadow-[0_8px_24px_-12px_rgba(11,20,38,.18)]">
            <p className="text-[15px] text-ink">
              <span className="font-bold">{count === 1 ? 'חותמת אחת' : `${count} חותמות`}</span> ·{' '}
              <span className="tabular-nums">{formatPrice(sum)}</span>
            </p>
            <button type="button" disabled={ordering || settling} onClick={() => void order()} className="btn-primary shrink-0">
              {ordering ? 'מעבירים לסל…' : 'המשך להזמנה'}
            </button>
          </div>
          {left > 0 && <p className="mt-2 text-center text-sm text-muted">{left === 1 ? 'חותמת אחת לא נכנסת להזמנה' : `${left} חותמות לא נכנסות להזמנה`}</p>}
          {orderErr && <p className="mt-2 text-center text-sm font-medium text-bad">{orderErr}</p>}
        </div>
      )}
    </div>
  );
}
