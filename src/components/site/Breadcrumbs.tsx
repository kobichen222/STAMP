import Link from 'next/link';
import { SITE } from '@/lib/config';
import { Icon } from '@/components/ui/Icon';

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const all = [{ label: 'ראשי', href: '/' }, ...items];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      ...(it.href ? { item: SITE.url + encodeURI(it.href) } : {}),
    })),
  };
  return (
    <nav aria-label="פירורי לחם" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {all.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <Icon name="chevronLeft" size={14} className="opacity-50" />}
            {it.href && i < all.length - 1 ? (
              <Link href={it.href} className="hover:text-ink">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-2">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
}
