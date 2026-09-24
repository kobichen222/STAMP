'use client';

import Link from 'next/link';
import { LazyTemplatePreview as TemplatePreview } from '@/designer/LazyTemplatePreview';
import { TEMPLATES } from '@/designer/templates';
import type { StampModel } from '@/designer/types';

const RECT: StampModel = { id: 'print-40', name: 'PRINT 40', shape: 'rect', width: 58, height: 22 };
const ROUND: StampModel = { id: 'print-r-540', name: 'R 540', shape: 'round', width: 40, height: 40 };
const PICK = ['lawyer-classic', 'company-round', 'doctor-modern', 'business-address', 'lawyer-round', 'business-modern'];

export function TemplateStrip() {
  const list = PICK.map((id) => TEMPLATES.find((t) => t.id === id)!);
  return (
    <section className="container-x py-20 sm:py-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">תבניות</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">מתחילים מתבנית, מסיימים בדקה</h2>
        </div>
        <Link href="/templates/" className="text-sm font-medium text-blue hover:underline">
          לכל התבניות ←
        </Link>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {list.map((t) => {
          const model = t.shape === 'round' ? ROUND : RECT;
          return (
            <Link key={t.id} href={`/designer/?template=${t.id}`} className="group card flex flex-col items-center gap-4 p-6 transition hover:shadow-lift">
              <div className="grid aspect-[3/2] w-full place-items-center rounded-xl bg-surface p-4">
                <TemplatePreview model={model} content={t.content} style={t.style} className={`${t.shape === 'round' ? 'h-full' : 'w-full'} transition duration-500 group-hover:scale-[1.03]`} />
              </div>
              <div className="flex w-full items-center justify-between text-sm">
                <span className="font-semibold">{t.name}</span>
                <span className="text-blue opacity-0 transition group-hover:opacity-100">עצבו דומה ←</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
