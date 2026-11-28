import Link from 'next/link';
import { productFacts } from '@/lib/catalog';
import { getProduct } from '@/lib/content';
import { formatPrice } from '@/lib/format';
import type { CatalogRow } from '@/stamp-bot/bodies';
import { imprintSize } from './imprint-size';

/** One stamp model on the home page: its sample imprint, the body photo, name, size, lines and price. */
export function ModelCard({ m, maxW, maxH }: { m: CatalogRow; maxW: number; maxH: number }) {
  const { width, height } = imprintSize(m.w, m.h, maxW, maxH);
  const p = getProduct(m.slug);
  const lines = p ? productFacts(p).maxLines : null; // the same number the product page shows
  return (
    <Link href={`/stamp/${m.slug}/`} className="card block w-full p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:w-[280px]">
      <div className="mb-[10px] flex h-[134px] items-center justify-center gap-[22px]">
        {/* Trailing slash: the site's URLs end with "/", so this skips a redirect. */}
        <img src={`/api/stamp-sample/${m.id}/`} alt={`דוגמת החתמה של ${m.short}`} loading="lazy" width={width} height={height} style={{ width, height }} className="shrink-0" />
        <div className="flex size-[84px] shrink-0 items-center justify-center">
          <img src={`/stamp-bodies/${m.id}.jpg`} alt={m.title} loading="lazy" className="max-h-full max-w-full object-contain" />
        </div>
      </div>
      <h3 className="truncate text-[17px] font-bold leading-6">{m.short}</h3>
      <div className="flex items-baseline justify-between gap-[10px]">
        <span className="text-sm leading-6 text-muted">
          {m.kind === 'round' ? `קוטר ${m.w} מ"מ` : <><span dir="ltr">{`${m.w}×${m.h}`}</span> מ&quot;מ</>}
          {lines ? ` · עד ${lines} שורות` : ''}
        </span>
        <span className="text-[17px] font-bold tabular-nums">{formatPrice(m.price)}</span>
      </div>
    </Link>
  );
}
