import type { Metadata } from 'next';
import { designerProducts } from '@/lib/designer-products';
import { ensureSettings } from '@/server/settings';
import { AiWizard } from './AiWizard';

export const metadata: Metadata = {
  title: 'עיצוב חותמת מהיר – תוך דקה',
  description: 'כותבים את התוכן, בוחרים מוצר ומקבלים 3 עיצובים מוכנים לייצור – עם המחשה מלאה לפני ההזמנה.',
  alternates: { canonical: '/ai-design/' },
};

export default async function AiDesignPage() {
  await ensureSettings();
  return <AiWizard products={designerProducts()} />;
}
