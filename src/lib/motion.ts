'use client';

import { useEffect, useState } from 'react';

/** True when the OS asks for reduced motion or the accessibility menu stopped animations. */
export function motionReduced(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.a11yMotion === 'off';
}

/** Reactive version – updates when the accessibility menu changes. */
export function useMotionReduced(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const update = () => setReduced(motionReduced());
    update();
    window.addEventListener('a11y:change', update);
    return () => window.removeEventListener('a11y:change', update);
  }, []);
  return reduced;
}
