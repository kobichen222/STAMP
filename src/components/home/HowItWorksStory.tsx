'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LazyTemplatePreview as TemplatePreview } from '@/designer/LazyTemplatePreview';
import type { StampModel } from '@/designer/types';

const MODEL: StampModel = { id: 'print-40', name: 'PRINT 40', shape: 'rect', width: 58, height: 22 };
const STEPS = [
  { title: 'בחירת מוצר', text: 'בוחרים סוג ומידה – מלבנית, עגולה, כיס או תאריכון. העורך נפתח במידות ההחתמה האמיתיות של הדגם.' },
  { title: 'עיצוב', text: 'מתחילים מתבנית או מדף ריק. מוסיפים טקסט, לוגו, מסגרת ואייקונים – גוררים, מיישרים, ומכוונים.' },
  { title: 'תצוגה מקדימה ובדיקה', text: 'רואים את החותמת על נייר ובצבע הדיו שבחרתם. בדיקת ייצור אוטומטית מוודאת שהכול ייצא חד.' },
  { title: 'ייצור', text: 'עם אישור ההזמנה נוצר קובץ וקטורי במידה אמיתית – ישר לתור הייצור ולמכונת הלייזר. 2 דקות.' },
  { title: 'משלוח', text: 'איסוף עצמי מרמת גן או משלוח עד הבית. מספר מעקב מתעדכן אצלכם באזור האישי.' },
];

function Visual({ step }: { step: number }) {
  const content = step === 0 ? { lines: ['58 × 22 מ״מ'] } : { lines: ['ישראל ישראלי', 'עורך דין ונוטריון', 'מ.ר. 12345'] };
  return (
    <div className="relative grid aspect-square place-items-center rounded-3xl border border-line bg-gradient-to-b from-surface to-white p-10">
      <div
        className="w-full transition-all duration-700"
        style={{
          transform: step === 3 ? 'scaleX(-1)' : step === 4 ? 'translateY(-8%) scale(.8) rotate(-4deg)' : 'none',
          filter: step >= 2 ? 'none' : 'grayscale(1) opacity(.55)',
        }}
      >
        <div className={`rounded-lg bg-white p-2 shadow-lift transition ${step === 0 ? 'outline-2 outline-dashed outline-blue/40' : ''}`}>
          <TemplatePreview model={MODEL} content={content} style={step === 0 ? 'minimal' : 'classic'} ink={step >= 2 ? 'blue' : 'black'} className="w-full" />
        </div>
      </div>
      <span className="absolute bottom-5 rounded-full bg-white px-3 py-1 text-xs font-medium shadow-soft">
        {['מידות אמיתיות', 'עריכה חיה', '✓ מוכן לייצור', 'קובץ ייצור (מראה)', 'בדרך אליכם'][step]}
      </span>
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
    <div className="container-x grid gap-10 py-16 lg:grid-cols-2">
      <div className="order-2 lg:order-1">
        {STEPS.map((s, i) => (
          <section
            key={s.title}
            data-i={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`flex min-h-[60vh] flex-col justify-center transition-opacity duration-500 ${step === i ? 'opacity-100' : 'opacity-35'}`}
          >
            <span className="font-mono text-blue">0{i + 1}</span>
            <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">{s.title}</h2>
            <p className="mt-4 max-w-md text-lg leading-8 text-muted">{s.text}</p>
          </section>
        ))}
        <div className="py-10">
          <Link href="/designer/" className="btn-primary btn-lg">
            להתחיל לעצב
          </Link>
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <div className="lg:sticky lg:top-28">
          <Visual step={step} />
        </div>
      </div>
    </div>
  );
}
