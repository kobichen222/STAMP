import Link from 'next/link';
import type { Block } from '@/lib/types';
import { site } from '@/lib/content';
import { Gallery } from './Gallery';
import { ContactForm } from './ContactForm';
import { Img } from './Img';

const COLS: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' };

const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('/wp-content/');

function SmartLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  if (isInternal(href)) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  const external = /^https?:/.test(href);
  return (
    <a href={href} className={className} {...(external ? { target: '_blank', rel: 'noopener' } : {})}>
      {children}
    </a>
  );
}

/** Renders editorial content imported from WordPress/Elementor. */
export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </>
  );
}

function BlockView({ block: b }: { block: Block }) {
  switch (b.type) {
    case 'section': {
      const cols = b.columns.length;
      return (
        <section className={`my-8 grid items-start gap-8 ${COLS[Math.min(cols, 4)] ?? ''}`}>
          {b.columns.map((c, i) => (
            <div key={i} className="min-w-0">
              <Blocks blocks={c.blocks} />
            </div>
          ))}
        </section>
      );
    }
    case 'heading': {
      const level = Math.min(Math.max(b.level, 2), 4);
      const Tag = `h${level}` as 'h2';
      const cls = level === 2 ? 'mt-10 mb-3 text-2xl font-bold sm:text-3xl' : 'mt-8 mb-2 text-xl font-bold';
      return <Tag className={cls}>{b.href ? <SmartLink href={b.href}>{b.text}</SmartLink> : b.text}</Tag>;
    }
    case 'html':
      return <div className="prose-he" dangerouslySetInnerHTML={{ __html: b.html }} />;
    case 'image': {
      const img = <Img image={b.image} className="h-auto max-w-full rounded-2xl" />;
      return (
        <figure className="my-6">
          {b.href ? <SmartLink href={b.href}>{img}</SmartLink> : img}
          {b.caption && <figcaption className="mt-2 text-sm text-muted">{b.caption}</figcaption>}
        </figure>
      );
    }
    case 'button':
      return (
        <p className="my-6">
          <SmartLink href={b.href.startsWith('#') ? '/designer/' : b.href} className="btn-primary">
            {b.text}
          </SmartLink>
        </p>
      );
    case 'gallery':
      return <Gallery images={b.images} variant={b.variant} />;
    case 'accordion':
      return (
        <div className="my-8 divide-y divide-line rounded-2xl border border-line">
          {b.items.map((item, i) => (
            <details key={i} className="group p-5" open={i === 0}>
              <summary className="cursor-pointer list-none text-lg font-semibold marker:hidden">{item.title}</summary>
              <div className="prose-he mt-3" dangerouslySetInnerHTML={{ __html: item.html }} />
            </details>
          ))}
        </div>
      );
    case 'divider':
      return <hr className="my-10 border-line" />;
    case 'form':
      return (
        <div className="card my-8 p-6">
          <ContactForm />
        </div>
      );
    case 'map':
      return (
        <iframe
          className="my-6 aspect-[4/3] w-full rounded-2xl border border-line"
          title={`מפה: ${b.address}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(b.address)}&z=16&output=embed`}
        />
      );
    case 'list':
      return (
        <ul className="my-4 space-y-2">
          {b.items.map((it, i) => (
            <li key={i}>{it.href ? <SmartLink href={it.href} className="text-blue hover:underline">{it.text}</SmartLink> : it.text}</li>
          ))}
        </ul>
      );
    case 'sitemap':
      return (
        <ul className="my-6 columns-1 gap-8 space-y-2 sm:columns-2">
          {[
            { href: '/stamps/', title: 'כל החותמות' },
            { href: '/designer/', title: 'מעצב החותמות' },
            { href: '/templates/', title: 'תבניות' },
            { href: '/examples/', title: 'דוגמאות' },
            { href: '/how-it-works/', title: 'איך זה עובד' },
            { href: '/faq/', title: 'שאלות נפוצות' },
            { href: '/about/', title: 'אודות' },
            { href: '/contact/', title: 'צור קשר' },
          ].map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="text-blue hover:underline">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      );
    case 'products':
    case 'categories':
      return null; // rendered by the new catalog components
    default:
      return null;
  }
}

export const hasContent = (blocks: Block[]) => blocks.length > 0 && JSON.stringify(blocks).length > 40;
export { site };
