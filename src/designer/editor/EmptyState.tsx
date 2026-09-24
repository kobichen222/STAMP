'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { designsStore, type SavedDesign } from '@/lib/designs-store';

export function EmptyState({ onTemplates, onBlank, onUpload, currentId }: { onTemplates: () => void; onBlank: () => void; onUpload: () => void; currentId?: string }) {
  // A customer who already designed shouldn't start from scratch: offer the latest design.
  const [last, setLast] = useState<SavedDesign | null>(null);
  useEffect(() => {
    const list = designsStore.get().filter((d) => d.id !== currentId && d.design.elements.length);
    setLast(list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null);
  }, [currentId]);
  const opts = [
    { icon: 'template', title: 'בחרו תבנית', text: 'עורך דין, רופא, חברה ועוד – מחליפים טקסט ומסיימים', on: onTemplates, primary: true },
    { icon: 'text', title: 'עיצוב חדש', text: 'מתחילים מדף ריק ומוסיפים טקסט, לוגו ומסגרת', on: onBlank },
    { icon: 'upload', title: 'יש לי קובץ מוכן', text: 'מעלים SVG / PDF / PNG – המערכת בודקת ומכינה לייצור', on: onUpload },
  ];
  return (
    <div className="absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-[#F5F7FA]/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl animate-fade-up text-center">
        <h2 className="text-xl font-extrabold sm:text-3xl">איך תרצו להתחיל?</h2>
        {last && (
          <Link
            href={`/designer/${last.productSlug ? `${last.productSlug}/` : ''}?design=${last.id}`}
            className="mx-auto mt-4 flex max-w-md items-center gap-3 rounded-2xl border border-blue/30 bg-white p-3 text-right shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span
              className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface p-1 [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: last.previewSvg }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-blue">המשך מהעיצוב האחרון</span>
              <span className="block truncate text-sm">{last.name}</span>
              <span className="block text-xs text-muted">
                {last.productName} · {last.size}
              </span>
            </span>
            <Icon name="arrowLeft" size={18} className="shrink-0 text-blue" />
          </Link>
        )}
        <div className="mt-4 grid gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-3">
          {opts.map((o) => (
            <button
              key={o.title}
              type="button"
              onClick={o.on}
              className={`card grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5 p-3.5 text-right sm:flex sm:flex-col sm:gap-2 sm:p-5 sm:text-center transition hover:-translate-y-0.5 hover:shadow-lift ${o.primary ? 'ring-2 ring-blue/30' : ''}`}
            >
              <span className={`row-span-2 grid h-12 w-12 place-items-center rounded-xl ${o.primary ? 'bg-blue text-white' : 'bg-surface text-ink'}`}>
                <Icon name={o.icon} size={24} />
              </span>
              <span className="font-bold">{o.title}</span>
              <span className="text-[13px] leading-5 text-muted sm:text-sm sm:leading-6">{o.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
