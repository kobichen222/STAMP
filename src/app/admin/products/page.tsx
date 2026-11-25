import { productSeries, SERIES_LABEL } from '@/lib/catalog';
import { site } from '@/lib/content';
import { designerModelForProduct, formatSize } from '@/designer/models';
import { baseImage, basePrice, getSettings } from '@/server/settings';
import { requireStaff } from '@/server/staff';
import { PageHead, Stats } from '../blocks';
import { CustomProducts } from './CustomProducts';
import { ProductsEditor, type AdminProductRow } from './ProductsEditor';

export const metadata = { title: 'מוצרים ומחירים' };
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  await requireStaff(['admin']);
  const settings = await getSettings(true);
  const rows: AdminProductRow[] = site.products.filter((p) => !p.custom).map((p) => {
    const m = designerModelForProduct(p);
    return {
      slug: p.slug,
      title: p.title,
      image: baseImage(p.id),
      series: SERIES_LABEL[productSeries(p)],
      size: m ? formatSize(m) : null,
      basePrice: basePrice(p.id),
      designable: !!m,
    };
  });
  const over = Object.values(settings.products);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHead title="מוצרים ומחירים" sub="הוספת מוצר חדש, שינוי מחיר, החלפת תמונה או הסתרת מוצר – מתעדכנים בכל האתר אחרי שמירה. להחלפת תמונה לוחצים על תמונת המוצר." />
      <Stats
        items={[
          { label: 'מוצרים בקטלוג', value: rows.length + settings.customProducts.length, sub: `${settings.customProducts.length} נוספו בניהול` },
          { label: 'מוצגים באתר', value: rows.length - over.filter((o) => o.hidden).length, sub: `${over.filter((o) => o.hidden).length} מוסתרים`, tone: 'ok' },
          { label: 'מחיר שונה מהמקור', value: over.filter((o) => o.price !== undefined).length, sub: 'עודכנו בניהול', tone: 'blue' },
          { label: 'תמונות שהוחלפו', value: over.filter((o) => o.image).length, sub: 'במקום תמונת המקור' },
        ]}
      />
      <CustomProducts initial={settings.customProducts} categories={site.categories.map((c) => ({ id: c.id, name: c.name }))} />
      <div>
        <h2 className="mb-1 text-lg font-bold">מוצרי הקטלוג</h2>
        <ProductsEditor rows={rows} initial={settings.products} />
      </div>
    </div>
  );
}
