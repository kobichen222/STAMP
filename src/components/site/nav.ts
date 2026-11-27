import { CATEGORIES } from '@/lib/categories';

// Full site list for the footer. The desktop header shows the stamps menu (STAMP_MENU) plus the direct trade links (TRADE_NAV).
export const MAIN_NAV = [
  { label: 'חותמות לעסקים', href: '/stamps/business/' },
  { label: 'חותמות אישיות', href: '/stamps/personal/' },
  { label: 'דוגמאות', href: '/examples/' },
  { label: 'איך זה עובד', href: '/how-it-works/' },
  { label: 'שאלות נפוצות', href: '/faq/' },
  { label: 'אודות', href: '/about/' },
  { label: 'צור קשר', href: '/contact/' },
];

// Direct links next to the stamps menu in the desktop header, for the trades that order most.
export const TRADE_NAV = [
  { label: 'עורכי דין', href: '/stamps/lawyers/' },
  { label: 'רופאים', href: '/stamps/doctors/' },
  { label: 'חברות', href: '/stamps/company/' },
];

export const STAMP_MENU =CATEGORIES.map((c) => ({ label: c.name, href: `/stamps/${c.slug}/`, featured: !!c.featured }));
