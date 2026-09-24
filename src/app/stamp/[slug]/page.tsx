import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Blocks } from '@/components/Blocks';
import { ProductCard } from '@/components/catalog/ProductCard';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { Icon } from '@/components/ui/Icon';
import { ProductConfigurator, ProductVisual } from "@/components/catalog/ProductConfigurator";
import { SITE } from '@/lib/config';
import { CATEGORIES, editorialBlocks, productFacts, productsForCategory, SERIES_LABEL } from '@/lib/catalog';
import { getProduct, site } from '@/lib/content';
import { formatPrice } from '@/lib/format';
import { summarize } from '@/lib/summaries';
import { designerModelForProduct } from '@/designer/models';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => site.products.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProduct((await params).slug);
  if (!p) return {};
  const f = productFacts(p);
  const description =
    p.seo.description ||
    [p.headings[0] || p.title, f.size && `מידות ${f.size}`, f.maxLines && `עד ${f.maxLines} שורות`, p.price && `${formatPrice(p.price)} כולל מע״מ`, 'עיצוב אונליין ומוכנה תוך 2 דקות']
      .filter(Boolean)
      .join(' · ');
  return {
    title: p.seo.title || p.title,
    description,
    alternates: { canonical: `/stamp/${p.slug}/` },
    openGraph: { title: p.title, description, url: `/stamp/${p.slug}/`, images: p.image ? [encodeURI(p.image.src)] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const facts = productFacts(product);
  const model = designerModelForProduct(product);
  const inCats = CATEGORIES.filter((c) => productsForCategory(c).some((p) => p.id === product.id));
  const primaryRank = (c: (typeof inCats)[number]) => {
    const i = c.wpCategoryIds?.indexOf(product.primaryCategoryId ?? -1) ?? -1;
    return i < 0 ? 99 : i;
  };
  const category = inCats.find((c) => c.titleIncludes) ?? [...inCats].sort((a, b) => primaryRank(a) - primaryRank(b))[0];
  const images = [product.image, ...product.gallery].filter((x): x is NonNullable<typeof x> => !!x);
  const related = category ? productsForCategory(category).filter((p) => p.id !== product.id).slice(0, 3) : [];

  const specs: [string, string | null][] = [
    ['סוג', SERIES_LABEL[facts.series]],
    ['שטח החתמה', facts.size],
    ['צורה', facts.shape === 'round' ? 'עגולה' : facts.shape === 'square' ? 'מרובעת' : facts.shape ? 'מלבנית' : null],
    ['מספר שורות מומלץ', product.rowsCount],
    ['ייצור', 'חריטת לייזר על גומי, מוכנה תוך 2 דקות'],
    ['קובץ ייצור', 'וקטורי SVG/PDF 1:1, טקסט מומר לקווים'],
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    sku: product.slug,
    image: images.map((i) => SITE.url + encodeURI(i.src)),
    description: [product.headings.join(' – '), facts.size].filter(Boolean).join(' · '),
    brand: { '@type': 'Brand', name: 'Stamp2Go' },
    ...(product.price
      ? { offers: { '@type': 'Offer', priceCurrency: 'ILS', price: product.price, availability: 'https://schema.org/InStock', url: `${SITE.url}/stamp/${encodeURIComponent(product.slug)}/` } }
      : {}),
  };

  return (
    <div className="pt-20 pb-20 lg:pb-0">
      <div className="container-x py-6">
        <Breadcrumbs items={[{ label: 'חותמות', href: '/stamps/' }, ...(category ? [{ label: category.name, href: `/stamps/${category.slug}/` }] : []), { label: product.title }]} />
      </div>
      <div className="container-x grid gap-10 pb-16 lg:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0">
          <ProductVisual model={model} images={images} title={product.title} />
        </div>
        <div>
          <p className="eyebrow">{SERIES_LABEL[facts.series]}</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{product.title}</h1>
          {product.headings[0] && product.headings[0] !== product.title && <p className="mt-2 text-muted">{product.headings[0]}</p>}
          <p className="mt-5 text-3xl font-bold">
            {formatPrice(product.price)} <span className="text-sm font-normal text-muted">כולל מע״מ</span>
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {facts.size && <span className="chip">{facts.size}</span>}
            {facts.maxLines && <span className="chip">עד {facts.maxLines} שורות</span>}
            <span className="chip">מוכנה תוך 2 דקות</span>
          </div>
          {product.shortDescription && <div className="prose-he mt-5 text-[15px]" dangerouslySetInnerHTML={{ __html: product.shortDescription }} />}
          <ProductConfigurator slug={product.slug} designable={!!model} price={product.price} />
          <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['clock', 'זמן ייצור', 'מוכנה תוך 2 דקות מאישור ההגהה'],
              ['truck', 'משלוח', 'לכל הארץ, מחיר בקופה'],
              ['store', 'איסוף עצמי', SITE.address],
              ['shield', 'אחריות', 'חותמות מתוצרת אוסטריה, כרית דיו חלופית זמינה'],
            ].map(([icon, t, d]) => (
              <li key={t} className="flex gap-3 rounded-xl bg-surface p-3.5">
                <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-blue" />
                <span>
                  <strong className="block font-semibold">{t}</strong>
                  <span className="text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
          <section className="mt-8">
            <h2 className="text-lg font-bold">מפרט טכני</h2>
            <dl className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
              {specs
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5">
                    <dt className="text-muted">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>
      </div>
      {product.blocks.length > 0 && (
        <div className="container-x max-w-4xl pb-12">
          <Blocks blocks={editorialBlocks(product.blocks)} />
        </div>
      )}
      {related.length > 0 && (
        <section className="border-t border-line bg-surface py-14">
          <div className="container-x">
            <h2 className="mb-6 text-2xl font-bold">עוד ב{category!.name}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={summarize(p)} />
              ))}
            </div>
          </div>
        </section>
      )}
      {model && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="leading-tight">
            <p className="text-lg font-bold">{formatPrice(product.price)}</p>
            <p className="text-[11px] text-muted">{facts.size}</p>
          </div>
          <Link href={`/designer/${product.slug}/`} className="btn-primary ms-auto">
            עיצוב החותמת
          </Link>
        </div>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
