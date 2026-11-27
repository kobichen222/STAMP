'use client';

import { useEffect, useState } from 'react';
import { motionReduced } from '@/lib/motion';

/**
 * Phones only: one button that takes the visitor back to the text box at the top.
 * Hidden while either text box is on screen. It sits between the two round floating
 * buttons (accessibility on one side, WhatsApp on the other), below the cookie notice.
 */
export function StartBar() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const boxes = Array.from(document.querySelectorAll('[data-stamp-box]'));
    if (!boxes.length || typeof IntersectionObserver === 'undefined') return;
    const onScreen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) onScreen.add(e.target);
        else onScreen.delete(e.target);
      }
      setHidden(onScreen.size > 0);
    });
    boxes.forEach((b) => io.observe(b));
    return () => io.disconnect();
  }, []);

  const goToBox = () => {
    document.getElementById('start')?.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'start' });
    document.getElementById('start-text')?.focus({ preventScroll: true });
  };

  return (
    <div
      className={`fixed inset-x-[4.75rem] bottom-3 z-40 transition duration-300 md:hidden ${hidden ? 'pointer-events-none translate-y-4 opacity-0' : 'opacity-100'}`}
      aria-hidden={hidden}
    >
      <button type="button" onClick={goToBox} tabIndex={hidden ? -1 : undefined} className="btn-primary !h-14 w-full font-bold">
        הכינו לי חותמת
      </button>
    </div>
  );
}
