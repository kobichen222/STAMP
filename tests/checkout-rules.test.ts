import { describe, expect, it } from 'vitest';
import { CHECKOUT_MESSAGES as M, checkoutFieldErrors, type CheckoutValues } from '@/lib/checkout-rules';
import { DEFAULT_RULES } from '@/lib/pricing';

// The checkout form's messages: which field fails and why, by the same rules the server enforces.

const method = (id: string) => {
  const m = DEFAULT_RULES.shipping.find((s) => s.id === id);
  if (!m) throw new Error(`no shipping method ${id}`);
  return m;
};

const valid: CheckoutValues = { name: 'ישראל ישראלי', phone: '050-1234567', email: '', shipping: method('pickup') };
const errorsOf = (v: Partial<CheckoutValues>) => checkoutFieldErrors({ ...valid, ...v });

describe('checkout field messages', () => {
  it('a valid form has no messages', () => {
    expect(checkoutFieldErrors(valid)).toEqual({});
    expect(errorsOf({ email: 'a@example.com', shipping: method('courier'), street: 'הרצל 1', city: 'תל אביב', zip: '12345' })).toEqual({});
    expect(errorsOf({ shipping: method('locker'), street: '', city: 'חיפה' })).toEqual({});
  });

  it('name', () => {
    expect(errorsOf({ name: '' }).name).toBe(M.name);
    expect(errorsOf({ name: ' א ' }).name).toBe(M.name);
    expect(errorsOf({ name: 'א'.repeat(121) }).name).toBe(M.name);
  });

  it('phone', () => {
    expect(errorsOf({ phone: '' }).phone).toBe(M.phoneEmpty);
    expect(errorsOf({ phone: '   ' }).phone).toBe(M.phoneEmpty);
    expect(errorsOf({ phone: '050-12ab567' }).phone).toBe(M.phoneLetters);
    expect(errorsOf({ phone: '050-123' }).phone).toBe(M.phoneShort);
    expect(errorsOf({ phone: '0501234567890123456789' }).phone).toBe(M.phoneLong);
    expect(errorsOf({ phone: '050.123.4567' }).phone).toBe(M.phoneOther);
    expect(errorsOf({ phone: '+972 50 123 4567' }).phone).toBeUndefined();
  });

  it('email is checked only when something was typed', () => {
    expect(errorsOf({ email: '' }).email).toBeUndefined();
    expect(errorsOf({ email: undefined }).email).toBeUndefined();
    expect(errorsOf({ email: 'name.example.com' }).email).toBe(M.emailAt);
    expect(errorsOf({ email: 'name@example' }).email).toBe(M.emailSuffix);
    expect(errorsOf({ email: 'name@example.' }).email).toBe(M.emailSuffix);
    expect(errorsOf({ email: 'na me@example.com' }).email).toBe(M.emailOther);
  });

  it('other length limits say what to write', () => {
    expect(errorsOf({ company: 'x'.repeat(161) }).company).toBe(M.company);
    expect(errorsOf({ companyId: '1'.repeat(21) }).companyId).toBe(M.companyId);
    expect(errorsOf({ poNumber: 'x'.repeat(61) }).poNumber).toBe(M.poNumber);
    expect(errorsOf({ notes: 'x'.repeat(2001) }).notes).toBe(M.notes);
    expect(errorsOf({ coupon: 'x'.repeat(41) }).coupon).toBe(M.coupon);
  });

  it('every failing field is reported at once', () => {
    expect(Object.keys(checkoutFieldErrors({ name: '', phone: 'abc', email: 'x', shipping: method('courier'), street: '', city: '' }))).toEqual(['name', 'phone', 'email', 'street', 'city']);
  });
});

describe('address rules per shipping method', () => {
  it('pickup needs no address', () => {
    expect(errorsOf({ shipping: method('pickup'), street: '', city: '' })).toEqual({});
  });

  for (const id of ['courier', 'express', 'rush', 'gushdan']) {
    it(`${id} needs street and city`, () => {
      expect(errorsOf({ shipping: method(id), street: '', city: '' })).toEqual({ street: M.street, city: M.city });
      expect(errorsOf({ shipping: method(id), street: 'הרצל 1', city: '' })).toEqual({ city: M.city });
      expect(errorsOf({ shipping: method(id), street: '', city: 'חולון' })).toEqual({ street: M.street });
      expect(errorsOf({ shipping: method(id), street: 'x'.repeat(201), city: 'x'.repeat(101), zip: '1'.repeat(13) })).toEqual({ street: M.streetLong, city: M.cityLong, zip: M.zip });
    });
  }

  it('locker needs a city only', () => {
    expect(errorsOf({ shipping: method('locker'), street: '', city: '' })).toEqual({ city: M.city });
    expect(errorsOf({ shipping: method('locker'), street: 'x'.repeat(201), city: 'חיפה' })).toEqual({ street: M.streetLong });
  });

  it('an unknown method skips the address rules (the server refuses the method itself)', () => {
    expect(errorsOf({ shipping: undefined, street: '', city: '' })).toEqual({});
  });

  it('a method the admin added without an address setting needs a full address', () => {
    expect(errorsOf({ shipping: { id: 'new-courier' }, street: '', city: '' })).toEqual({ street: M.street, city: M.city });
  });
});
