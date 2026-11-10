import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/content';
import { loadOrder, pricingRulesFor } from '@/server/orders/service';
import { requireStaff } from '@/server/staff';
import { OrderEditor } from './OrderEditor';

export const metadata = { title: 'עריכת הזמנה' };
export const dynamic = 'force-dynamic';

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(['admin']);
  const { id } = await params;
  const o = await loadOrder(id);
  if (!o) notFound();
  const rules = await pricingRulesFor();
  const basePrices = Object.fromEntries(o.items.map((it) => [it.id, it.productSlug ? (getProduct(it.productSlug)?.price ?? null) : null]));
  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-24 sm:space-y-5 lg:pb-10">
      <div>
        <Link href={`/admin/orders/${o.id}/`} className="text-sm text-muted hover:text-ink">
          → חזרה להזמנה
        </Link>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">
          עריכת הזמנה · <span dir="ltr">{o.id}</span>
        </h1>
        <p className="mt-1 text-sm text-muted">כל שינוי נשמר ביומן הפעולות. המחיר מחושב מחדש לפי המחירון הנוכחי.</p>
        {o.paymentStatus === 'paid' && <p className="mt-2 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">ההזמנה כבר שולמה (₪{o.total}). שינוי במחיר לא מחייב או מזכה את הלקוח אוטומטית.</p>}
      </div>
      <OrderEditor order={o} rules={rules} basePrices={basePrices} />
    </div>
  );
}
