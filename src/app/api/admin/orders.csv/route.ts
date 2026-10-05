import { csv, csvResponse } from '@/server/csv';
import { STATUS_LABEL } from '@/server/orders/types';
import { requireStaff } from '@/server/staff';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  await requireStaff(['admin']);
  const orders = await getStore().listOrders({ limit: 5000 });
  const rows = [
    ['מספר הזמנה', 'תאריך', 'סטטוס', 'תשלום', 'לקוח', 'טלפון', 'אימייל', 'חברה', 'מוצרים', 'כמות', 'סכום ביניים', 'הנחה', 'קופון', 'משלוח', 'סה״כ', 'שיטת משלוח'],
    ...orders.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
      STATUS_LABEL[o.status],
      o.paymentStatus === 'paid' ? 'שולם' : 'לא שולם',
      o.customer.name,
      o.customer.phone,
      o.customer.email,
      o.customer.company,
      o.items.map((i) => `${i.productName} (${i.size})`).join(' | '),
      o.items.reduce((n, i) => n + i.quantity, 0),
      o.subtotal,
      o.discount,
      o.couponCode,
      o.shippingPrice,
      o.total,
      o.shipping.label,
    ]),
  ];
  return csvResponse(csv(rows), `orders-${new Date().toISOString().slice(0, 10)}.csv`);
}
