// The home box's logic that needs no React: the status line under the box, the turn queue, and when Enter sends.
// Kept apart from the components so it can be tested on its own.
import type { Msg } from '@/stamp-bot/form';

/** After this long a run that has not finished says so on the status line. */
export const SLOW_MS = 30_000;

/**
 * The status line under the box while it works. A run starts when the box goes from idle to busy and ends when
 * nothing is busy; `total` = its stamps still on screen, `ready` = those done without an error. '' = no line.
 */
export function statusLine({ splitting, total, ready, slow }: { splitting: boolean; total: number; ready: number; slow: boolean }): string {
  const base = splitting
    ? 'מכינים את החותמות…'
    : total === 1
      ? 'מכינים את החותמת…'
      : total > 1
        ? ready > 0
          ? `${ready} מתוך ${total} מוכנות`
          : `מכינים ${total} חותמות`
        : '';
  return base && slow ? `${base} · לוקח יותר מהרגיל` : base;
}

/** One bot turn of one card, waiting in the queue: the card's id and the conversation to send. */
export type Job = { id: string; msgs: Msg[] };

/**
 * The jobs that may start now, in queue order, so that at most `max` run at once, and the queue left after them.
 * A job whose card is no longer on screen is dropped.
 */
export function takeJobs(queue: Job[], running: number, max: number, alive: (id: string) => boolean): { start: Job[]; rest: Job[] } {
  const start: Job[] = [];
  const rest: Job[] = [];
  for (const job of queue) {
    if (!alive(job.id)) continue;
    if (running + start.length < max) start.push(job);
    else rest.push(job);
  }
  return { start, rest };
}

/**
 * The list as drawn while removed items wait for their undo: each removed item back at the index it had, marked
 * `gone` (its strip is drawn there). The latest removal is put back first, so two removals from the same place
 * come back in their order.
 */
export function withHeld<T>(items: T[], held: { key: string; item: T; at: number }[]): { item: T; gone?: string }[] {
  const out: { item: T; gone?: string }[] = items.map((item) => ({ item }));
  for (const h of [...held].reverse()) out.splice(Math.min(Math.max(0, h.at), out.length), 0, { item: h.item, gone: h.key });
  return out;
}

/**
 * Whether this key press sends the message. Enter sends and Shift+Enter is a new line; on a touch phone (no hover,
 * coarse pointer) Enter is always a new line and only the arrow sends. Never while an IME is composing a word.
 */
export function enterSends(e: { key: string; shiftKey: boolean; nativeEvent: { isComposing: boolean } }): boolean {
  if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return false;
  return !window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}
