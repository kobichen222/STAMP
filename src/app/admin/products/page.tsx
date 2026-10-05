import { productSeries, SERIES_LABEL } from '@/lib/catalog';
import { site } from '@/lib/content';
import { designerModelForProduct, formatSize } from '@/designer/models';
import { basePrice, getSettings } from '@/server/settings';
import { requireStaff } from '@/server/staff';
import { ProductsEditor, type AdminProductRow } from './ProductsEditor';

export const metadata = { title: 'מוצרים ומחירים' };
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  await requireStaff(['admin']);
  const settings = await getSettings(true);
  const rows: AdminProductRow[] = site.products.map((p) => {
    const m = designerModelForProduct(p);
    return {
      slug: p.slug,
      title: p.title,
      image: p.image?.src ?? null,
      series: SERIES_LABEL[productSeries(p)],
      size: m ? formatSize(m) : null,
      basePrice: basePrice(p.id),
      designable: !!m,
    };
  });
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold">מוצרים ומחירים</h1>
      <p className="mt-1 text-sm text-muted">שינוי מחיר או הסתרת מוצר מתעדכנים מיד בכל האתר – בקטלוג, בעורך, בסל ובפיד ה־XML.</p>
      <ProductsEditor rows={rows} initial={settings.products} />
    </div>
  );
}
