'use client';

import { useMemo } from 'react';
import { composeLayout, type LayoutContent, type LayoutStyle } from './compose';
import { renderDesign } from './render';
import { StampSvg } from './StampSvg';
import type { InkColor, StampModel } from './types';
import { useFaces } from './useFaces';

/** Live, engine-rendered preview of a layout on a given stamp model. */
export function TemplatePreview({
  model,
  content,
  style = 'classic',
  ink = 'black',
  className,
}: {
  model: StampModel;
  content: LayoutContent;
  style?: LayoutStyle;
  ink?: InkColor;
  className?: string;
}) {
  const design = useMemo(() => composeLayout(model, content, style), [model, content, style]);
  const { resolve, ready, version } = useFaces([design]);
  const render = useMemo(() => (ready ? renderDesign(design, resolve) : null), [design, resolve, ready, version]);
  if (!render) {
    return <div className={`animate-pulse rounded-lg bg-line/50 ${className ?? ''}`} style={{ aspectRatio: `${model.width + 3} / ${model.height + 3}` }} />;
  }
  return <StampSvg render={render} ink={ink} className={className} />;
}
