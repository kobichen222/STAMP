import Link from 'next/link';
import { Img } from '@/components/Img';
import { formatPrice } from '@/lib/format';
import type { ImageRef } from '@/lib/types';

export interface CategoryCardData {
  slug: string;
  name: string;
  image: ImageRef | null;
  size: string | null;
  lines: string | null;
  fromPrice: number | null;
  count: number;
}

export function CategoryCard({ c }: { c: CategoryCardData }) {
  return (
    <Link href={`/stamps/${c.slug}/`} className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="aspect-[5/4] overflow-hidden bg-surface">
        {c.image && <Img image={c.image} className="h-full w-full object-contain p-5 mix-blend-multiply transition duration-500 group-hover:scale-[1.05]" />}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold">{c.name}</h3>
        <p className="mt-1 text-[13px] text-muted">
          {[c.size, c.lines].filter(Boolean).join(' · ') || `${c.count} דגמים`}
        </p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-sm">
            {c.fromPrice != null ? (
              <>
                החל מ־<strong className="text-base">{formatPrice(c.fromPrice)}</strong>
              </>
            ) : (
              `${c.count} דגמים`
            )}
          </span>
          <span className="text-sm font-medium text-blue transition group-hover:-translate-x-1">לבחירה ←</span>
        </div>
      </div>
    </Link>
  );
}
