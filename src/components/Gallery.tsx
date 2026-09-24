'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageRef } from '@/lib/types';
import { Img } from './Img';
import { Icon } from './ui/Icon';

function Lightbox({ images, index, onIndex, onClose }: { images: ImageRef[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const go = useCallback((d: number) => onIndex((index + d + images.length) % images.length), [index, images.length, onIndex]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(1);
      if (e.key === 'ArrowRight') go(-1);
    };
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = '';
    };
  }, [go, onClose]);
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-ink/90 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" aria-label="סגירה" onClick={onClose} className="absolute top-4 left-4 grid h-11 w-11 place-items-center rounded-full bg-white">
        <Icon name="close" size={22} />
      </button>
      <div className="relative grid max-h-[86vh] w-full max-w-5xl place-items-center" onClick={(e) => e.stopPropagation()}>
        <Img image={images[index]} className="max-h-[86vh] w-auto rounded-xl bg-white object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" aria-label="הקודם" onClick={() => go(-1)} className="absolute top-1/2 right-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-soft">
              <Icon name="arrowRight" size={20} />
            </button>
            <button type="button" aria-label="הבא" onClick={() => go(1)} className="absolute top-1/2 left-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-soft">
              <Icon name="arrowLeft" size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function Gallery({ images, variant }: { images: ImageRef[]; variant: 'carousel' | 'grid' }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const touch = useRef<number | null>(null);
  const go = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  if (variant === 'grid' || images.length === 1) {
    return (
      <>
        <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((im, i) => (
            <button
              key={im.src}
              type="button"
              aria-label={`הגדלת ${im.alt || `תמונה ${i + 1}`}`}
              onClick={() => {
                setIndex(i);
                setZoom(true);
              }}
              className="cursor-zoom-in overflow-hidden rounded-xl border border-line transition hover:shadow-soft"
            >
              <Img image={im} className="aspect-square w-full object-cover transition duration-300 hover:scale-105" />
            </button>
          ))}
        </div>
        {zoom && <Lightbox images={images} index={index} onIndex={setIndex} onClose={() => setZoom(false)} />}
      </>
    );
  }
  return (
    <div className="my-6">
      <div
        className="relative overflow-hidden rounded-2xl border border-line bg-surface"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx > 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        <button type="button" className="block w-full cursor-zoom-in" onClick={() => setZoom(true)} aria-label="הגדלת תמונה">
          <Img key={index} image={images[index]} className="mx-auto aspect-[4/3] w-full animate-fade-up object-contain" />
        </button>
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
      {zoom && <Lightbox images={images} index={index} onIndex={setIndex} onClose={() => setZoom(false)} />}
    </div>
  );
}
