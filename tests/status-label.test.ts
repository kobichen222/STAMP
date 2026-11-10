import { describe, expect, it } from 'vitest';
import { statusLabel } from '@/server/orders/types';

describe('statusLabel', () => {
  it('says ready for pickup for pickup orders', () => {
    expect(statusLabel('READY_FOR_SHIPPING', 'pickup')).toBe('מוכן לאיסוף');
    expect(statusLabel('READY_FOR_SHIPPING', 'courier')).toBe('מוכן למשלוח');
    expect(statusLabel('IN_PRODUCTION', 'pickup')).toBe('בייצור');
  });
});
