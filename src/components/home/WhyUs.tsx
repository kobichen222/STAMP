import Link from 'next/link';
import { FaqList } from '@/components/site/FaqList';
import { Icon } from '@/components/ui/Icon';
import { SITE } from '@/lib/config';
import { WHY_FAQ } from '@/lib/faq';


/** Animated laser engraving a stamp plate (pure SVG + CSS, no JS) – in the site palette. */
export function LaserArt() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-white to-blue-50 p-5 shadow-soft sm:p-6">
      <style>{`
        @keyframes laser-x { 0%,100% { transform: translateX(0) } 50% { transform: translateX(-236px) } }
        @keyframes laser-reveal { 0% { clip-path: inset(0 0 0 100%) } 70%,100% { clip-path: inset(0 0 0 0) } }
        @keyframes laser-spark { 0%,100% { opacity: .35 } 50% { opacity: 1 } }
        .laser-head { animation: laser-x 4s ease-in-out infinite }
        .laser-text { animation: laser-reveal 4s linear infinite }
        .laser-spark { animation: laser-spark .18s linear infinite }
        @media (prefers-reduced-motion: reduce) { .laser-head, .laser-text, .laser-spark { animation: none } }
      `}</style>
      <div className="flex items-center justify-between text-xs font-medium text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue" /> חריטת לייזר · בזמן אמת
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 tabular-nums ring-1 ring-line">00:20</span>
      </div>
      <svg viewBox="0 0 320 160" className="mt-3 w-full" aria-hidden>
        <defs>
          <linearGradient id="beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#2457ff" stopOpacity=".05" />
            <stop offset="1" stopColor="#2457ff" stopOpacity=".85" />
          </linearGradient>
          <linearGradient id="plate" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1c2a44" />
            <stop offset="1" stopColor="#0b1426" />
          </linearGradient>
        </defs>
        {/* gantry */}
        <rect x="20" y="14" width="280" height="7" rx="3.5" fill="#dfe6f2" />
        <g className="laser-head" style={{ transformBox: 'view-box' }}>
          <rect x="262" y="8" width="30" height="24" rx="6" fill="#0b1426" />
          <rect x="268" y="13" width="18" height="4" rx="2" fill="#2457ff" />
          <rect x="272" y="32" width="10" height="9" rx="2" fill="#5b6678" />
          <path d="M277 41 L272 108 L282 108 Z" fill="url(#beam)" />
          <circle cx="277" cy="108" r="11" fill="#2457ff" opacity=".2" className="laser-spark" />
          <circle cx="277" cy="108" r="4" fill="#fff" stroke="#2457ff" strokeWidth="2" className="laser-spark" />
        </g>
        {/* plate */}
        <rect x="40" y="86" width="240" height="58" rx="8" fill="url(#plate)" />
        <g className="laser-text">
          <rect x="50" y="94" width="220" height="42" rx="3" fill="none" stroke="#fff" strokeWidth="2.5" />
          <text x="160" y="114" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" style={{ fontFamily: 'Heebo, Arial' }}>
            ישראל ישראלי
          </text>
          <text x="160" y="128" textAnchor="middle" fontSize="9" fill="#c7d4ff" style={{ fontFamily: 'Heebo, Arial' }}>
            עורך דין ונוטריון · מ.ר. 12345
          </text>
        </g>
      </svg>
      <p className="mt-2 text-center text-sm text-muted">הגומי נחרט ישירות מהקובץ – בלי גלופה, בלי המתנה.</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['20', 'שניות ייצור'],
          ['2', 'דקות עד חותמת ביד'],
          ['100%', 'תוצרת אוסטריה'],
        ].map(([n, l]) => (
          <div key={l} className="rounded-2xl bg-white px-2 py-3 ring-1 ring-line">
            <p className="text-2xl font-extrabold text-blue tabular-nums sm:text-3xl">{n}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WhyUs() {
  return (
    <section id="why" className="container-x py-20 sm:py-28">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">למה רק אצלנו?</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">מכונת הלייזר החזקה בעולם. ברמת גן.</h2>
          <p className="mt-4 text-lg leading-8 text-muted">
            בלי גלופות, בלי הזמנה מראש ובלי לחזור פעמיים. החותמת נחרטת בלייזר ומוכנה לשימוש תוך 2 דקות – על גוף חותמת COLOP מאוסטריה.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2 text-sm">
            {[
              ['shield', 'תוצרת אוסטריה · COLOP'],
              ['check', 'דיו בתקן אירופי'],
              ['clock', 'כל חותמת "דחופה"'],
              ['pin', 'איסוף ברמת גן'],
            ].map(([i, t]) => (
              <li key={t} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-medium">
                <Icon name={i} size={15} className="text-blue" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <LaserArt />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/designer/" className="btn-primary">
              עיצוב חותמת עכשיו
            </Link>
            <a href={SITE.whatsapp} target="_blank" rel="noopener" className="btn-outline">
              <Icon name="whatsapp" size={17} /> שלחו לנו את התוכן
            </a>
          </div>
        </div>
        <div className="self-start">
          <FaqList items={WHY_FAQ.slice(0, 5)} schema={false} openFirst compact />
          <details className="group/more mt-3">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-blue marker:hidden hover:bg-blue-50">
              <span className="group-open/more:hidden">עוד {WHY_FAQ.length - 5} שאלות</span>
              <span className="hidden group-open/more:inline">פחות שאלות</span>
              <Icon name="chevronDown" size={16} className="transition group-open/more:rotate-180" />
            </summary>
            <div className="mt-2">
              <FaqList items={WHY_FAQ.slice(5)} schema={false} compact />
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
