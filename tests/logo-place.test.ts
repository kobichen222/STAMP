/** Logo placement in generated layouts: beside the text (right / left) or centred above it – always inside the stamp. */
import { describe, expect, it } from 'vitest';
import { composeLayout } from '@/designer/compose';
import type { ImageElement, StampModel, TextElement } from '@/designer/types';

const model = { id: 'm', shape: 'rect', width: 58, height: 22 } as unknown as StampModel;
const logo = { id: 'l', type: 'image', x: 0, y: 0, rotation: 0, width: 10, height: 10, src: '', vector: null, source: { name: 'l', mime: 'image/png', pxWidth: 100, pxHeight: 100, isVector: false } } as ImageElement;
const lines = ['חברת דוגמה בע״מ', 'ח.פ. 512345678', 'טל׳ 03-1234567'];
const parts = (place: 'side' | 'left' | 'top', scale = 1) => {
  const d = composeLayout(model, { lines, logo, logoPlace: place, logoScale: scale }, 'classic');
  const img = d.elements.find((e): e is ImageElement => e.type === 'image')!;
  const texts = d.elements.filter((e): e is TextElement => e.type === 'text');
  return { img, texts };
};

describe('logo placement', () => {
  it('keeps the logo inside the stamp in every place and size', () => {
    for (const place of ['side', 'left', 'top'] as const)
      for (const scale of [0.75, 1, 1.25]) {
        const { img } = parts(place, scale);
        expect(img.x - img.width / 2).toBeGreaterThanOrEqual(0.5);
        expect(img.x + img.width / 2).toBeLessThanOrEqual(model.width - 0.5);
        expect(img.y - img.height / 2).toBeGreaterThanOrEqual(0.5);
        expect(img.y + img.height / 2).toBeLessThanOrEqual(model.height - 0.5);
      }
  });

  it('puts it on the right, on the left, or above the text', () => {
    expect(parts('side').img.x).toBeGreaterThan(model.width / 2);
    expect(parts('left').img.x).toBeLessThan(model.width / 2);
    const top = parts('top');
    expect(Math.abs(top.img.x - model.width / 2)).toBeLessThan(0.2);
    for (const t of top.texts) expect(t.y).toBeGreaterThan(top.img.y + top.img.height / 2);
  });

  it('a larger scale gives a larger logo', () => {
    expect(parts('top', 1.25).img.width).toBeGreaterThan(parts('top', 0.75).img.width);
    expect(parts('side', 1.25).img.width).toBeGreaterThanOrEqual(parts('side', 0.75).img.width);
  });
});
