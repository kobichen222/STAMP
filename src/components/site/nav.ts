import { CATEGORIES } from '@/lib/categories';

export const MAIN_NAV = [
  { label: 'חותמות לעסקים', href: '/stamps/business/' },
  { label: 'חותמות אישיות', href: '/stamps/personal/' },
  { label: 'דוגמאות', href: '/examples/' },
  { label: 'איך זה עובד', href: '/how-it-works/' },
  { label: 'שאלות נפוצות', href: '/faq/' },
  { label: 'אודות', href: '/about/' },
  { label: 'צור קשר', href: '/contact/' },
];

export const STAMP_MENU = CATEGORIES.map((c) => ({ label: c.name, href: `/stamps/${c.slug}/`, featured: !!c.featured }));
