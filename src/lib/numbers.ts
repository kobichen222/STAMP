/** Number formatting shared by the admin dashboards (server and client). */
export const int = (n: number) => Math.round(n).toLocaleString('he-IL');
export const nis = (n: number) => `₪${int(n)}`;
export const pct = (n: number) => `${Math.round(n)}%`;
export const compact = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${+(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K` : int(n));
export const duration = (h: number | null) => (h === null ? '—' : h < 1 ? 'פחות משעה' : h < 36 ? `${Math.round(h)} שעות` : `${+(h / 24).toFixed(1)} ימים`);
