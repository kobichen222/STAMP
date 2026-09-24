import Link from 'next/link';

const STEPS = [
  { n: '01', title: 'בחרו חותמת', text: 'מלבנית, עגולה, כיס או תאריכון – כל דגם במידות האמיתיות שלו.', anim: 'pick' },
  { n: '02', title: 'עצבו אונליין', text: 'תבנית מוכנה או עיצוב מאפס: טקסט, לוגו, מסגרות ואייקונים.', anim: 'type' },
  { n: '03', title: 'צפו בתוצאה', text: 'תצוגה מקדימה מדויקת ובדיקת ייצור אוטומטית לפני ההזמנה.', anim: 'check' },
  { n: '04', title: 'הזמינו וקבלו', text: 'הקובץ עובר ישירות לייצור. איסוף מרמת גן או משלוח עד הבית.', anim: 'ship' },
];

function StepArt({ kind }: { kind: string }) {
  // Tiny, CSS-only micro interactions (play on hover / focus).
  if (kind === 'pick')
    return (
      <div className="flex h-full items-end justify-center gap-2">
        {[28, 40, 34].map((h, i) => (
          <span key={i} className={`w-10 rounded-md border border-line bg-white shadow-soft transition duration-500 group-hover:-translate-y-2 ${i === 1 ? 'border-blue ring-2 ring-blue/20 group-hover:-translate-y-4' : ''}`} style={{ height: h }} />
        ))}
      </div>
    );
  if (kind === 'type')
    return (
      <div className="grid h-full place-items-center">
        <div className="w-36 rounded-md border-2 border-ink/80 px-2 py-1.5 text-center text-[11px] leading-4 font-bold">
          <span className="block overflow-hidden whitespace-nowrap transition-[max-width] duration-700 [max-width:3.5rem] group-hover:[max-width:8rem]">ישראל ישראלי</span>
          <span className="block font-normal text-muted">עורך דין</span>
        </div>
      </div>
    );
  if (kind === 'check')
    return (
      <div className="grid h-full place-items-center">
        <span className="flex items-center gap-1.5 rounded-full bg-ok/10 px-3 py-1.5 text-xs font-semibold text-ok transition duration-500 group-hover:scale-110">
          ✓ מוכן לייצור
        </span>
      </div>
    );
  return (
    <div className="relative h-full overflow-hidden">
      <span className="absolute top-1/2 right-4 h-7 w-12 -translate-y-1/2 rounded-md bg-ink transition duration-700 group-hover:right-[calc(100%-4rem)]" />
      <span className="absolute inset-x-4 bottom-4 h-px bg-line" />
    </div>
  );
}

export function HowItWorks({ compact }: { compact?: boolean }) {
  return (
    <section id="how" className="container-x py-20 sm:py-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">איך זה עובד</p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">ארבעה צעדים. בלי גרפיקאי.</h2>
        </div>
        {!compact && (
          <Link href="/how-it-works/" className="text-sm font-medium text-blue hover:underline">
            לסיפור המלא ←
          </Link>
        )}
      </div>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <li key={s.n} tabIndex={0} className="group card p-5 outline-none transition hover:shadow-lift focus-visible:shadow-lift">
            <div className="h-24 rounded-xl bg-surface">
              <StepArt kind={s.anim} />
            </div>
            <p className="mt-5 font-mono text-sm text-blue">{s.n}</p>
            <h3 className="mt-1 text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-[15px] leading-7 text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
