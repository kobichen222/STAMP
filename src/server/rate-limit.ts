/**
 * Best-effort in-memory rate limiter (per server instance). On Vercel each
 * function instance keeps its own window; for strict global limits plug in
 * Vercel KV / Upstash here.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const k of hits.keys()) if (!hits.get(k)!.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}
