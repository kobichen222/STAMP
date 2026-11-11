/** How long an order has been waiting – shared by the admin cards and the morning report. */

/** "לפני 3 ש׳ ו-20 ד׳", "לפני יומיים ו-4 ש׳", "לפני 12 ד׳". */
export function ageText(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const days = d === 1 ? 'יום' : d === 2 ? 'יומיים' : `${d} ימים`;
  if (d > 0) return `לפני ${days}${h ? ` ו-${h} ש׳` : ''}`;
  if (h > 0) return `לפני ${h} ש׳${m ? ` ו-${m} ד׳` : ''}`;
  return `לפני ${Math.max(1, m)} ד׳`;
}

/** fresh: under a day · day: from a day · old: from 3 days. */
export function ageTone(iso: string, now = Date.now()): 'fresh' | 'day' | 'old' {
  const h = (now - Date.parse(iso)) / 3_600_000;
  return h >= 72 ? 'old' : h >= 24 ? 'day' : 'fresh';
}

/** "10.11, 22:00" in Israel time. */
export const orderTime = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
