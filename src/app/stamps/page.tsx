import type { Metadata } from 'next';
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { PageHero } from '@/components/site/PageHero';
import { CATEGORIES, categoryCard } from '@/lib/catalog';
import { site } from '@/lib/content';
import { summarize } from '@/lib/summaries';

export const metadata: Metadata = {
  title: 'כל החותמות – קטלוג חותמות לעיצוב אונליין',
  description: 'חותמות אוטומטיות, עגולות, כיס, תאריכונים, עט חותמת ועוד. סננו לפי סוג, מידה ומספר שורות והתחילו לעצב ישירות מהכרטיס.',
  alternates: { canonical: '/stamps/' },
};

export default function StampsPage() {
  const featured = CATEGORIES.filter((c) => c.featured).map(categoryCard);
  return (
    <>
      <PageHero eyebrow="קטלוג" title="כל החותמות" lead="בחרו סוג ומידה, והתחילו לעצב ישירות מהכרטיס. כל המחירים כוללים מע״מ." crumbs={[{ label: 'חותמות' }]} />
      <div className="container-x py-12">
        <h2 className="text-2xl font-bold">לפי שימוש</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((c) => (
            <CategoryCard key={c.slug} c={c} />
          ))}
        </div>
        <h2 className="mt-16 mb-6 text-2xl font-bold">כל הדגמים</h2>
        <CatalogBrowser products={site.products.map(summarize)} />
      </div>
    </>
  );
}
