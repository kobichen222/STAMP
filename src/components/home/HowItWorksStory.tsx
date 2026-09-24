'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { LazyTemplatePreview as TemplatePreview } from '@/designer/LazyTemplatePreview';
import type { StampModel } from '@/designer/types';
import { SITE } from '@/lib/config';

const MODEL: StampModel = { id: 'print-40', name: 'PRINT 40', shape: 'rect', width: 58, height: 22 };
const STEPS = [
  {
    title: 'בוחרים חותמת',
    text: 'מלבנית, עגולה, כיס, תאריכון או חותמת חתימה – כולן על גופי COLOP מאוסטריה. העורך נפתח במידות ההחתמה האמיתיות של הדגם.',
    tag: 'מידות אמיתיות',
  },
  {
    title: 'מעצבים – או שאנחנו מעצבים',
    text: 'מתחילים מתבנית או מדף ריק: טקסט, לוגו, מסגרת ואייקונים. מעדיפים שנעשה את זה? שלחו לנו את התוכן, נעצב ונשלח סקיצה לאישור.',
    tag: 'עריכה חיה',
  },
  {
    title: 'רואים ומאשרים',
    text: 'תצוגת הטבעה אמיתית בצבע הדיו שבחרתם. בדיקת ייצור אוטומטית מוודאת שהטקסט לא קטן מדי ושהכול ייצא חד.',
    tag: '✓ מוכן לייצור',
  },
  {
    title: 'חריטת לייזר – 20 שניות',
    text: 'הקובץ הווקטורי עובר ישר למכונת הלייזר, שחורטת את הגומי ישירות – בלי גלופת פולימר ובלי המתנה. החותמת מורכבת ומוכנה תוך 2 דקות.',
    tag: 'חריטת לייזר',
  },
  {
    title: 'מקבלים',
    text: `איסוף עצמי מ${SITE.address}, משלוח בגוש דן תוך שעות ספורות או שליח לכל הארץ תוך 1–2 ימים. גם חותמת אחת בלבד – בשמחה.`,
    tag: 'מוכנה לאיסוף',
  },
];

function Visual({ step, compact = false }: { step: number; compact?: boolean }) {
  const content = step === 0 ? { lines: ['58 × 22 מ״מ'] } : { lines: ['ישראל ישראלי', 'עורך דין ונוטריון', 'מ.ר. 12345'] };
  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-blue-50 to-white ${compact ? 'aspect-[16/9] p-6' : 'aspect-square p-10'}`}>
      {step === 3 && <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(to_bottom,transparent,rgba(36,87,255,.08))]" />}
      <div
        className={`transition-all duration-700 ${compact ? 'w-[82%]' : 'w-full'}`}
        style={{
          transform: step === 3 ? 'scaleX(-1)' : step === 4 ? 'translateY(-6%) scale(.85) rotate(-4deg)' : 'none',
          filter: step >= 2 ? 'none' : 'grayscale(1) opacity(.6)',
        }}
      >
        <div className={`rounded-lg bg-white p-2 shadow-lift transition ${step === 0 ? 'outline-2 outline-dashed outline-blue/40' : ''}`}>
          <TemplatePreview model={MODEL} content={content} style={step === 0 ? 'minimal' : 'classic'} ink={step >= 2 && step !== 3 ? 'blue' : 'black'} className="w-full" />
        </div>
      </div>
      <span className="absolute bottom-3 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-soft">{STEPS[step].tag}</span>
    </div>
  );
}

export function HowItWorksStory() {
  const [step, setStep] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setStep(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  return (
    <div className="container-x grid gap-10 py-10 sm:py-16 lg:grid-cols-2">
      <ol className="relative space-y-5 lg:space-y-0">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            data-i={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`card overflow-hidden transition-opacity duration-500 lg:flex lg:min-h-[60vh] lg:flex-col lg:justify-center lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none ${step === i ? '' : 'lg:opacity-35'}`}
          >
            <div className="lg:hidden">
              <Visual step={i} compact />
            </div>
            <div className="p-5 lg:p-0">
              <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-blue text-sm font-extrabold text-white lg:h-auto lg:w-auto lg:bg-transparent lg:font-mono lg:text-base lg:font-normal lg:text-blue">
                {i + 1}
              </span>
              <h2 className="mt-2 text-xl font-extrabold sm:text-3xl lg:text-4xl">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-7 text-muted sm:text-lg sm:leading-8 lg:mt-4 lg:max-w-md">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="hidden lg:block">
        <div className="sticky top-28">
          <Visual step={step} />
        </div>
      </div>
    </div>
  );
}

/** Two ways to get a stamp – shown after the steps. */
export function HowItWorksPaths() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/designer/" className="group card flex items-start gap-4 p-6 transition hover:-translate-y-1 hover:shadow-lift">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue text-white">
          <Icon name="sparkles" size={22} />
        </span>
        <span>
          <span className="block text-lg font-bold">מעצבים לבד באתר</span>
          <span className="mt-1 block text-[15px] leading-7 text-muted">תבנית מוכנה, עריכה חיה ובדיקת ייצור – תוך דקה.</span>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue">
            להתחיל לעצב <Icon name="arrowLeft" size={15} />
          </span>
        </span>
      </Link>
      <a href={SITE.whatsapp} target="_blank" rel="noopener" className="group card flex items-start gap-4 p-6 transition hover:-translate-y-1 hover:shadow-lift">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-white">
          <Icon name="whatsapp" size={22} />
        </span>
        <span>
          <span className="block text-lg font-bold">שולחים לנו את התוכן</span>
          <span className="mt-1 block text-[15px] leading-7 text-muted">נעצב עבורכם, נשלח סקיצה לתיקונים – ורק כשתהיו מרוצים נייצר.</span>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue">
            שליחה בוואטסאפ <Icon name="arrowLeft" size={15} />
          </span>
        </span>
      </a>
    </div>
  );
}
