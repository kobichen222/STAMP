import { describe, expect, it } from 'vitest';
import { baseDirection, visualOrder } from '@/designer/bidi';

const v = (s: string) => visualOrder(s).join('');

describe('bidi', () => {
  it('reverses pure Hebrew', () => {
    expect(v('שלום')).toBe('םולש');
  });
  it('keeps numbers left-to-right inside Hebrew', () => {
    expect(v('טל 03-6733770')).toBe('03-6733770 לט');
    expect(v('מ.ר. 12345')).toBe('12345 .ר.מ');
  });
  it('keeps Latin words intact', () => {
    expect(v('אתר www.stamp2go.co.il')).toBe('www.stamp2go.co.il רתא');
  });
  it('mirrors brackets in RTL runs', () => {
    expect(v('חותמת (עגולה)')).toBe('(הלוגע) תמתוח');
  });
  it('treats Latin-only lines as LTR', () => {
    expect(baseDirection('Stamp2Go Ltd')).toBe('ltr');
    expect(v('Stamp2Go Ltd')).toBe('Stamp2Go Ltd');
  });
});
