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

/** Customer-facing timeline (spec §156). */
export const TIMELINE: { key: string; label: string; reached: OrderStatus[] }[] = [
  { key: 'received', label: 'הזמנה התקבלה', reached: [...ORDER_STATUSES] },
  { key: 'approved', label: 'העיצוב אושר', reached: ['READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'] },
  { key: 'production', label: 'בייצור', reached: ['IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'] },
  { key: 'ready', label: 'מוכן', reached: ['READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'] },
  { key: 'shipped', label: 'נשלח', reached: ['SHIPPED', 'DELIVERED'] },
  { key: 'delivered', label: 'נמסר', reached: ['DELIVERED'] },
];

export interface Customer {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  companyId?: string; // ח.פ.
  poNumber?: string;
}

export interface Shipping {
  method: string; // pickup | courier | express
  label: string;
  price: number;
  address?: { street: string; city: string; zip?: string; notes?: string };
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
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
  customer: Customer;
  shipping: Shipping;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingPrice: number;
  total: number;
  notes?: string;
  staffNotes: { at: string; by: string; text: string }[];
  audit: AuditEntry[];
  notificationsSent: string[]; // event ids (dedupe, spec §179)
  urgent?: boolean;
}
