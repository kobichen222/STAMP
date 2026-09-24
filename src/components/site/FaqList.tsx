import { faqJsonLd, type FaqItem } from '@/lib/faq';

export function FaqList({ items, schema = true, openFirst = false, compact = false }: { items: FaqItem[]; schema?: boolean; openFirst?: boolean; compact?: boolean }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((it, i) => (
        <details key={it.q} className={`group ${compact ? 'px-4 py-3' : 'px-5 py-4'}`} open={openFirst && i === 0}>
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 font-semibold marker:hidden ${compact ? 'text-[15px]' : 'text-[16px]'}`}>
            {it.q}
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface text-lg transition group-open:rotate-45">+</span>
          </summary>
          <p className={`text-muted ${compact ? 'mt-2 text-[14.5px] leading-6' : 'mt-3 leading-7'}`}>{it.a}</p>
        </details>
      ))}
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(items)) }} />}
    </div>
  );
}
