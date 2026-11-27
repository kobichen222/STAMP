import { Icon } from '@/components/ui/Icon';
import { StartBlock } from './StartBlock';

const PROMISES = [
  ['clock', 'מוכנה תוך 2 דקות'],
  ['truck', 'משלוח לכל הארץ או איסוף ברמת גן'],
  ['shield', 'אחריות והחזר כספי'],
] as const;

/**
 * First screen, like opening a chat app: one question, one input, one quiet line,
 * and the promise line on its bottom edge. Together they fill the viewport (minus the
 * announcement bar when there is one); when the window is too short the section simply
 * grows, so nothing overlaps. The top padding leaves room for the fixed header.
 */
export function HomeHero({ fromPrice, announcement = false }: { fromPrice: string | null; announcement?: boolean }) {
  return (
    <section
      id="start"
      aria-labelledby="start-title"
      className={`flex flex-col bg-gradient-to-b from-white via-white to-surface ${announcement ? 'min-h-[calc(100svh-2rem)]' : 'min-h-svh'}`}
    >
      <div className="container-x flex flex-1 flex-col items-center justify-center pt-24 pb-8 lg:pt-28 lg:pb-12">
        <StartBlock as="h1" idPrefix="start" focusOnLoad fromPrice={fromPrice} />
      </div>

      <div className="shrink-0 border-y border-line bg-white py-3 sm:py-6">
        <ul
          aria-label="ההבטחה שלנו"
          className="container-x flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[13px] font-semibold text-ink-2 sm:gap-x-10 sm:text-[15px]"
        >
          {PROMISES.map(([icon, text]) => (
            <li key={text} className="flex items-center gap-1.5 sm:gap-2">
              <Icon name={icon} size={16} className="shrink-0 text-blue sm:h-5 sm:w-5" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
