import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FaqList } from '@/components/site/FaqList';
import { PageHero } from '@/components/site/PageHero';
import { Icon } from '@/components/ui/Icon';
import { designerModelForProduct, formatSize } from '@/designer/models';
import { getStampCategory } from '@/lib/catalog';
import { SITE } from '@/lib/config';
import { getProduct } from '@/lib/content';
import { FAQ } from '@/lib/faq';
import { formatPrice } from '@/lib/format';
import { ensureSettings } from '@/server/settings';
import { EmbossingRange } from './EmbossingRange';
import { LazyNotaryOrder } from './LazyNotaryOrder';
import { NotaryGallery } from './NotaryGallery';

/** The notary seal product in content/site.json. */
const SLUG = 'notary-stamp';
const cat = getStampCategory('notary')!;

export const metadata: Metadata = {
  title: cat.title,
  description: cat.description,
  alternates: { canonical: '/stamps/notary/' },
  openGraph: { title: cat.title, description: cat.description, url: '/stamps/notary/' },
};

const INCLUDED = [
  ['shield', 'מכבש הבלטה COLOP R 41', 'מכבש מצופה כרום תוצרת אוסטריה, לוחית הבלטה עגולה בקוטר 41 מ״מ, עד 7 שורות'],
  ['text', 'הבלטה ללא דיו', 'שם הנוטריון, "נוטריון" ומספר הרישיון מובלטים בנייר – חותם שלא ניתן לזייף בצילום'],
  ['square', 'נרתיק קשיח כלול', 'נרתיק קומפקטי לנשיאה והגנה; ידית ובסיס מגומי רך להבלטה נוחה ויציבה'],
  ['clock', 'מוכן תוך 2 דקות', 'מרגע אישור ההגהה – לאיסוף מהסטודיו ברמת גן או למשלוח לכל הארץ'],
] as const;

export default async function NotaryPage() {
  await ensureSettings();
  const product = getProduct(SLUG);
  const model = product && designerModelForProduct(product);
  if (!product || !model || product.hidden) notFound();
  const images = [product.image, ...product.gallery].filter((x): x is NonNullable<typeof x> => !!x);
  const faq = [...(cat.faq ?? []), ...FAQ.find((f) => f.id === 'design')!.items.slice(0, 1), ...FAQ.find((f) => f.id === 'times')!.items.slice(0, 1)];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    sku: product.slug,
    image: images.map((i) => SITE.url + encodeURI(i.src)),
    description: cat.description,
    brand: { '@type': 'Brand', name: 'COLOP' },
    ...(product.price ? { offers: { '@type': 'Offer', priceCurrency: 'ILS', price: product.price, availability: 'https://schema.org/InStock', url: `${SITE.url}/stamps/notary/` } } : {}),
  };

  return (
    <>
      <PageHero eyebrow="חותמות" title={cat.name} lead={cat.intro} crumbs={[{ label: 'חותמות', href: '/stamps/' }, { label: cat.name }]} />

      <div className="container-x grid gap-10 py-12 lg:grid-cols-[1fr_1fr]">
        {/* The device itself (COLOP product photos) + imprint sample. */}
        <div className="min-w-0">
          <NotaryGallery images={images} caption={`COLOP Embossing Press R 41 · קוטר הבלטה ${formatSize(model)}`} />
          <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            {INCLUDED.map(([icon, t, d]) => (
              <li key={t} className="flex gap-3 rounded-xl bg-surface p-3.5">
                <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-blue" />
                <span>
                  <strong className="block font-semibold">{t}</strong>
                  <span className="text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">תמונות המוצר ודוגמת ההבלטה: COLOP GmbH.</p>
        </div>

        {/* Price + order form. */}
        <div id="order" className="scroll-mt-24">
          <p className="eyebrow">חותם הבלטה עגול · {formatSize(model)}</p>
          <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">{product.title}</h2>
          {product.headings[0] && product.headings[0] !== product.title && <p className="mt-2 text-muted">{product.headings[0]}</p>}
          <p className="mt-5 text-3xl font-bold">
            {formatPrice(product.price)} <span className="text-sm font-normal text-muted">כולל מע״מ</span>
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="chip">{formatSize(model)}</span>
            <span className="chip">הבלטה ללא דיו</span>
            <span className="chip">כולל נרתיק</span>
            <span className="chip">מוכן תוך 2 דקות</span>
          </div>
          {product.shortDescription && <div className="prose-he mt-5 text-[15px]" dangerouslySetInnerHTML={{ __html: product.shortDescription }} />}
          <LazyNotaryOrder slug={product.slug} title={product.title} price={product.price} model={model} />
        </div>
      </div>

      <EmbossingRange />

      <div className="container-x pb-16">
        <section className="mx-auto max-w-3xl">
          <h2 className="mb-5 text-2xl font-bold">שאלות נפוצות</h2>
          <FaqList items={faq} />
        </section>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
