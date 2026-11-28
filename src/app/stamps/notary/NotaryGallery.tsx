'use client';

import { useState } from 'react';
import { Img } from '@/components/Img';
import type { ImageRef } from '@/lib/types';

/** Product photos with thumbnails: the main image is the device itself. */
export function NotaryGallery({ images, caption }: { images: ImageRef[]; caption: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  if (!current) return null;
  return (
    <div>
      <div className="card relative grid aspect-square place-items-center overflow-hidden bg-gradient-to-b from-surface to-white p-6 sm:aspect-[4/3]">
        <Img key={current.src} image={current} className="h-full w-full animate-fade-up object-contain" priority={index === 0} />
        <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-blue shadow-soft">עיצוב אונליין</span>
        {index === 0 && <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-muted">{caption}</p>}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="תמונות המוצר">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={img.alt || `תמונה ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border-2 bg-white p-1 transition ${i === index ? 'border-blue' : 'border-line hover:border-ink/30'}`}
            >
              <Img image={img} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
