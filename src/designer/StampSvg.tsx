'use client';

import { toSvgD } from './geometry';
import type { RenderResult } from './render';
import { INK_COLORS, type InkColor } from './types';

/** Displays a rendered design as inline SVG in the chosen ink colour. */
export function StampSvg({
  render,
  ink = 'black',
  className,
  paper = true,
  pad = 1.5,
  title,
}: {
  render: RenderResult;
  ink?: InkColor;
  className?: string;
  paper?: boolean;
  pad?: number;
  title?: string;
}) {
  const { width: W, height: H } = render;
  return (
    <svg viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}`} className={className} role="img" aria-label={title ?? 'תצוגת חותמת'}>
      {paper &&
        (render.shape === 'round' ? (
          <circle cx={W / 2} cy={H / 2} r={W / 2 + pad * 0.6} fill="#fff" />
        ) : (
          <rect x={-pad * 0.6} y={-pad * 0.6} width={W + pad * 1.2} height={H + pad * 1.2} rx={0.8} fill="#fff" />
        ))}
      <g fill={INK_COLORS[ink].hex}>
        {render.items.map((it, i) =>
          it.kind === 'path' ? (
            <path key={it.id + i} d={toSvgD(it.path)} fillRule={it.fillRule} />
          ) : (
            <image key={it.id + i} href={it.href} width={1} height={1} preserveAspectRatio="none" transform={`matrix(${it.matrix.join(' ')})`} />
          ),
        )}
      </g>
    </svg>
  );
}
