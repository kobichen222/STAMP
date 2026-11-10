import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

const STEPS = [
  ['כותבים את התוכן', 'שם, תפקיד, טלפון – שורה אחרי שורה.'],
  ['בוחרים מוצר', 'רק מידות שהטקסט נכנס בהן, עם מחיר.'],
  ['בוחרים עיצוב', '3 עיצובים מוכנים במידה המדויקת.'],
  ['רואים ומזמינים', 'המחשה מלאה, צבע דיו – ולהזמנה.'],
] as const;

const LINES = ['עו״ד ישראל ישראלי', 'מ.ר. 12345', 'טל׳ 050-1234567'];

/** A tiny stamp drawn in SVG for the illustration. */
function MiniStamp({ variant, on }: { variant: 'classic' | 'modern' | 'minimal'; on?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-1.5 transition ${on ? 'border-blue shadow-[0_10px_24px_-12px_rgba(36,87,255,.7)] ring-2 ring-blue/20' : 'border-line'}`}>
      <svg viewBox="0 0 100 44" className="w-full" aria-hidden>
        {variant === 'classic' && <rect x="3" y="3" width="94" height="38" rx="2" fill="none" stroke="#0b1426" strokeWidth="2.4" />}
        {variant === 'modern' && <rect x="50" y="16.5" width="42" height="1.6" fill="#0b1426" />}
        <g fill="#0b1426" style={{ fontFamily: 'Heebo, Arial' }}>
          <text x={variant === 'modern' ? 92 : 50} y="14" textAnchor={variant === 'modern' ? 'start' : 'middle'} fontSize="9" fontWeight={variant === 'minimal' ? 500 : 800}>
            עו״ד ישראל ישראלי
          </text>
          <text x={variant === 'modern' ? 92 : 50} y="26" textAnchor={variant === 'modern' ? 'start' : 'middle'} fontSize="6.5">
            מ.ר. 12345
          </text>
          <text x={variant === 'modern' ? 92 : 50} y="36" textAnchor={variant === 'modern' ? 'start' : 'middle'} fontSize="6.5">
            טל׳ 050-1234567
          </text>
        </g>
      </svg>
    </div>
  );
}

/** Illustration of the flow: text → three designs → the chosen stamp, ready to order. */
function FlowArt() {
  return (
    <div className="relative">
      <style>{`
        @keyframes qd-type { 0%, 8% { clip-path: inset(0 0 0 100%) } 30%, 100% { clip-path: inset(0 0 0 0) } }
        @keyframes qd-pop { 0%, 55% { opacity: 0; transform: translateY(10px) scale(.96) } 65%, 100% { opacity: 1; transform: none } }
        .qd-line { animation: qd-type 6s ease-out infinite both }
        .qd-pop { animation: qd-pop 6s ease-out infinite both }
        @media (prefers-reduced-motion: reduce) { .qd-line, .qd-pop { animation: none } }
      `}</style>
      <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-blue/15 via-violet/10 to-transparent blur-2xl" aria-hidden />

      <div className="relative rounded-3xl border border-line/80 bg-white p-5 shadow-[0_30px_70px_-35px_rgba(11,20,38,.45)] sm:p-6">
        {/* step 1 – the text */}
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-blue text-[11px] text-white">1</span>
          מה יהיה כתוב על החותמת?
        </div>
        <div className="mt-2 space-y-1.5 rounded-xl border border-line bg-surface/60 p-3 text-[15px] font-medium">
          {LINES.map((l, i) => (
            <p key={l} className="qd-line" style={{ animationDelay: `${i * 0.35}s` }}>
              {l}
            </p>
          ))}
        </div>

        {/* step 3 – three designs */}
        <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-blue text-[11px] text-white">3</span>
          בחרו עיצוב
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <MiniStamp variant="classic" on />
          <MiniStamp variant="modern" />
          <MiniStamp variant="minimal" />
        </div>

        {/* step 4 – ready */}
        <div className="qd-pop mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-l from-blue-50 to-white p-3 ring-1 ring-blue/15">
          <div className="w-28 shrink-0">
            <MiniStamp variant="classic" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-bold">חותמת פרינט 20 · 38×14 מ״מ</p>
            <p className="mt-1 text-xs font-semibold text-ok">✓ מוכן לייצור</p>
          </div>
          <span className="rounded-xl bg-blue px-3 py-2 text-sm font-bold whitespace-nowrap text-white">להזמנה</span>
        </div>
      </div>
    </div>
  );
}

export function QuickDesign() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface via-white to-white py-14 sm:py-20" aria-labelledby="quick-design">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow">עיצוב מהיר</p>
          <h2 id="quick-design" className="mt-2 text-3xl leading-tight font-extrabold sm:text-4xl">
            כותבים את הטקסט.
            <br />
            <span className="grad-text">מקבלים חותמת מעוצבת.</span>
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted">בלי ניסיון בעיצוב ובלי לגרור כלום: כותבים מה צריך להופיע, ותוך דקה יש 3 עיצובים מוכנים לייצור – במידה של החותמת שבחרתם.</p>
          <ol className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-2.5 rounded-2xl border border-line/80 bg-white p-3 max-sm:flex-col sm:gap-3 sm:p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-base font-extrabold text-blue sm:h-9 sm:w-9">{i + 1}</span>
                <span>
                  <span className="block font-bold">{t}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-muted sm:text-sm sm:leading-6">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/ai-design/" className="btn-primary !h-14 !rounded-2xl !px-8 !text-lg font-bold shadow-[0_14px_30px_-12px_rgba(36,87,255,.8)] max-sm:w-full max-sm:justify-center">
              לעיצוב מהיר <Icon name="arrowLeft" size={20} />
            </Link>
            <span className="text-sm text-muted max-sm:w-full max-sm:text-center">כל מילה וכל ספרה נשמרות בדיוק כפי שכתבתם</span>
          </div>
        </div>
        <FlowArt />
      </div>
    </section>
  );
}
