import { z } from 'zod';
import { INK_COLORS } from '@/designer/types';
import { addressNeed, type ShippingMethod } from '@/lib/pricing';

// Checkout validation shared by the server (POST /api/orders/, createOrder) and the checkout form.
// No server imports here: the form imports this file.

const designSchema = z
  .object({
    version: z.literal(1),
    modelId: z.string(),
    shape: z.enum(['rect', 'round']),
    width: z.number().positive().max(300),
    height: z.number().positive().max(300),
    border: z.object({ style: z.string(), thickness: z.number(), inset: z.number(), gap: z.number() }),
    elements: z.array(z.record(z.string(), z.unknown())).max(60),
    inkColor: z.enum(Object.keys(INK_COLORS) as [string, ...string[]]),
    dateBand: z.boolean().optional(),
    // A line from the stamp bot: its clean form as JSON (see Design.bot). The server redraws it for the files.
    bot: z.object({ form: z.string().min(2).max(8000) }).optional(),
  })
  .passthrough();

const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[\d\s+()-]{9,20}$/),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  company: z.string().trim().max(160).optional(),
  companyId: z.string().trim().max(20).optional(),
  poNumber: z.string().trim().max(60).optional(),
});

const addressSchema = z.object({ street: z.string().max(200), city: z.string().max(100), zip: z.string().max(12).optional(), notes: z.string().max(300).optional() });
const couponSchema = z.string().max(40).optional();
const notesSchema = z.string().max(2000).optional();

export const checkoutSchema = z.object({
  idempotencyKey: z.string().min(8).max(80),
  customer: customerSchema,
  shipping: z.object({
    method: z.string(),
    address: addressSchema.optional(),
  }),
  couponCode: couponSchema,
  notes: notesSchema,
  items: z
    .array(
      z.object({
        productSlug: z.string(),
        design: designSchema,
        ink: z.string(),
        bodyColor: z.string().max(20).optional(),
        quantity: z.number().int().min(1).max(500),
        designVersionId: z.string().max(80).optional(),
        addons: z.record(z.string(), z.number().int().min(0).max(50)).optional(),
      }),
    )
    .min(1)
    .max(50),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** The checkout form's fields that can carry a message. */
export type CheckoutField = 'name' | 'phone' | 'email' | 'company' | 'companyId' | 'poNumber' | 'street' | 'city' | 'zip' | 'notes' | 'coupon';
export const CHECKOUT_FIELDS: CheckoutField[] = ['name', 'phone', 'email', 'company', 'companyId', 'poNumber', 'street', 'city', 'zip', 'notes', 'coupon'];
export type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

/** What the customer reads, picked by why an existing rule failed (never a rule of its own). */
export const CHECKOUT_MESSAGES = {
  name: 'כתבו שם מלא',
  phoneEmpty: 'כתבו מספר טלפון, כדי שנוכל לעדכן אתכם',
  phoneLetters: 'כתבו ספרות בלבד, למשל 050-1234567',
  phoneShort: 'חסרות ספרות. מספר נייד הוא 10 ספרות, למשל 050-1234567',
  phoneLong: 'יש יותר מדי ספרות. מספר נייד הוא 10 ספרות',
  // The only reason left is a symbol the rule does not allow (a dot, a slash): the rule checks no prefix.
  phoneOther: 'יש במספר תו שאינו ספרה. כתבו ספרות בלבד, למשל 050-1234567',
  emailAt: 'בכתובת חסר התו @',
  emailSuffix: 'בכתובת חסרה סיומת, למשל .com',
  emailOther: 'כתובת האימייל לא תקינה. בדקו שוב',
  company: 'שם החברה ארוך מדי. קצרו ל-160 תווים',
  companyId: 'מספר ח.פ. ארוך מדי. כתבו עד 20 תווים',
  poNumber: 'מספר הזמנת הרכש ארוך מדי. כתבו עד 60 תווים',
  street: 'כתבו רחוב ומספר בית',
  streetLong: 'הכתובת ארוכה מדי. קצרו ל-200 תווים',
  city: 'כתבו עיר',
  cityLong: 'שם העיר ארוך מדי. קצרו ל-100 תווים',
  zip: 'המיקוד ארוך מדי. כתבו עד 12 תווים',
  notes: 'ההערה ארוכה מדי. קצרו ל-2,000 תווים',
  coupon: 'קוד הקופון ארוך מדי. בדקו אותו שוב',
} as const;

export type CheckoutValues = {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  companyId?: string;
  poNumber?: string;
  street?: string;
  city?: string;
  zip?: string;
  notes?: string;
  /** The applied coupon code. */
  coupon?: string;
  /** The chosen shipping method; unknown (undefined) skips the address rules, as createOrder rejects the method first. */
  shipping?: Pick<ShippingMethod, 'id' | 'address'>;
};

const fails = (schema: z.ZodType, value: unknown) => !schema.safeParse(value).success;

function phoneMessage(raw: string): string {
  const p = raw.trim();
  if (!p) return CHECKOUT_MESSAGES.phoneEmpty;
  if (/\p{L}/u.test(p)) return CHECKOUT_MESSAGES.phoneLetters;
  if (p.length < 9) return CHECKOUT_MESSAGES.phoneShort;
  if (p.length > 20) return CHECKOUT_MESSAGES.phoneLong;
  return CHECKOUT_MESSAGES.phoneOther;
}

function emailMessage(raw: string): string {
  const e = raw.trim();
  if (!e.includes('@')) return CHECKOUT_MESSAGES.emailAt;
  const domain = e.slice(e.lastIndexOf('@') + 1);
  const dot = domain.lastIndexOf('.');
  if (dot < 0 || domain.length - dot - 1 < 2) return CHECKOUT_MESSAGES.emailSuffix;
  return CHECKOUT_MESSAGES.emailOther;
}

/**
 * Every failing field of the checkout form with its message; an empty object when the form passes.
 * The pass/fail decision is the checkout schema itself plus createOrder's address rules for the method.
 */
export function checkoutFieldErrors(v: CheckoutValues): CheckoutFieldErrors {
  const out: CheckoutFieldErrors = {};
  const c = customerSchema.shape;
  if (fails(c.name, v.name ?? '')) out.name = CHECKOUT_MESSAGES.name;
  if (fails(c.phone, v.phone ?? '')) out.phone = phoneMessage(v.phone ?? '');
  if (v.email !== undefined && fails(c.email, v.email)) out.email = emailMessage(v.email);
  if (v.company && fails(c.company, v.company)) out.company = CHECKOUT_MESSAGES.company;
  if (v.companyId && fails(c.companyId, v.companyId)) out.companyId = CHECKOUT_MESSAGES.companyId;
  if (v.poNumber && fails(c.poNumber, v.poNumber)) out.poNumber = CHECKOUT_MESSAGES.poNumber;

  // The address is sent only when the method needs one; createOrder requires street + city ('full') or city ('city').
  const need = v.shipping ? addressNeed(v.shipping) : 'none';
  if (need !== 'none') {
    const a = addressSchema.shape;
    if (need === 'full' && !v.street) out.street = CHECKOUT_MESSAGES.street;
    else if (v.street && fails(a.street, v.street)) out.street = CHECKOUT_MESSAGES.streetLong;
    if (!v.city) out.city = CHECKOUT_MESSAGES.city;
    else if (fails(a.city, v.city)) out.city = CHECKOUT_MESSAGES.cityLong;
    if (need === 'full' && v.zip && fails(a.zip, v.zip)) out.zip = CHECKOUT_MESSAGES.zip;
  }

  if (v.notes && fails(notesSchema, v.notes)) out.notes = CHECKOUT_MESSAGES.notes;
  if (v.coupon && fails(couponSchema, v.coupon)) out.coupon = CHECKOUT_MESSAGES.coupon;
  return out;
}
