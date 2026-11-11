import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eligibleForPrintBridge, printAgentAuthorized } from '@/server/print-agent';
import type { Order } from '@/server/orders/types';

const token = 'abcdefghijklmnopqrstuvwxyz1234567890-PRINT';
const example = (fields: Partial<Order> = {}): Order => ({
  status: 'READY_FOR_PRODUCTION',
  paymentStatus: 'paid',
  paymentMethod: 'tranzila',
  ...fields,
} as Order);

describe('printer bridge authorization', () => {
  beforeEach(() => vi.stubEnv('PRINT_AGENT_TOKEN', token));
  afterEach(() => vi.unstubAllEnvs());
  it('rejects missing machine token', () => {
    expect(printAgentAuthorized(new Request('https://example.test/api/print-agent/jobs/'))).toBe(false);
  });
  it('rejects incorrect machine token', () => {
    expect(printAgentAuthorized(new Request('https://example.test', { headers: { Authorization: 'Bearer WRONG' } }))).toBe(false);
  });
  it('accepts correct machine token', () => {
    expect(printAgentAuthorized(new Request('https://example.test', { headers: { Authorization: 'Bearer ' + token } }))).toBe(true);
  });
  it('rejects unconfigured and short tokens', () => {
    vi.stubEnv('PRINT_AGENT_TOKEN', 'short');
    expect(printAgentAuthorized(new Request('https://example.test', { headers: { Authorization: 'Bearer short' } }))).toBe(false);
  });
});
describe('printer bridge eligibility', () => {
  beforeEach(() => vi.stubEnv('PRINT_AGENT_ALLOW_UNPAID_MANUAL', 'false'));
  afterEach(() => vi.unstubAllEnvs());
  it('accepts approved and paid orders', () => {
    expect(eligibleForPrintBridge(example())).toBe(true);
  });
  it('rejects pending, cancelled, already-in-production and unapproved orders', () => {
    for (const status of ['PAYMENT_PENDING', 'CANCELLED', 'AWAITING_APPROVAL', 'IN_PRODUCTION'] as const) {
      expect(eligibleForPrintBridge(example({ status }))).toBe(false);
    }
  });
  it('does not print unpaid manual-payment orders by default', () => {
    expect(eligibleForPrintBridge(example({ paymentStatus: 'unpaid', paymentMethod: 'manual' }))).toBe(false);
  });
  it('allows manual payments only after explicit opt-in', () => {
    vi.stubEnv('PRINT_AGENT_ALLOW_UNPAID_MANUAL', 'true');
    expect(eligibleForPrintBridge(example({ paymentStatus: 'unpaid', paymentMethod: 'manual' }))).toBe(true);
    expect(eligibleForPrintBridge(example({ paymentStatus: 'unpaid', paymentMethod: 'tranzila' }))).toBe(false);
  });
});
