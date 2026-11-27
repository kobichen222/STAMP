import { StampBox } from './StampBox';

/**
 * First screen, like opening a chat app: one question, one input, one quiet line.
 * It fills the viewport; the top padding leaves room for the fixed header.
 */
export function HomeHero({ rating, fromPrice }: { rating: string | null; fromPrice: string | null }) {
  const facts = [fromPrice ? `החל מ-${fromPrice} ₪` : null, 'מוכנה תוך 2 דקות', rating ? `${rating} בגוגל` : null].filter(Boolean).join(' · ');
  return (
    <section id="start" aria-labelledby="start-title" className="bg-gradient-to-b from-white via-white to-surface">
      <div className="container-x flex min-h-svh flex-col items-center justify-center pt-24 pb-12 lg:pt-28">
        <div className="w-full max-w-2xl">
          <h1 id="start-title" className="text-center text-3xl font-extrabold sm:text-5xl">
            איזו חותמת להכין לכם?
          </h1>
          <div className="mt-8">
            <StampBox idPrefix="start" />
          </div>
          <p className="mt-4 text-center text-sm text-muted">{facts}</p>
        </div>
      </div>
    </section>
  );
}
