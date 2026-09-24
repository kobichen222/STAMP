import type { StampModel } from './types';

/**
 * Production Profile – the rules a SKU's production file must satisfy.
 * The designer's preflight reads its limits from here, and the production
 * engine reads mirror / outputs from here. The customer never chooses mirror.
 *
 * ⚠️ Values marked "confirm" must be verified against a real, successfully
 * produced CDR file and the laser machine settings (see docs/PRODUCTION.md).
 */
export interface ProductionProfile {
  id: string;
  safeMargin: number; // mm
  minFontPt: number;
  warnFontPt: number;
  minStroke: number; // mm
  warnStroke: number; // mm
  /** Mirror the production file horizontally (confirm with the machine). */
  mirror: boolean;
  outputs: ('svg' | 'pdf' | 'eps')[];
  colorMode: 'black';
  /** auto = straight to production; customer = proof must be approved; graphic = staff review. */
  approval: 'auto' | 'customer' | 'graphic';
}

export const BASE_PROFILE: ProductionProfile = {
  id: 'standard',
  safeMargin: 1,
  minFontPt: 6,
  warnFontPt: 7,
  minStroke: 0.2,
  warnStroke: 0.3,
  mirror: false, // confirm
  outputs: ['svg', 'pdf'],
  colorMode: 'black',
  approval: 'auto',
};

export function profileForModel(model: Pick<StampModel, 'shape' | 'width' | 'height'> & { id?: string; dateBand?: boolean }): ProductionProfile {
  const small = model.height <= 14 || model.width <= 20;
  const large = model.width >= 58;
  if (model.shape === 'round') {
    return { ...BASE_PROFILE, id: 'round', safeMargin: 1.2, minFontPt: small ? 5.5 : 6 };
  }
  if (small) return { ...BASE_PROFILE, id: 'small', safeMargin: 0.8, minFontPt: 5.5, warnFontPt: 6.5 };
  if (large) return { ...BASE_PROFILE, id: 'large', minFontPt: 7, warnFontPt: 8 };
  if (model.dateBand) return { ...BASE_PROFILE, id: 'dater', approval: 'customer' };
  return BASE_PROFILE;
}
