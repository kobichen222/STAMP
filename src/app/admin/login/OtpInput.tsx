'use client';

import { useRef, useState } from 'react';

/** Six digit boxes: auto-advance, backspace, paste and SMS/mail autofill; submits when full. */
export function OtpInput({ name = 'code' }: { name?: string }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const hidden = useRef<HTMLInputElement>(null);

  const commit = (next: string[]) => {
    setDigits(next);
    if (next.every(Boolean)) {
      if (hidden.current) hidden.current.value = next.join('');
      hidden.current?.form?.requestSubmit();
    }
  };
  const fill = (from: number, text: string) => {
    const nums = text.replace(/\D/g, '').slice(0, 6 - from).split('');
    if (!nums.length) return;
    const next = [...digits];
    nums.forEach((d, i) => (next[from + i] = d));
    refs.current[Math.min(from + nums.length, 5)]?.focus();
    commit(next);
  };

  return (
    <div dir="ltr" className="flex justify-between gap-2 sm:gap-2.5">
      <input ref={hidden} type="hidden" name={name} value={digits.join('')} readOnly />
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          autoFocus={i === 0}
          aria-label={`ספרה ${i + 1}`}
          className="h-14 w-full min-w-0 rounded-xl border-2 border-line bg-white text-center text-2xl font-extrabold text-ink caret-blue shadow-sm transition outline-none focus:border-blue focus:ring-4 focus:ring-blue/15 sm:h-16 sm:text-3xl"
          onChange={(e) => {
            const v = e.target.value;
            if (v.length > 1) return fill(i, v);
            const next = [...digits];
            next[i] = v.replace(/\D/g, '');
            if (next[i] && i < 5) refs.current[i + 1]?.focus();
            commit(next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            fill(i, e.clipboardData.getData('text'));
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
