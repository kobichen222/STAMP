import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

const STEPS = [
  { title: 'כותבים מה צריך להיות בחותמת', text: 'שם, תפקיד, טלפון – שורה אחרי שורה.' },
  { title: 'רואים את החותמת ומאשרים', text: 'תצוגת הטבעה אמיתית לפני הייצור.' },
  { title: 'מקבלים באיסוף או במשלוח', text: 'איסוף ברמת גן, או משלוח עד הבית.' },
] as const;

/** Home page: the three steps, one short line each. The full story lives on /how-it-works/. */
export function HowItWorks() {
  return (
    <section id="how" className="container-x scroll-mt-28 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="eyebrow">איך זה עובד</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">שלושה צעדים. בלי גרפיקאי.</h2>
        </div>
        <Link href="/how-it-works/" className="inline-flex items-center gap-1 text-sm font-medium text-blue hover:underline">
          לסיפור המלא <Icon name="arrowLeft" size={15} />
        </Link>
      </div>

      <ol className="relative mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-5 lg:gap-6">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card flex items-start gap-4 p-4 sm:block sm:p-5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue text-sm font-extrabold text-white shadow-[0_6px_16px_-6px_rgba(36,87,255,.7)] sm:h-10 sm:w-10 sm:text-base">
              {i + 1}
            </span>
            <div className="sm:mt-4">
              <h3 className="text-[17px] font-bold sm:text-xl">{s.title}</h3>
              <p className="mt-1 text-[14.5px] leading-6 text-muted sm:mt-1.5 sm:text-[15px] sm:leading-7">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
