import type { FaqItem } from '@/lib/faq';

/**
 * Home page FAQ list: the shared FaqList markup, with the plus sign in the brand blue.
 * All items start closed; the page renders the matching FAQPage JSON-LD itself.
 */
export function HomeFaq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white shadow-soft">
      {items.map((it) => (
        <details key={it.q} className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold marker:hidden">
            {it.q}
            <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-lg text-blue transition group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 leading-7 text-muted">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
