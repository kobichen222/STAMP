import Link from 'next/link';
import { Img } from '@/components/Img';
import { Icon } from '@/components/ui/Icon';
import { formatPrice } from '@/lib/format';
import type { ProductSummary } from './types';

export function ProductCard({ product: p }: { product: ProductSummary }) {
  return (
    <article className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <Link href={`/stamp/${p.slug}/`} className="relative block aspect-[4/3] overflow-hidden bg-surface">
        {p.image ? (
          <Img image={p.image} className="h-full w-full object-contain p-4 mix-blend-multiply transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <Icon name="image" size={32} />
          </div>
        )}
        {p.designable && (
          <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-blue shadow-soft">עיצוב אונליין</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[16px] font-semibold leading-snug">
          <Link href={`/stamp/${p.slug}/`}>{p.title}</Link>
        </h3>
        <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted">
          {p.size && (
            <div className="flex gap-1">
              <dt className="sr-only">מידה</dt>
              <dd>{p.size}</dd>
            </div>
          )}
          {p.maxLines && (
            <div className="flex gap-1">
              <dt className="sr-only">שורות</dt>
              <dd>עד {p.maxLines} שורות</dd>
            </div>
          )}
        </dl>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <p className="text-lg font-bold">{formatPrice(p.price)}</p>
          {p.designable ? (
            <Link href={`/designer/${p.slug}/`} className="btn-primary btn-sm">
              עצבו עכשיו
            </Link>
          ) : (
            <Link href={`/stamp/${p.slug}/`} className="btn-outline btn-sm">
              לפרטים
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
