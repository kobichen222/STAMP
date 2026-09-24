'use client';

/**
 * The design the customer is currently working on. Opening the editor from any
 * product or size continues it (carried over to the new stamp) instead of
 * starting from scratch; it is closed once the stamp is added to the cart.
 */
const KEY = 's2g-active-design';

export function getActiveDraft(): string | null {
  try {
    return typeof window === 'undefined' ? null : localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setActiveDraft(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* private mode – drafts just don't carry over */
  }
}

export function clearActiveDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
