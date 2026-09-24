'use client';

import { useState } from 'react';
import type { ImageRef } from '@/lib/types';
import { Img } from './Img';
import { Icon } from './ui/Icon';

export function Gallery({ images, variant }: { images: ImageRef[]; variant: 'carousel' | 'grid' }) {
  const [index, setIndex] = useState(0);
  if (variant === 'grid' || images.length === 1) {
    return (
      <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {images.map((im) => (
          <Img key={im.src} image={im} className="aspect-square w-full rounded-xl border border-line object-cover" />
        ))}
      </div>
    );
  }
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);
  return (
    <div className="my-6">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
        <Img image={images[index]} className="mx-auto aspect-[4/3] w-full object-contain" />
        <button type="button" onClick={() => go(-1)} aria-label="הקודם" className="absolute top-1/2 right-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-soft">
          <Icon name="arrowRight" size={18} />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="הבא" className="absolute top-1/2 left-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-soft">
          <Icon name="arrowLeft" size={18} />
        </button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {images.map((im, i) => (
          <button key={im.src} type="button" onClick={() => setIndex(i)} aria-label={`תמונה ${i + 1}`} aria-current={i === index} className={`shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? 'border-blue' : 'border-transparent'}`}>
            <Img image={im} className="h-16 w-16 object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
