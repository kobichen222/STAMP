import { faqJsonLd, type FaqItem } from '@/lib/faq';

export function FaqList({ items, schema = true }: { items: FaqItem[]; schema?: boolean }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((it) => (
        <details key={it.q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold marker:hidden">
            {it.q}
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface text-lg transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 leading-7 text-muted">{it.a}</p>
        </details>
      ))}
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(items)) }} />}
    </div>
  );
}
