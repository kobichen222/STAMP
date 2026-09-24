'use client';

import { useEffect, useState } from 'react';

const STEPS = ['בחרו אלמנט על החותמת או מהפאנל.', 'ערכו אותו בפאנל ההגדרות.', 'גררו אותו על החותמת – קווי העזר יעזרו ליישר.', 'צפו בתוצאה לפני ההזמנה – ״תצוגה מקדימה״.'];
const KEY = 's2g-onboarding-done';

/** First-visit only, 4 short steps. */
export function Onboarding({ paused = false }: { paused?: boolean }) {
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setStep(0);
    } catch {
      /* ignore */
    }
  }, []);
  if (step == null || paused) return null;
  const done = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setStep(null);
  };
  return (
    <div className="fixed inset-x-3 top-16 z-[65] animate-fade-up rounded-2xl bg-ink p-4 text-white shadow-lift sm:inset-x-auto sm:right-4 sm:w-72 lg:top-auto lg:bottom-20 lg:right-[420px]" role="dialog" aria-label="היכרות עם העורך">
      <p className="text-xs text-white/60">
        {step + 1} / {STEPS.length}
      </p>
      <p className="mt-1 font-medium">{STEPS[step]}</p>
      <div className="mt-3 flex justify-between">
        <button type="button" className="text-sm text-white/70 hover:text-white" onClick={done}>
          דלג
        </button>
        <button type="button" className="rounded-full bg-white px-3 py-1 text-sm font-medium text-ink" onClick={() => (step + 1 < STEPS.length ? setStep(step + 1) : done())}>
          {step + 1 < STEPS.length ? 'הבא' : 'סיום'}
        </button>
      </div>
    </div>
  );
}
