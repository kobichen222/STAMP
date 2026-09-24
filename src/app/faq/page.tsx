import type { Metadata } from 'next';
import { FaqList } from '@/components/site/FaqList';
import { PageHero } from '@/components/site/PageHero';
import { allFaqItems, FAQ, faqJsonLd } from '@/lib/faq';

export const metadata: Metadata = {
  title: 'שאלות נפוצות – עיצוב, קבצים, הזמנות ומשלוחים',
  description: 'תשובות על עיצוב חותמת אונליין, העלאת לוגו, קבצי ייצור, צבעי דיו, זמני אספקה ומשלוחים.',
  alternates: { canonical: '/faq/' },
};

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="עזרה" title="שאלות נפוצות" crumbs={[{ label: 'שאלות נפוצות' }]} />
      <div className="container-x grid gap-10 py-14 lg:grid-cols-[220px_1fr]">
        <nav aria-label="נושאים" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col">
            {FAQ.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className="chip lg:w-full">
                  {c.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-12">
          {FAQ.map((c) => (
            <section key={c.id} id={c.id} className="scroll-mt-24">
              <h2 className="mb-4 text-2xl font-bold">{c.title}</h2>
              <FaqList items={c.items} schema={false} />
            </section>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(allFaqItems())) }} />
    </>
  );
}
