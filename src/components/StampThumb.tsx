import { INK_COLORS, type InkColor } from '@/designer/types';

/** Renders a stored production SVG as an <img> (no script context) in the chosen ink colour. */
export function StampThumb({ svg, ink = 'black', className, alt = 'תצוגת החותמת' }: { svg: string; ink?: InkColor; className?: string; alt?: string }) {
  if (!svg) return <div className={`rounded-lg bg-surface ${className ?? ''}`} />;
  const colored = svg.replace(/<\?xml[^>]*>/, '').replace('fill="#000000"', `fill="${INK_COLORS[ink]?.hex ?? '#000'}"`);
  return <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(colored)}`} alt={alt} className={className} />;
}
