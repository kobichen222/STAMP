import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Blocks } from '@/components/Blocks';
import { PageHero } from '@/components/site/PageHero';
import { editorialBlocks, remainingLegacyPages } from '@/lib/catalog';
import { excerptFromBlocks, getPage } from '@/lib/content';

type Props = { params: Promise<{ slug: string }> };

/** WordPress content pages that keep their original URL (history, testimonials, accessibility…). */
export const dynamicParams = false;
export const generateStaticParams = () => remainingLegacyPages().map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPage((await params).slug);
  if (!page) return {};
  return {
    title: page.seo.title || page.title,
    description: page.seo.description || excerptFromBlocks(page.blocks),
    alternates: { canonical: page.path },
    robots: page.noindex ? { index: false } : undefined,
  };
}

export default async function LegacyPage({ params }: Props) {
  const page = getPage((await params).slug);
  if (!page) notFound();
  const blocks = editorialBlocks(page.blocks).filter((b) => !(b.type === 'heading' && b.level === 1));
  return (
    <>
      <PageHero title={page.title} crumbs={[{ label: page.title }]} />
      <article className="container-x max-w-3xl py-12">
        <Blocks blocks={blocks} />
      </article>
    </>
  );
}
