'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LazyTemplatePreview as TemplatePreview } from '@/designer/LazyTemplatePreview';
import { TEMPLATE_CATEGORIES, TEMPLATES, type StampTemplate } from '@/designer/templates';
import type { StampModel } from '@/designer/types';

const RECT: StampModel = { id: 'print-40', name: 'PRINT 40', shape: 'rect', width: 58, height: 22 };
const ROUND: StampModel = { id: 'print-r-540', name: 'R 540', shape: 'round', width: 40, height: 40 };

export interface GalleryItem {
  id: string;
  template: StampTemplate;
  label: string;
  tags: string[];
  ink?: 'black' | 'blue' | 'red';
}

export function TemplateGallery({ items, filters, cta = 'החל תבנית' }: { items: GalleryItem[]; filters: { id: string; label: string }[]; cta?: string }) {
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const list = useMemo(
    () =>
      items.filter(
        (i) => (cat === 'all' || i.tags.includes(cat)) && (!q || `${i.label} ${i.template.content.lines.join(' ')} ${i.template.content.arcTop ?? ''}`.includes(q)),
      ),
    [items, cat, q],
  );
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`chip ${cat === 'all' ? 'chip-on' : ''}`} onClick={() => setCat('all')}>
            הכול
          </button>
          {filters.map((f) => (
            <button key={f.id} type="button" className={`chip ${cat === f.id ? 'chip-on' : ''}`} onClick={() => setCat(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <label className="relative sm:w-64">
          <span className="sr-only">חיפוש</span>
          <Icon name="search" size={18} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש…" className="input !pr-10" />
        </label>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((it) => {
          const model = it.template.shape === 'round' ? ROUND : RECT;
          return (
            <Link key={it.id} href={`/designer/?template=${it.template.id}`} className="group card relative overflow-hidden p-5 transition hover:shadow-lift">
              <div className="grid aspect-[3/2] place-items-center rounded-xl bg-surface p-5">
                <TemplatePreview model={model} content={it.template.content} style={it.template.style} ink={it.ink} className={`${model.shape === 'round' ? 'h-full' : 'w-full'}`} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-semibold">{it.label}</span>
                <span className="text-xs text-muted">{model.shape === 'round' ? '⌀40 מ״מ' : '58×22 מ״מ'}</span>
              </div>
              <span className="absolute inset-x-5 bottom-16 flex translate-y-2 justify-center opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                <span className="btn-primary btn-sm shadow-lift">{cta}</span>
              </span>
            </Link>
          );
        })}
      </div>
      {!list.length && <p className="mt-10 text-center text-muted">לא נמצאו תוצאות.</p>}
    </div>
  );
}

export const TEMPLATE_ITEMS: GalleryItem[] = TEMPLATES.filter((t) => !t.withLogo || t.content.logo).map((t) => ({ id: t.id, template: t, label: t.name, tags: [t.category] }));
export { TEMPLATE_CATEGORIES };
