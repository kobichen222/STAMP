'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { AdminSettings } from '@/lib/admin-settings';
import { saveSettings } from '@/server/settings';
import { requireStaff } from '@/server/staff';
import { listContacts, setContactHandled } from '@/server/store/neon';

const money = z.number().min(0).max(100000);
const pct = z.number().min(0).max(100);

const pricingSchema = z.object({
  ink: z.record(z.string(), money),
  frame: money,
  logo: money,
  onlineDesignPct: pct,
  rewardPct: pct,
  quantityTiers: z.array(z.object({ min: z.number().int().min(2).max(10000), discountPct: pct })).max(10),
  shipping: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        label: z.string().min(1).max(120),
        price: money,
        eta: z.string().max(80),
        freeFrom: money.optional(),
        active: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(10),
  addons: z.array(z.object({ id: z.enum(['ink-bottle', 'pad', 'extra-body', 'certified']), price: money.optional(), pctOfUnit: pct.optional(), active: z.boolean() })),
});

const couponsSchema = z
  .array(
    z.object({
      code: z.string().trim().min(2).max(40).regex(/^[\w-]+$/, 'קוד באותיות לועזיות, ספרות ומקף בלבד'),
      type: z.enum(['percent', 'fixed']),
      value: z.number().min(0).max(100000),
      minSubtotal: money.optional(),
      expiresAt: z.string().max(40).optional(),
      active: z.boolean(),
      note: z.string().max(200).optional(),
    }),
  )
  .max(200);

const productsSchema = z.record(z.string(), z.object({ price: money.nullable().optional(), hidden: z.boolean().optional() }));

const siteSchema = z.object({
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(200),
  address: z.string().trim().min(2).max(200),
  whatsappNumber: z.string().trim().regex(/^\+?\d{9,15}$/, 'מספר בפורמט בינלאומי, למשל 972501234567'),
  ordersEmail: z.string().trim().max(400),
  hours: z.string().trim().max(120),
  announcement: z.string().trim().max(240),
});

type Result = { ok: true } | { ok: false; error: string };

async function save<K extends keyof AdminSettings>(key: K, schema: z.ZodType<AdminSettings[K]>, value: unknown): Promise<Result> {
  await requireStaff(['admin']);
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' · ') };
  try {
    await saveSettings(key, parsed.data);
  } catch (e) {
    console.error(e);
    return { ok: false, error: 'השמירה נכשלה – בדקו את החיבור למסד הנתונים' };
  }
  // Every page picks the new values up immediately.
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function savePricing(v: unknown) {
  return save('pricing', pricingSchema as z.ZodType<AdminSettings['pricing']>, v);
}
export async function saveCoupons(v: unknown) {
  const r = couponsSchema.safeParse(v);
  if (r.success) {
    const codes = r.data.map((c) => c.code.toLowerCase());
    if (new Set(codes).size !== codes.length) return { ok: false, error: 'יש קוד קופון כפול' } as Result;
  }
  return save('coupons', couponsSchema as z.ZodType<AdminSettings['coupons']>, v);
}
export async function saveProducts(v: unknown) {
  return save('products', productsSchema as z.ZodType<AdminSettings['products']>, v);
}
export async function saveSite(v: unknown) {
  return save('site', siteSchema as z.ZodType<AdminSettings['site']>, v);
}

export async function markLead(id: number, handled: boolean) {
  await requireStaff(['admin']);
  await setContactHandled(id, handled);
  revalidatePath('/admin/leads/');
  revalidatePath('/admin/');
}

export async function leadsCount() {
  await requireStaff(['admin']);
  return (await listContacts(500)).filter((l) => !l.handled).length;
}
