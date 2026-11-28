'use client';

import dynamic from 'next/dynamic';

/** The order form pulls in the font / render engine – loaded on the client only. */
export const LazyNotaryOrder = dynamic(() => import('./NotaryOrder').then((m) => m.NotaryOrder), {
  ssr: false,
  loading: () => <div className="mt-6 h-[560px] animate-pulse rounded-2xl border border-line bg-surface/60" />,
});
