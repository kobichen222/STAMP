/** Products added from the admin join the catalogue in its own shape, and are designable when they have a size. */
import { describe, expect, it } from 'vitest';
import { customStampArea, type CustomProduct } from '@/lib/admin-settings';
import { designerModelForProduct } from '@/designer/models';
import { customToProduct } from '@/server/settings';

const base: CustomProduct = {
  id: 900123,
  slug: 'חותמת-פרינט-60',
  title: 'חותמת פרינט 60',
  price: 159,
  categoryIds: [21],
  shape: 'rect',
  width: 76,
  height: 37,
  rowsCount: '7 עד 8 שורות',
  shortDescription: 'קצר',
  description: 'פסקה <b>אחת</b>\n\nפסקה שנייה',
  createdAt: '2026-11-25T00:00:00.000Z',
};

describe('custom products', () => {
  it('becomes a catalogue product with a page, price, category and safe text', () => {
    const p = customToProduct(base);
    expect(p).toMatchObject({ id: 900123, path: '/stamp/חותמת-פרינט-60/', price: 159, categoryIds: [21], primaryCategoryId: 21, stampArea: '76*37', custom: true, hidden: false });
    expect(p.blocks).toEqual([{ type: 'html', html: '<p>פסקה &lt;b&gt;אחת&lt;/b&gt;</p><p>פסקה שנייה</p>' }]);
  });
  it('opens in the designer at its size; round by diameter; no size = not designable', () => {
    expect(designerModelForProduct(customToProduct(base))).toMatchObject({ shape: 'rect', width: 76, height: 37, maxLines: 8 });
    expect(designerModelForProduct(customToProduct({ ...base, shape: 'round', width: 40, height: null }))).toMatchObject({ shape: 'round', width: 40, height: 40 });
    expect(customStampArea({ shape: 'rect', width: null, height: null })).toBeNull();
    expect(designerModelForProduct(customToProduct({ ...base, width: null }))).toBeNull();
  });
});
