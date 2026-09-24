import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

const STEPS = [
  { n: 1, title: 'בחרו חותמת', text: 'מלבנית, עגולה, כיס או תאריכון – גופי COLOP מאוסטריה, במידות האמיתיות.', art: 'pick' },
  { n: 2, title: 'עצבו – או שנעצב לכם', text: 'תבנית מוכנה או עיצוב מאפס. אפשר גם לשלוח תוכן ולקבל סקיצה לאישור.', art: 'design' },
  { n: 3, title: 'צפו ואשרו', text: 'תצוגת הטבעה אמיתית ובדיקת ייצור אוטומטית לפני ההזמנה.', art: 'preview' },
  { n: 4, title: 'חריטת לייזר וקבלה', text: 'הגומי נחרט תוך 20 שניות. איסוף ברמת גן, או משלוח בגוש דן תוך שעות.', art: 'ship' },
] as const;

const MOBILE_ICON: Record<(typeof STEPS)[number]['art'], string> = { pick: 'grid', design: 'text', preview: 'eye', ship: 'truck' };

/** Small stamp silhouette (handle + body + base), used in the "pick" art. */
function StampIcon({ w, active }: { w: number; active?: boolean }) {
  return (
    <svg viewBox="0 0 60 64" width={w} height={(w * 64) / 60} aria-hidden className="drop-shadow-sm">
      <rect x="18" y="2" width="24" height="16" rx="8" fill={active ? '#2457ff' : '#1c2a44'} />
      <rect x="8" y="16" width="44" height="30" rx="5" fill="#fff" stroke={active ? '#2457ff' : '#d5dbe5'} strokeWidth="2" />
      <rect x="14" y="26" width="32" height="3" rx="1.5" fill={active ? '#2457ff' : '#c7cfdb'} opacity=".7" />
      <rect x="4" y="46" width="52" height="10" rx="3" fill={active ? '#dfe7ff' : '#eef1f6'} stroke={active ? '#2457ff' : '#d5dbe5'} strokeWidth="1.5" />
    </svg>
  );
}

function StepArt({ kind }: { kind: (typeof STEPS)[number]['art'] }) {
  if (kind === 'pick')
    return (
      <div className="relative flex h-full items-end justify-center gap-3 pb-5">
        <span className="transition duration-500 group-hover:-translate-y-1">
          <StampIcon w={40} />
        </span>
        <span className="relative transition duration-500 group-hover:-translate-y-3">
          <StampIcon w={56} active />
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white tabular-nums">
            <bdi dir="ltr">58×22</bdi> מ״מ
          </span>
        </span>
        <span className="transition duration-500 group-hover:-translate-y-1">
          <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden className="mb-1 drop-shadow-sm">
            <circle cx="24" cy="24" r="21" fill="#fff" stroke="#d5dbe5" strokeWidth="2" />
            <circle cx="24" cy="24" r="12" fill="none" stroke="#c7cfdb" strokeWidth="1.5" />
          </svg>
        </span>
      </div>
    );
  if (kind === 'design')
    return (
      <div className="grid h-full place-items-center px-4">
        <div className="w-full max-w-[200px] overflow-hidden rounded-lg border border-line bg-white shadow-soft">
          <div className="flex items-center gap-1 border-b border-line px-2 py-1">
            {['text', 'image', 'star'].map((i, k) => (
              <span key={i} className={`grid h-5 w-5 place-items-center rounded ${k === 0 ? 'bg-blue-50 text-blue' : 'text-muted'}`}>
                <Icon name={i} size={12} />
              </span>
            ))}
            <span className="ms-auto h-1.5 w-8 rounded-full bg-line" />
          </div>
          <div className="p-2.5">
            <div className="rounded border-2 border-ink px-2 py-1.5 text-center leading-tight">
              <p className="text-[12px] font-extrabold whitespace-nowrap">
                ישראל ישראלי
                <span className="ms-px inline-block h-3 w-px translate-y-0.5 animate-pulse bg-blue" />
              </p>
              <p className="text-[9.5px] text-ink-2">עורך דין ונוטריון · מ.ר. 12345</p>
            </div>
          </div>
        </div>
      </div>
    );
  if (kind === 'preview')
    return (
      <div className="relative grid h-full place-items-center">
        <div className="relative -rotate-3 rounded-md bg-[#fdfcf8] px-4 py-3 shadow-soft transition duration-500 group-hover:rotate-0">
          <div className="rounded-sm border-2 border-[#1d4ed8]/85 px-3 py-1 text-center leading-tight text-[#1d4ed8]/90 [filter:url(#ink-rough)]">
            <p className="text-[12px] font-extrabold">ישראל ישראלי</p>
            <p className="text-[9.5px]">עורך דין ונוטריון</p>
          </div>
          <span className="absolute -bottom-3 -left-4 flex items-center gap-1 rounded-full bg-ok px-2.5 py-1 text-[11px] font-semibold text-white shadow-soft transition duration-500 group-hover:scale-110">
            <Icon name="check" size={12} /> מוכן לייצור
          </span>
        </div>
        <svg width="0" height="0" className="absolute" aria-hidden>
          <filter id="ink-rough">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="1.2" />
          </filter>
        </svg>
      </div>
    );
  return (
    <div className="relative grid h-full place-items-center">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-blue shadow-soft transition duration-700 group-hover:-translate-x-2">
          <Icon name="truck" size={26} />
        </span>
        <div className="leading-tight">
          <p className="flex items-center gap-1 text-[12px] font-bold text-ink">
            <Icon name="clock" size={13} className="text-blue" /> מוכנה תוך 2 דקות
          </p>
          <p className="mt-1 text-[11px] text-muted">איסוף ברמת גן · משלוח עד הבית</p>
          <span className="mt-1.5 block h-1.5 w-28 overflow-hidden rounded-full bg-line">
            <span className="block h-full w-2/3 rounded-full bg-blue transition-[width] duration-700 group-hover:w-full" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function HowItWorks({ compact }: { compact?: boolean }) {
  return (
    <section id="how" className="container-x py-20 sm:py-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="eyebrow">איך זה עובד</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">ארבעה צעדים. בלי גרפיקאי.</h2>
          <p className="mt-3 text-muted">מבחירת הדגם ועד חותמת ביד – בלי גלופות, בלי הזמנה מראש ובלי לחזור פעמיים.</p>
        </div>
        {!compact && (
          <Link href="/how-it-works/" className="inline-flex items-center gap-1 text-sm font-medium text-blue hover:underline">
            לסיפור המלא <Icon name="arrowLeft" size={15} />
          </Link>
        )}
      </div>

      <ol className="relative mt-8 grid gap-3 sm:mt-12 sm:gap-5 lg:grid-cols-4 lg:gap-6">
        {/* Connector behind the step numbers (desktop) */}
        <span aria-hidden className="absolute inset-x-[12%] top-5 hidden border-t-2 border-dashed border-blue/25 lg:block" />
        {STEPS.map((s, i) => (
          <li key={s.n} className="group relative grid grid-cols-[2rem_1fr] gap-x-3 sm:grid-cols-[2.5rem_1fr] sm:gap-x-4 lg:block">
            {/* Number + vertical line (mobile timeline) */}
            <div className="relative flex flex-col items-center lg:mb-4 lg:items-start">
              <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-blue text-sm font-extrabold sm:h-10 sm:w-10 sm:text-base text-white shadow-[0_6px_16px_-6px_rgba(36,87,255,.7)] ring-4 ring-white transition group-hover:scale-110">
                {s.n}
              </span>
              {i < STEPS.length - 1 && <span aria-hidden className="mt-1 w-0.5 flex-1 rounded-full bg-gradient-to-b from-blue/30 to-blue/5 lg:hidden" />}
            </div>
            <div tabIndex={0} className="card mb-1 flex overflow-hidden sm:mb-2 sm:block outline-none transition duration-300 group-hover:-translate-y-1 group-hover:shadow-lift focus-visible:shadow-lift lg:mb-0">
              <div className="hidden h-36 bg-gradient-to-b from-blue-50 to-surface sm:block">
                <StepArt kind={s.art} />
              </div>
              <span className="mt-4 ms-4 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-blue-50 to-surface text-blue ring-1 ring-blue/10 sm:hidden">
                <Icon name={MOBILE_ICON[s.art]} size={22} />
              </span>
              <div className="p-4 sm:p-5">
                <h3 className="text-[17px] font-bold sm:text-xl">{s.title}</h3>
                <p className="mt-1 text-[14.5px] leading-6 text-muted sm:mt-1.5 sm:text-[15px] sm:leading-7">{s.text}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {!compact && (
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/designer/" className="btn-primary btn-lg w-full sm:w-auto">
            <Icon name="sparkles" size={19} /> התחילו לעצב עכשיו
          </Link>
          <span className="text-sm text-muted">בלי הרשמה · שומרים אוטומטית</span>
        </div>
      )}
    </section>
  );
}
