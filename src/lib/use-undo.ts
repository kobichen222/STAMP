'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** One removed item that can still be brought back. `at` is the index it had in its list. */
export type Removed<T> = { key: string; item: T; at: number };

/**
 * Remove with undo, shared by the home page cards and the cart lines.
 * The caller removes the item from its own list at once (so nothing "removed" can still be ordered) and hands it
 * to `hold`. For `ms` the item is listed in `waiting`, where the caller draws a strip with an undo button;
 * `take` gives it back and the caller re-inserts it. After `ms`, or on unmount, the removal is simply final.
 */
export function useUndo<T>(ms = 8000) {
  const [waiting, setWaiting] = useState<Removed<T>[]>([]);
  const list = useRef<Removed<T>[]>([]);
  const timers = useRef(new Map<string, number>());

  const drop = useCallback((key: string) => {
    const t = timers.current.get(key);
    if (t !== undefined) window.clearTimeout(t);
    timers.current.delete(key);
    list.current = list.current.filter((r) => r.key !== key);
    setWaiting(list.current);
  }, []);

  /** Start the undo window for an item the caller has just removed from its list. */
  const hold = useCallback(
    (key: string, item: T, at: number) => {
      drop(key);
      list.current = [...list.current, { key, item, at }];
      setWaiting(list.current);
      timers.current.set(
        key,
        window.setTimeout(() => drop(key), ms),
      );
    },
    [drop, ms],
  );

  /** Undo: returns the held item (undefined when its time already ran out) and ends its window. */
  const take = useCallback(
    (key: string): Removed<T> | undefined => {
      const found = list.current.find((r) => r.key === key);
      if (found) drop(key);
      return found;
    },
    [drop],
  );

  useEffect(() => {
    const all = timers.current;
    return () => {
      for (const t of all.values()) window.clearTimeout(t);
      all.clear();
    };
  }, []);

  return { waiting, hold, take };
}
