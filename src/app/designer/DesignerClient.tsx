'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { adaptToModel } from '@/designer/compose';
import { Editor, type DesignerProduct } from '@/designer/editor/Editor';
import type { InkColor } from '@/designer/types';
import { getActiveDraft } from '@/lib/active-draft';
import { designsStore } from '@/lib/designs-store';

function supported() {
  try {
    return (
      typeof window !== 'undefined' &&
      'PointerEvent' in window &&
      typeof TextDecoder !== 'undefined' &&
      typeof ResizeObserver !== 'undefined' &&
      !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGPoint
    );
  } catch {
    return false;
  }
}

export function DesignerClient({ product: requested, products, generic = false }: { product: DesignerProduct; products: DesignerProduct[]; generic?: boolean }) {
  const params = useSearchParams();
  const [ok, setOk] = useState<boolean | null>(null);
  const designParam = params.get('design');
  // No explicit instruction (a design, template, upload or "new")? Continue the draft in progress.
  const explicit = !!designParam || !!params.get('template') || params.get('upload') === '1' || params.get('new') === '1';
  const [draft] = useState(() => {
    if (explicit) return undefined;
    const id = getActiveDraft();
    return id ? designsStore.get().find((d) => d.id === id && d.design.elements.length > 0) : undefined;
  });
  const [designId] = useState(() => designParam || draft?.id || `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  const saved = useMemo(() => (designParam ? designsStore.get().find((d) => d.id === designParam) : draft), [designParam, draft]);
  // Plain /designer/ continues the draft on its own product; a chosen product/size gets the draft carried over.
  const product = (generic && draft && products.find((p) => p.slug === draft.productSlug)) || requested;
  // A saved design for another stamp (product switch) is carried over, not dropped.
  const initial = useMemo(() => {
    if (!saved) return { design: null, moved: false };
    const d = saved.design;
    const m = product.model;
    if (d.width === m.width && d.height === m.height && d.shape === m.shape) return { design: d, moved: false };
    return { design: adaptToModel(d, m), moved: true };
  }, [saved, product.model]);
  useEffect(() => setOk(supported()), []);

  if (ok === null) return <div className="fixed inset-0 grid place-items-center bg-[#F5F7FA] text-sm text-muted">טוען את העורך…</div>;
  if (!ok) {
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">הדפדפן אינו נתמך לעורך המתקדם</h1>
          <p className="mt-2 text-muted">מומלץ להשתמש ב־Chrome, Edge, Safari או Firefox מעודכנים.</p>
        </div>
      </div>
    );
  }
  const ink = params.get('ink') as InkColor | null;
  return (
    <Editor
      key={product.slug + designId}
      product={product}
      products={products}
      initialDesign={initial.design}
      notice={initial.moved ? `העיצוב הועבר ל${product.title} – בדקו את הסידור` : undefined}
      resumed={!!draft && !designParam}
      designId={designId}
      templateId={params.get('template')}
      initialInk={ink ?? undefined}
      initialQty={Math.max(1, Number(params.get('qty')) || 1)}
      bodyColor={params.get('body') ?? undefined}
      startWithUpload={params.get('upload') === '1'}
    />
  );
}
