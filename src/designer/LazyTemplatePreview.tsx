'use client';

import dynamic from 'next/dynamic';

/** TemplatePreview without pulling the font engine into the initial bundle. */
export const LazyTemplatePreview = dynamic(() => import('./TemplatePreview').then((m) => m.TemplatePreview), {
  ssr: false,
  loading: () => <div className="aspect-[3/1.4] w-full animate-pulse rounded-lg bg-line/40" />,
});
