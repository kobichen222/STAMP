import type { Metadata } from 'next';
import { TEMPLATE_CATEGORIES, TEMPLATE_ITEMS, TemplateGallery } from '@/components/catalog/TemplateGallery';
import { PageHero } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'תבניות חותמות מוכנות – עורך דין, רופא, חברה ועוד',
  description: 'תבניות חותמת מוכנות לעריכה: עורך דין, רופא, חברה, עסק, חתימה ועגולה. בוחרים תבנית, מחליפים טקסט ומזמינים.',
  alternates: { canonical: '/templates/' },
};

export default function TemplatesPage() {
  return (
    <>
      <PageHero eyebrow="תבניות" title="תבניות מוכנות" lead="בחרו תבנית, החליפו את הטקסט – והחותמת מוכנה להזמנה. כל תבנית מתאימה את עצמה לגודל החותמת שתבחרו." crumbs={[{ label: 'תבניות' }]} />
      <div className="container-x py-12">
        <TemplateGallery items={TEMPLATE_ITEMS} filters={TEMPLATE_CATEGORIES} />
      </div>
    </>
  );
}
