import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { Order } from './orders/types';

/**
 * Separate, machine-only credential. Never reuse admin cookies/passwords.
 * PRINT_AGENT_TOKEN must be a randomly generated secret (at least 32 chars).
 */
export function printAgentAuthorized(req: Request): boolean {
  const expected = process.env.PRINT_AGENT_TOKEN ?? '';
  const header = req.headers.get('authorization') ?? '';
  if (expected.length < 32 || !header.startsWith('Bearer ')) return false;
  const supplied = header.slice(7);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(supplied, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Never expose unapproved/failed jobs; unpaid manual work is opt-in. */
export function eligibleForPrintBridge(order: Order): boolean {
  if (order.status !== 'READY_FOR_PRODUCTION') return false;
  if (order.paymentStatus === 'paid') return true;
  return order.paymentMethod === 'manual' && process.env.PRINT_AGENT_ALLOW_UNPAID_MANUAL === 'true';
}
