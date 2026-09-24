'use client';

import { useSearchParams } from 'next/navigation';

/** /designer without a product: round templates open on a round stamp, everything else on PRINT 40. */
export function DesignerRouter({ roundTemplates, rect, round }: { roundTemplates: string[]; rect: React.ReactNode; round: React.ReactNode }) {
  const t = useSearchParams().get('template');
  return <>{t && roundTemplates.includes(t) ? round : rect}</>;
}
