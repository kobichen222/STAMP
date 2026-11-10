'use server';

import { revalidatePath } from 'next/cache';
import type { Design } from '@/designer/types';
import { applyOrderEdit, editOrderSchema, loadOrder, replaceItemDesign, saveOrder } from '@/server/orders/service';
import { requireStaff } from '@/server/staff';

export type EditResult = { ok: true; changes: string[]; total: number } | { ok: false; error: string };

const refresh = (id: string) => {
  revalidatePath(`/admin/orders/${id}/`);
  revalidatePath('/admin/orders/');
  revalidatePath('/admin/');
};

/** Admin: save a full edit of an existing order (customer, shipping, items, price). */
export async function updateOrder(id: string, input: unknown): Promise<EditResult> {
  const role = await requireStaff(['admin']);
  const parsed = editOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'נא לבדוק את השדות: שם (2 תווים לפחות), טלפון וכמויות' };
  const o = await loadOrder(id);
  if (!o) return { ok: false, error: 'ההזמנה לא נמצאה' };
  try {
    const changes = await applyOrderEdit(o, parsed.data, role);
    await saveOrder(o);
    refresh(id);
    return { ok: true, changes, total: o.total };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'השמירה נכשלה' };
  }
}

/** Admin: save a design edited in the designer back into the order item. */
export async function saveOrderItemDesign(id: string, index: number, productSlug: string, design: Design): Promise<EditResult> {
  const role = await requireStaff(['admin']);
  const o = await loadOrder(id);
  if (!o) return { ok: false, error: 'ההזמנה לא נמצאה' };
  try {
    await replaceItemDesign(o, index, productSlug, design, role);
    await saveOrder(o);
    refresh(id);
    return { ok: true, changes: ['עיצוב'], total: o.total };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'השמירה נכשלה' };
  }
}
