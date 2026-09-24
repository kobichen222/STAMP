import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TEMPLATES } from '@/designer/templates';
import { DEFAULT_RECT, DEFAULT_ROUND, designerProducts } from '@/lib/designer-products';
import { DesignerClient } from './DesignerClient';
import { DesignerRouter } from './DesignerRouter';

export const metadata: Metadata = {
  title: 'מעצב החותמות – עיצוב חותמת אונליין',
  description: 'עצבו חותמת אונליין במידות אמיתיות: טקסט, לוגו, מסגרות ותבניות, תצוגה מקדימה ובדיקת ייצור אוטומטית.',
  alternates: { canonical: '/designer/' },
};

export default function DesignerPage() {
  const products = designerProducts();
  const rect = products.find((p) => p.slug === DEFAULT_RECT) ?? products[0];
  const round = products.find((p) => p.slug === DEFAULT_ROUND) ?? rect;
  const roundTemplates = TEMPLATES.filter((t) => t.shape === 'round').map((t) => t.id);
  return (
    <Suspense>
      <DesignerRouter roundTemplates={roundTemplates} rect={<DesignerClient product={rect} products={products} />} round={<DesignerClient product={round} products={products} />} />
    </Suspense>
  );
}
