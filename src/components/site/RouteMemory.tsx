'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export const LAST_PAGE_KEY = 's2g-last-page';

/** Remembers the last page outside the designer, so closing the editor returns there. */
export function RouteMemory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    if (pathname.startsWith('/designer')) return;
    try {
      sessionStorage.setItem(LAST_PAGE_KEY, pathname + (search ? `?${search}` : ''));
    } catch {
      /* private mode */
    }
  }, [pathname, search]);
  return null;
}

/** Where to go when leaving the editor: the page the customer came from, else home. */
export function lastPage(): string {
  try {
    const saved = sessionStorage.getItem(LAST_PAGE_KEY);
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.origin === window.location.origin && !ref.pathname.startsWith('/designer')) return ref.pathname + ref.search;
  } catch {
    /* ignore */
  }
  return '/';
}
