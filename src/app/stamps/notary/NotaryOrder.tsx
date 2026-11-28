'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { QuantityStepper } from '@/components/catalog/ProductConfigurator';
import { Icon } from '@/components/ui/Icon';
import { composeLayout } from '@/designer/compose';
import { formatSize } from '@/designer/models';
import { toProductionSvg } from '@/designer/production';
import { renderDesign } from '@/designer/render';
import { StampSvg } from '@/designer/StampSvg';
import type { StampModel } from '@/designer/types';
import { useFaces } from '@/designer/useFaces';
import { addToCart } from '@/lib/cart-store';
import { formatPrice } from '@/lib/format';

const SAMPLE_NAME = 'ישראל ישראלי';
const SAMPLE_LICENSE = '1234';

/**
 * Order form for the notary embossing seal: the customer types the notary's
 * name and licence number, sees the engine-rendered die layout live, picks a
 * quantity and adds the finished design straight to the cart. An embossing
 * press has no ink, so there is no ink / body colour choice.
 */
export function NotaryOrder({ slug, title, price, model }: { slug: string; title: string; price: number | null; model: StampModel }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [qty, setQty] = useState(1);
  const filled = name.trim().length >= 2 && license.trim().length >= 1;

  const design = useMemo(
    () => composeLayout(model, { arcTop: `${name.trim() || SAMPLE_NAME}, נוטריון`, arcBottom: `רישיון נוטריון ${license.trim() || SAMPLE_LICENSE}`, lines: ['נוטריון'] }, 'classic'),
    [model, name, license],
  );
  const { resolve, ready, version } = useFaces([design]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` re-renders once more faces are loaded
  const render = useMemo(() => (ready ? renderDesign(design, resolve) : null), [design, resolve, ready, version]);

  const add = () => {
    if (!render || !filled) return;
    addToCart({
      productSlug: slug,
      productName: title,
      modelId: model.id,
      size: formatSize(model),
      design,
      previewSvg: toProductionSvg(render),
      ink: design.inkColor,
      quantity: qty,
      unitPrice: price,
      fixedPrice: true,
    });
    router.push('/cart/?added=1');
  };

  return (
    <div className="mt-6 space-y-5 rounded-2xl border border-line p-5">
      <div className="grid place-items-center rounded-xl bg-[#fdfcf8] p-4">
        {render ? (
          <StampSvg render={render} ink="black" className="w-full max-w-[220px]" title="תצוגה מקדימה של לוחית ההבלטה" />
        ) : (
          <div className="aspect-square w-full max-w-[220px] animate-pulse rounded-full bg-line/50" />
        )}
        <p className="mt-2 text-center text-xs text-muted">תצוגה חיה של לוחית ההבלטה – {formatSize(model)}. הטקסט מתעדכן בזמן ההקלדה.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">שם הנוטריון</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={SAMPLE_NAME} autoComplete="name" />
        </label>
        <label className="block">
          <span className="label">מספר רישיון נוטריון</span>
          <input className="input" value={license} onChange={(e) => setLicense(e.target.value)} placeholder={SAMPLE_LICENSE} inputMode="numeric" dir="ltr" />
        </label>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label">כמות</p>
          <QuantityStepper value={qty} onChange={setQty} />
        </div>
        {price != null && (
          <p className="text-left text-sm text-muted">
            סה״כ <strong className="block text-2xl text-ink">{formatPrice(price * qty)}</strong>
          </p>
        )}
      </div>

      <button type="button" className="btn-primary btn-lg w-full" onClick={add} disabled={!render || !filled}>
        <Icon name="cart" size={18} /> הוספה לסל
      </button>
      {!filled && <p className="text-center text-xs text-muted">הזינו את שם הנוטריון ומספר הרישיון כדי להוסיף לסל.</p>}
      <p className="text-center text-xs text-muted">
        רוצים עיצוב אחר (אנגלית, מאזניים, לוגו)?{' '}
        <Link href={`/designer/${slug}/?template=notary-round&qty=${qty}`} className="text-blue underline">
          פתחו את העורך
        </Link>
      </p>
    </div>
  );
}
