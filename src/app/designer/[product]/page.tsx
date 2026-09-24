import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { normalizeSlug } from '@/lib/content';
import { designerProducts } from '@/lib/designer-products';
import { DesignerClient } from '../DesignerClient';

type Props = { params: Promise<{ product: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => designerProducts().map((p) => ({ product: p.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = normalizeSlug((await params).product);
  const product = designerProducts().find((x) => x.slug === slug);
  return {
    title: product ? `עיצוב ${product.title}` : 'מעצב החותמות',
    alternates: { canonical: product ? `/stamp/${product.slug}/` : '/designer/' },
    robots: { index: false },
  };
}

export default async function DesignerProductPage({ params }: Props) {
  const slug = normalizeSlug((await params).product);
  const products = designerProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();
  return (
    <Suspense>
      <DesignerClient product={product} products={products} />
    </Suspense>
  );
}
