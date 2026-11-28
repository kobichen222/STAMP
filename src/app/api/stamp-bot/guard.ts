import { NextResponse } from 'next/server';
import { rateLimit } from '@/server/rate-limit';
import { UNAVAILABLE } from '@/stamp-bot/serve';

/**
 * What a server action gets from Next for free, for the bot's two routes: a request sent from another site's page
 * (an Origin header that is not this host) is refused, and each IP has a generous per-minute limit.
 * A refusal answers with the card's "unavailable" sentence.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin GETs and non-browser clients send none; a browser's cross-site POST always does
  // The host the browser reached, as Next's own server-action check reads it (behind a proxy: x-forwarded-host).
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').split(',')[0].trim() || new URL(req.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false; // "null" (a sandboxed frame, a file) or garbage
  }
}

/** null = go on; otherwise the response to return. `name` keys the limit, `max` is per IP per minute. */
export function refuse(req: Request, name: string, max: number): Response | null {
  if (!sameOrigin(req)) return NextResponse.json({ err: true, msg: UNAVAILABLE }, { status: 403 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!rateLimit(`${name}:${ip}`, max, 60_000)) return NextResponse.json({ err: true, msg: UNAVAILABLE }, { status: 429 });
  return null;
}
