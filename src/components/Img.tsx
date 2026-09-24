import type { ImageRef } from '@/lib/types';

/**
 * Plain <img> with intrinsic size to avoid layout shift. Images live under
 * /public/wp-content/uploads (same paths as WordPress) and are served from the
 * Vercel CDN with long cache headers.
 */
export function Img({ image, className, priority, sizes }: { image: ImageRef; className?: string; priority?: boolean; sizes?: string }) {
  return (
    <img
      src={encodeURI(image.src)}
      alt={image.alt || ''}
      width={image.width}
      height={image.height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      sizes={sizes}
    />
  );
}
