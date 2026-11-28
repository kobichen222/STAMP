import type { Design, InkColor } from '@/designer/types';

/** Order lifecycle (spec §133). Error / side states are listed after the happy path. */
export const ORDER_STATUSES = [
  'PAYMENT_PENDING',
  'PAID',
  'PREFLIGHT',
  'AWAITING_APPROVAL',
  'READY_FOR_PRODUCTION',
  'IN_PRODUCTION',
  'QUALITY_CHECK',
  'READY_FOR_SHIPPING',
  'SHIPPED',
  'DELIVERED',
  'PAYMENT_FAILED',
  'CHANGE_REQUESTED',
  'PRODUCTION_FILE_ERROR',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PAYMENT_PENDING: 'ממתין לתשלום',
  PAID: 'שולם',
  PREFLIGHT: 'קובץ נבדק',
  AWAITING_APPROVAL: 'ממתין לאישור סקיצה',
  READY_FOR_PRODUCTION: 'מוכן לייצור',
  IN_PRODUCTION: 'בייצור',
  QUALITY_CHECK: 'בדיקת איכות',
  READY_FOR_SHIPPING: 'מוכן למשלוח',
  SHIPPED: 'נשלח',
  DELIVERED: 'נמסר',
  PAYMENT_FAILED: 'התשלום נכשל',
  CHANGE_REQUESTED: 'התבקש שינוי',
  PRODUCTION_FILE_ERROR: 'שגיאה בקובץ ייצור',
  CANCELLED: 'בוטל',
  REFUNDED: 'הוחזר',
  PARTIALLY_REFUNDED: 'הוחזר חלקית',
};

/** The status as shown: a pickup order that is ready says "מוכן לאיסוף", not "מוכן למשלוח". */
export const statusLabel = (status: OrderStatus, method?: string) => (status === 'READY_FOR_SHIPPING' && method === 'pickup' ? 'מוכן לאיסוף' : STATUS_LABEL[status]);

/** Allowed transitions – everything else is rejected (and audited). */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PAYMENT_PENDING: ['PAID', 'PAYMENT_FAILED', 'PREFLIGHT', 'CANCELLED'],
  PAYMENT_FAILED: ['PAYMENT_PENDING', 'PAID', 'CANCELLED'],
  PAID: ['PREFLIGHT', 'CANCELLED', 'REFUNDED'],
  PREFLIGHT: ['READY_FOR_PRODUCTION', 'AWAITING_APPROVAL', 'PRODUCTION_FILE_ERROR'],
  PRODUCTION_FILE_ERROR: ['PREFLIGHT', 'CANCELLED'],
  AWAITING_APPROVAL: ['READY_FOR_PRODUCTION', 'CHANGE_REQUESTED', 'CANCELLED'],
  CHANGE_REQUESTED: ['PREFLIGHT', 'CANCELLED'],
  READY_FOR_PRODUCTION: ['IN_PRODUCTION', 'CHANGE_REQUESTED', 'CANCELLED'],
  IN_PRODUCTION: ['QUALITY_CHECK', 'READY_FOR_SHIPPING', 'CHANGE_REQUESTED'],
  QUALITY_CHECK: ['READY_FOR_SHIPPING', 'IN_PRODUCTION'],
  READY_FOR_SHIPPING: ['SHIPPED', 'DELIVERED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ['REFUNDED'],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => TRANSITIONS[from].includes(to);

/** Staff timeline (admin order page). The customer's order page uses orderSteps() below. */
export const TIMELINE: { key: string; label: string; reached: OrderStatus[] }[] = [
  { key: 'received', label: 'הזמנה התקבלה', reached: [...ORDER_STATUSES] },
  { key: 'approved', label: 'העיצוב אושר', reached: ['READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'] },
  { key: 'production', label: 'בייצור', reached: ['IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'] },
  { key: 'ready', label: 'מוכן', reached: ['READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'] },
  { key: 'shipped', label: 'נשלח', reached: ['SHIPPED', 'DELIVERED'] },
  { key: 'delivered', label: 'נמסר', reached: ['DELIVERED'] },
];

/** Statuses where the order does not move forward: the customer's progress line shows no step reached. */
export const STOPPED_STATUSES: OrderStatus[] = ['PAYMENT_FAILED', 'PRODUCTION_FILE_ERROR', 'CANCELLED'];

// The statuses that count as having reached each stage (the same sets the six-step TIMELINE uses).
const PRODUCTION_ON: OrderStatus[] = ['IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'];
const READY_ON: OrderStatus[] = ['READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'];
const SHIPPED_ON: OrderStatus[] = ['SHIPPED', 'DELIVERED'];
const DELIVERED_ON: OrderStatus[] = ['DELIVERED'];

/** `reached: null` = reached by every status (the order exists). */
type StepPlan = { key: string; label: string; reached: OrderStatus[] | null };
const RECEIVED: StepPlan = { key: 'received', label: 'התקבלה', reached: null };
const PRODUCTION: StepPlan = { key: 'production', label: 'בייצור', reached: PRODUCTION_ON };

const STEP_PLANS: Record<'pickup' | 'locker' | 'courier', StepPlan[]> = {
  pickup: [RECEIVED, PRODUCTION, { key: 'ready', label: 'מוכנה לאיסוף', reached: READY_ON }, { key: 'done', label: 'נאספה', reached: DELIVERED_ON }],
  locker: [RECEIVED, PRODUCTION, { key: 'shipped', label: 'נשלחה לנקודת המסירה', reached: SHIPPED_ON }, { key: 'done', label: 'נאספה', reached: DELIVERED_ON }],
  courier: [RECEIVED, PRODUCTION, { key: 'shipped', label: 'יצאה אליכם', reached: SHIPPED_ON }, { key: 'done', label: 'נמסרה', reached: DELIVERED_ON }],
};

/** Which progress line a shipping method gets: every method that is not pickup or a locker is a courier. */
const stepFamily = (method?: string): keyof typeof STEP_PLANS => (method === 'pickup' ? 'pickup' : method === 'locker' ? 'locker' : 'courier');

export interface OrderStep {
  key: string;
  label: string;
  reached: boolean;
  /** When the step was reached: "HH:MM" today (Israel time), else "D.M HH:MM". Absent when not reached or not recorded. */
  time?: string;
}

/**
 * The customer's progress line: four steps that fit the delivery method, which of them the order reached
 * (from its status) and when (creation time for the first step, the status history for the rest).
 */
export function orderSteps(o: { status: OrderStatus; shipping: { method?: string }; createdAt?: string; audit?: AuditEntry[] }, now = new Date()): OrderStep[] {
  const stopped = STOPPED_STATUSES.includes(o.status);
  return STEP_PLANS[stepFamily(o.shipping.method)].map((s) => {
    const reached = !stopped && (!s.reached || s.reached.includes(o.status));
    const at = !reached ? undefined : s.reached ? enteredAt(o.audit ?? [], s.reached) : o.createdAt;
    return { key: s.key, label: s.label, reached, time: at ? stepTime(at, now) : undefined };
  });
}

/** The last time the status history moved the order into `set` from a status outside it. */
function enteredAt(audit: AuditEntry[], set: OrderStatus[]): string | undefined {
  let at: string | undefined;
  for (const e of audit) if (e.action === 'status' && e.to && set.includes(e.to) && !(e.from && set.includes(e.from))) at = e.at;
  return at;
}

const IL_TIME = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const ilParts = (d: Date) => Object.fromEntries(IL_TIME.formatToParts(d).map((p) => [p.type, p.value]));

/** "HH:MM" when `iso` is today in Israel, otherwise "D.M HH:MM". */
export function stepTime(iso: string, now = new Date()): string | undefined {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const a = ilParts(d);
  const b = ilParts(now);
  const hm = `${a.hour}:${a.minute}`;
  return a.year === b.year && a.month === b.month && a.day === b.day ? hm : `${Number(a.day)}.${Number(a.month)} ${hm}`;
}

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  companyId?: string; // ח.פ.
  poNumber?: string;
}

export interface Shipping {
  method: string; // pickup | courier | express | rush | locker
  label: string;
  price: number;
  /** The method's time text (its `eta`) as promised when the order was placed; later rule edits do not change it. */
  eta?: string;
  address?: { street: string; city: string; zip?: string; notes?: string };
  carrier?: string;
  /** ZigZag customer card to send the shipment under. */
  carrierAccount?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  /** Shipping label (PDF) from the courier system. */
  labelUrl?: string;
  /** Latest status history from the courier system. */
  statusHistory?: { status: string; date: string }[];
}

export interface ProductionFileRef {
  name: string; // e.g. ORD-240924-AB12_1_KOBI-COHEN_58x22_BLACK.pdf
  kind: 'master-svg' | 'production-svg' | 'production-pdf' | 'production-eps' | 'metadata' | 'preview-svg';
  size: number;
  path: string; // storage key
}

export interface OrderItem {
  id: string; // item index based id
  productSlug?: string;
  productName: string;
  size: string;
  width: number;
  height: number;
  ink: InkColor;
  bodyColor?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  /** Price breakdown as charged (base, ink, frame, discounts, extras). */
  priceLines?: { label: string; amount: number }[];
  /** Extras ordered with this stamp (ink bottle, pad, extra identical body, certified-copy stamp). */
  addons?: Partial<Record<string, number>>;
  /** Locked design version that was paid for (spec §134–135). */
  designVersionId: string;
  design: Design;
  profileId: string;
  mirror: boolean;
  preflight: { ready: boolean; score: number; errors: string[]; warnings: string[] };
  files: ProductionFileRef[];
  productionJobId?: string;
  worker?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface AuditEntry {
  at: string;
  actor: string; // "system", "customer", "admin", worker name
  action: string;
  from?: OrderStatus;
  to?: OrderStatus;
  note?: string;
}

export interface Order {
  id: string;
  token: string; // customer access token for tracking links
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod: string; // manual | provider id
  paymentRef?: string;
  /** Tranzila response code of the last declined card payment (never set for an approved payment with a wrong amount). */
  lastPaymentCode?: string;
  customer: Customer;
  shipping: Shipping;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  /** Personal next-order code issued after payment. */
  rewardCode?: string;
  shippingPrice: number;
  total: number;
  notes?: string;
  staffNotes: { at: string; by: string; text: string }[];
  audit: AuditEntry[];
  notificationsSent: string[]; // event ids (dedupe, spec §179)
  urgent?: boolean;
  /** Manual price adjustment by staff (₪, + or −), already included in total. */
  adjustment?: number;
}
