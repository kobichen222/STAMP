/** The cart's delivery texts, from the live shipping methods. */
import { describe, expect, it } from 'vitest';
import { cartDeliveryText } from '@/app/cart/cart-logic';
import { DEFAULT_RULES, type ShippingMethod } from '@/lib/pricing';

const pickup: ShippingMethod = { id: 'pickup', label: 'איסוף עצמי – הרא״ה 3, רמת גן', price: 0, eta: '', address: 'none' };
const courier: ShippingMethod = { id: 'courier', label: 'שליח עד הבית', price: 35, eta: '', freeFrom: 300, address: 'full' };
const locker: ShippingMethod = { id: 'locker', label: 'איסוף מנקודת מסירה / לוקר', price: 25, eta: '', address: 'city' };
const express: ShippingMethod = { id: 'express', label: 'שליח עד 24 שעות', price: 60, eta: '', address: 'full' };

describe('cartDeliveryText', () => {
  it('the default rules: cheapest paid method, free pickup, and the courier threshold', () => {
    const t = cartDeliveryText(DEFAULT_RULES.shipping);
    expect(t.row).toBe('מ-₪25 · איסוף עצמי חינם');
    expect(t.freeAbove).toEqual(['שליח עד הבית חינם בהזמנה מעל ₪300']);
  });

  it('with a free method and a threshold', () => {
    expect(cartDeliveryText([pickup, courier, express])).toEqual({ row: 'מ-₪35 · איסוף עצמי חינם', freeAbove: ['שליח עד הבית חינם בהזמנה מעל ₪300'] });
  });

  it('without a free method', () => {
    expect(cartDeliveryText([courier, express])).toEqual({ row: 'מ-₪35', freeAbove: ['שליח עד הבית חינם בהזמנה מעל ₪300'] });
  });

  it('without a threshold', () => {
    expect(cartDeliveryText([pickup, express, locker])).toEqual({ row: 'מ-₪25 · איסוף עצמי חינם', freeAbove: [] });
    expect(cartDeliveryText([express])).toEqual({ row: 'מ-₪60', freeAbove: [] });
  });

  it('the threshold and prices follow the rules the admin set', () => {
    const t = cartDeliveryText([pickup, { ...courier, price: 39, freeFrom: 250 }, { ...express, freeFrom: 500 }]);
    expect(t.row).toBe('מ-₪39 · איסוף עצמי חינם');
    expect(t.freeAbove).toEqual(['שליח עד הבית חינם בהזמנה מעל ₪250', 'שליח עד 24 שעות חינם בהזמנה מעל ₪500']);
  });

  it('only free methods, or none at all', () => {
    expect(cartDeliveryText([pickup])).toEqual({ row: 'איסוף עצמי חינם', freeAbove: [] });
    expect(cartDeliveryText([])).toEqual({ row: 'יחושב בקופה', freeAbove: [] });
  });
});
