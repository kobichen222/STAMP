// The home box's cards in browser storage, so a refresh or a visit to the cart does not lose them, and a cart line of
// the bot opened back as a card. Pure functions (the storage is passed in), so they are tested without rendering.
// What is saved brings a card back, never its drawing or its price: the server redraws the stamp from its form (the
// same no-model redraw an ink change uses) and the price is computed from the catalog as always.
import type { CartItem } from '@/lib/cart-store';
import type { Msg } from '@/stamp-bot/form';
import type { StampCardData } from './StampCard';

/** A message the customer sent from the main box; its cards sit under it. text '' = a cart stamp, no echo above it. */
export type Sent = { id: string; text: string };

/** A box's cards, one key per box (the page has two), so the boxes never copy or lose each other's cards. */
export const cardsKey = (idPrefix: string) => `s2g-cards-${idPrefix}`;
/** Written by the cart's "עריכה": the id of the cart line to open as a card in the top box. */
export const EDIT_LINE_KEY = 's2g-edit-line';
/** A saved card older than this is dropped when the page loads. */
export const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

const VERSION = 1;
const MAX_FORM = 8000; // as the server reads a form (stamp-bot/card.ts)
const MAX_MSGS = 60; // as a turn reads the conversation (stamp-bot/turn.ts)
const MAX_TEXT = 5000;
const MAX_QTY = 500;

/** One card as saved. The ink and the frame ride in `form`, the form as it is on screen now. */
export type SavedCard = {
  v: typeof VERSION;
  id: string;
  group: string;
  text: string; // the sent message the card belongs to (the echo above it), '' for a cart stamp
  msgs: Msg[]; // the conversation with the forms, as a turn needs it
  form: string; // the form on screen now, '' = nothing drawn yet
  ink: string;
  body: string; // slug of the chosen model
  qty: number;
  line?: string; // the cart line this card edits
  unpin?: true; // a cart stamp whose first redraw (lineStamp) has not returned yet
  err?: string; // the card was in an error state
  retry?: true; // ...with its retry button
  at: number; // when it was saved
};

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** A card as it goes into storage. */
export function toSaved(card: StampCardData, text: string, now: number): SavedCard {
  const form = card.stamp?.form ?? card.restore?.form ?? '';
  const ink = card.stamp?.ink ?? card.restore?.ink ?? '';
  // a turn waiting or running is not an error: it is brought back by its last message, which is the customer's
  const err = card.busy ? '' : card.err;
  return {
    v: VERSION,
    id: card.id,
    group: card.group,
    text,
    msgs: card.msgs.map((m): Msg => (m.form ? { role: m.role, text: m.text, form: m.form } : { role: m.role, text: m.text })),
    form,
    ink,
    body: card.body,
    qty: card.qty,
    ...(card.line ? { line: card.line } : {}),
    ...(!card.stamp && card.restore?.unpin ? { unpin: true as const } : {}),
    ...(err ? { err } : {}),
    ...(err && card.retry ? { retry: true as const } : {}),
    at: now,
  };
}

const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

function readMsg(m: unknown): Msg | null {
  if (!m || typeof m !== 'object') return null;
  const r = m as Record<string, unknown>;
  if ((r.role !== 'user' && r.role !== 'ai') || !str(r.text, MAX_TEXT)) return null;
  if (r.form !== undefined && !str(r.form, MAX_FORM)) return null;
  return r.form ? { role: r.role, text: r.text, form: r.form as string } : { role: r.role, text: r.text };
}

/** One stored record -> a card to bring back, or null when it cannot be read, is of an old shape, or is too old. */
export function readSaved(raw: unknown, now: number): SavedCard | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== VERSION) return null;
  if (typeof r.at !== 'number' || !Number.isFinite(r.at) || now - r.at > KEEP_MS) return null;
  if (!str(r.id, 64) || !r.id || !str(r.group, 64) || !r.group || !str(r.text, MAX_TEXT)) return null;
  if (!str(r.form, MAX_FORM) || !str(r.ink, 20) || !str(r.body, 200)) return null;
  if (!Array.isArray(r.msgs) || r.msgs.length > MAX_MSGS) return null;
  const msgs = r.msgs.map(readMsg);
  if (msgs.some((m) => !m)) return null;
  if (!r.form && !msgs.length) return null; // nothing to bring back
  if (r.form && !r.ink) return null;
  const qty = typeof r.qty === 'number' && Number.isInteger(r.qty) ? Math.min(MAX_QTY, Math.max(1, r.qty)) : 1;
  const err = str(r.err, 200) ? r.err : '';
  return {
    v: VERSION,
    id: r.id,
    group: r.group,
    text: r.text,
    msgs: msgs as Msg[],
    form: r.form,
    ink: r.ink,
    body: r.body,
    qty,
    ...(str(r.line, 64) && r.line ? { line: r.line } : {}),
    ...(r.unpin === true && r.form ? { unpin: true as const } : {}),
    ...(err ? { err } : {}),
    ...(err && r.retry === true ? { retry: true as const } : {}),
    at: r.at,
  };
}

/** The box's saved cards, in their order. Anything unreadable is dropped silently; no storage = no cards. */
export function readCards(store: Store | null, idPrefix: string, now: number): SavedCard[] {
  if (!store) return [];
  try {
    const raw: unknown = JSON.parse(store.getItem(cardsKey(idPrefix)) ?? '[]');
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    return raw.flatMap((r) => {
      const s = readSaved(r, now);
      if (!s || seen.has(s.id)) return [];
      seen.add(s.id);
      return [s];
    });
  } catch {
    return [];
  }
}

/** Replace the box's saved cards. A browser that refuses storage simply keeps the cards in memory only. */
export function writeCards(store: Store | null, idPrefix: string, cards: SavedCard[]) {
  if (!store) return;
  try {
    if (cards.length) store.setItem(cardsKey(idPrefix), JSON.stringify(cards));
    else store.removeItem(cardsKey(idPrefix));
  } catch {
    /* quota or private mode: as before this was saved */
  }
}

/**
 * What a saved card becomes on load. A card with a form is redrawn (static skeleton until then); a card whose last
 * message is the customer's and that has no error was waiting for the bot and goes back into the queue with that
 * message; a bot question with nothing drawn comes back with the question and its answer box; an error comes back
 * as it was, with its retry button.
 */
export function restoredCard(s: SavedCard): StampCardData {
  const last = s.msgs.at(-1);
  const wait = last?.role === 'user' && !s.err;
  const reply = last?.role === 'ai' && !last.form ? last.text : '';
  return {
    id: s.id,
    group: s.group,
    msgs: s.msgs,
    stamp: null,
    body: s.body,
    qty: s.qty,
    reply,
    err: s.err ?? '',
    retry: !!s.err && !!s.retry,
    orderErr: '',
    busy: wait,
    running: false,
    inking: false,
    panel: reply ? 'fix' : null,
    ...(s.line ? { line: s.line } : {}),
    ...(s.form ? { restore: { form: s.form, ink: s.ink, ...(s.unpin ? { unpin: true } : {}) } } : {}),
  };
}

/** The box's state from its saved cards: the cards in their order and the sent messages above them. */
export function restoreBox(saved: SavedCard[]): { cards: StampCardData[]; sent: Sent[] } {
  const sent: Sent[] = [];
  for (const s of saved) if (!sent.some((g) => g.id === s.group)) sent.push({ id: s.group, text: s.text });
  return { cards: saved.map(restoredCard), sent };
}

/**
 * The box's cards as they go into storage, each with the text of its sent message. A card saved before (`prev`) and
 * unchanged since keeps its saved-at time, so the 7 days count from its last change, not from the last visit.
 */
export function savedCards(cards: StampCardData[], sent: Sent[], now: number, prev: SavedCard[] = []): SavedCard[] {
  const same = (a: SavedCard, b: SavedCard) => JSON.stringify({ ...a, at: 0 }) === JSON.stringify({ ...b, at: 0 });
  return cards.map((c) => {
    const s = toSaved(c, sent.find((g) => g.id === c.group)?.text ?? '', now);
    const before = prev.find((p) => p.id === s.id);
    return before && same(before, s) ? { ...s, at: before.at } : s;
  });
}

/**
 * A cart line of the bot opened as a card, or null when the line is not the bot's. No messages: a correction carries
 * the form on screen (fix() puts it on the customer's message), and a turn reads the stamp from there, as on a card
 * the bot drew. The stamp itself comes from lineStamp, which loosens the size and look the line pinned.
 */
export function lineCard(item: CartItem, id: string, group: string): StampCardData | null {
  const form = item.design?.bot?.form;
  if (typeof form !== 'string' || !form) return null;
  return {
    id,
    group,
    msgs: [],
    stamp: null,
    body: item.productSlug ?? item.modelId,
    qty: item.quantity,
    reply: '',
    err: '',
    retry: false,
    orderErr: '',
    busy: false,
    running: false,
    inking: false,
    panel: null,
    line: item.id,
    restore: { form, ink: item.design.inkColor ?? item.ink, unpin: true },
  };
}

/** The cart page after ordering: how many lines were added and how many replaced; a count of 0 is left out. */
export function cartUrl(added: number, updated: number): string {
  const q = [added ? `added=${added}` : '', updated ? `updated=${updated}` : ''].filter(Boolean).join('&');
  return q ? `/cart/?${q}` : '/cart/';
}
