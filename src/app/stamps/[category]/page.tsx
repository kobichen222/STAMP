import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Blocks } from '@/components/Blocks';
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { PageHero } from '@/components/site/PageHero';
import { FaqList } from '@/components/site/FaqList';
import { CATEGORIES, categoryPage, editorialBlocks, getStampCategory, productsForCategory } from '@/lib/catalog';
import { summarize } from '@/lib/summaries';
import { FAQ } from '@/lib/faq';

type Props = { params: Promise<{ category: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => CATEGORIES.map((c) => ({ category: c.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = getStampCategory((await params).category);
  if (!cat) return {};
  return {
    title: cat.title,
    description: cat.description,
    alternates: { canonical: `/stamps/${cat.slug}/` },
    openGraph: { title: cat.title, description: cat.description, url: `/stamps/${cat.slug}/` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const cat = getStampCategory((await params).category);
  if (!cat) notFound();
  const products = productsForCategory(cat).map(summarize);
  const page = categoryPage(cat);
  const editorial = page ? editorialBlocks(page.blocks) : [];
  const faq = [...(cat.faq ?? []), ...FAQ.find((f) => f.id === 'design')!.items.slice(0, 2), ...FAQ.find((f) => f.id === 'times')!.items.slice(0, 1)];

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: cat.name,
    itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `/stamp/${encodeURIComponent(p.slug)}/`, name: p.title })),
  };

  return (
    <>
      <PageHero eyebrow="חותמות" title={cat.name} lead={cat.intro} crumbs={[{ label: 'חותמות', href: '/stamps/' }, { label: cat.name }]}>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={products.find((p) => p.designable) ? `/designer/${products.find((p) => p.designable)!.slug}/` : '/designer/'} className="btn-primary btn-lg">
            התחילו לעצב
          </Link>
          <Link href="/templates/" className="btn-outline btn-lg">
            לתבניות מוכנות
          </Link>
        </div>
      </PageHero>
      <div className="container-x py-12">
        {products.length > 0 ? <CatalogBrowser products={products} /> : <p className="text-muted">דגמים לקטגוריה זו זמינים בהזמנה טלפונית.</p>}
        {editorial.length > 0 && (
          <article className="mx-auto mt-20 max-w-3xl">
            <Blocks blocks={editorial} />
          </article>
        )}
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="mb-5 text-2xl font-bold">שאלות נפוצות</h2>
          <FaqList items={faq} />
        </section>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    </>
  );
}
