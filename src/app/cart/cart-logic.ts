// The cart page's pure rules: the green status line after the home page sends stamps, and putting a removed line back.

/** The green line at the top of the cart, from the `added` / `updated` query parameters, or null for none. */
export function cartStatusText(added: string | null, updated: string | null): string | null {
  // `added` keeps today's wording, and wins when both are there
  if (added) return Number(added) > 1 ? `${added} חותמות נוספו לסל` : 'החותמת נוספה לסל';
  const u = Number(updated);
  if (!updated || !(u >= 1)) return null;
  return u > 1 ? `${u} חותמות עודכנו בסל` : 'החותמת עודכנה בסל';
}

/** `list` with `item` put back at index `at` (clamped to the list). A line whose id is already there is not doubled. */
export function insertAt<T extends { id: string }>(list: T[], item: T, at: number): T[] {
  if (list.some((x) => x.id === item.id)) return list;
  const i = Math.max(0, Math.min(Number.isFinite(at) ? Math.floor(at) : list.length, list.length));
  return [...list.slice(0, i), item, ...list.slice(i)];
}
