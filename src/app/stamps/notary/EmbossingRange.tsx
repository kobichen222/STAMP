import Link from 'next/link';
import { Img } from '@/components/Img';
import { formatPrice } from '@/lib/format';
import type { ImageRef } from '@/lib/types';

/**
 * COLOP's embossing-press range (colop.com → Traditional Stamps → Embossing
 * Presses), in Hebrew: three presses with their sample embossings and the
 * three foil seal labels. Photos and samples © COLOP GmbH (/public/img/colop).
 */
const img = (src: string, alt: string, width: number, height: number): ImageRef => ({ src, alt, width, height });

interface Press {
  id: string;
  name: string;
  size: string;
  lines: string;
  text: string;
  image: ImageRef;
  imprint: ImageRef;
  /** Fixed list price; undefined = price on request. */
  price?: number;
}

const PRESSES: Press[] = [
  {
    id: 'r41',
    name: 'מכבש הבלטה R 41 – עגול',
    size: 'קוטר 41 מ״מ',
    lines: 'עד 7 שורות',
    text: 'עיצוב אלגנטי ופונקציונליות מיטבית להבלטה עגולה בקוטר 41 מ״מ. הדגם המקובל לחותם נוטריון, מגיע בנרתיק מגן קומפקטי.',
    image: img('/img/colop/embossing-press-r41.jpg', 'מכבש הבלטה COLOP R 41', 1000, 1000),
    imprint: img('/img/colop/notary-seal-sample.png', 'דוגמת הבלטה של חותם נוטריון 41 מ״מ – NOTARY · NOTAIRE · נוטריון', 900, 900),
    price: 780,
  },
  {
    id: 'r51',
    name: 'מכבש הבלטה R 51 – עגול',
    size: 'קוטר 51 מ״מ',
    lines: 'עד 8 שורות',
    text: 'אותו מנגנון מאוזן, בקוטר גדול יותר של 51 מ״מ – לחותמות רשמיות עם לוגו מפורט וטקסט מסביב. כולל נרתיק מגן.',
    image: img('/img/colop/embossing-press-r51.jpg', 'מכבש הבלטה COLOP R 51', 1000, 1000),
    imprint: img('/img/colop/embossing-press-r51-imprint.jpg', 'דוגמת הבלטה עגולה 51 מ״מ', 605, 600),
  },
  {
    id: '50x25',
    name: 'מכבש הבלטה מלבני',
    size: '50 × 25 מ״מ',
    lines: 'עד 4 שורות',
    text: 'הבלטה נוחה ונעימה לשטח מלבני עד 25 × 50 מ״מ – לשם וכתובת, לחותמת ספרייה (אקס־ליבריס) או לניירת משרדית.',
    image: img('/img/colop/embossing-press-50x25.jpg', 'מכבש הבלטה COLOP מלבני 50×25 מ״מ', 1000, 1000),
    imprint: img('/img/colop/embossing-press-50x25-imprint.jpg', 'דוגמת הבלטה מלבנית 50×25 מ״מ', 593, 297),
  },
];

const LABELS: { id: string; name: string; text: string; image: ImageRef }[] = [
  { id: 'red', name: 'מדבקות הבלטה – אדום', text: 'גליל מדבקות נייר כסף אדומות בקוטר 55 מ״מ עם שוליים משוננים.', image: img('/img/colop/embossing-label-red.jpg', 'מדבקות הבלטה אדומות', 1000, 1000) },
  { id: 'silver', name: 'מדבקות הבלטה – כסף', text: 'גליל מדבקות נייר כסף כסופות בקוטר 55 מ״מ עם שוליים משוננים.', image: img('/img/colop/embossing-label-silver.jpg', 'מדבקות הבלטה כסופות', 1000, 1000) },
  { id: 'gold', name: 'מדבקות הבלטה – זהב', text: 'גליל מדבקות נייר כסף מוזהבות בקוטר 55 מ״מ עם שוליים משוננים.', image: img('/img/colop/embossing-label-gold.jpg', 'מדבקות הבלטה מוזהבות', 1000, 1000) },
];

function Cta({ price }: { price?: number }) {
  return price != null ? (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xl font-bold">
        {formatPrice(price)} <span className="text-xs font-normal text-muted">כולל מע״מ</span>
      </p>
      <a href="#order" className="btn-primary">
        להזמנה
      </a>
    </div>
  ) : (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-muted">מחיר לפי פנייה</p>
      <Link href="/contact/" className="btn-outline">
        לפרטים ולהזמנה
      </Link>
    </div>
  );
}

export function EmbossingRange() {
  return (
    <section className="container-x pb-16" aria-labelledby="emboss-range">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">סדרת ההבלטה של COLOP</p>
        <h2 id="emboss-range" className="mt-2 text-3xl font-extrabold sm:text-4xl">
          השאירו רושם מרשים
        </h2>
        <p className="mt-4 text-lg leading-8 text-muted">
          מכבש ההבלטה של COLOP משלב עיצוב מאוזן ופונקציונליות מיטבית: לחיצה אחת מבליטה את השם, הלוגו ומספר הרישיון בנייר – בלי דיו, בלי כתמים, ובצורה שלא ניתן לזייף בצילום.
        </p>
      </div>

      <h3 className="mt-12 mb-5 text-xl font-bold">מכבשי הבלטה</h3>
      <div className="grid gap-5 lg:grid-cols-3">
        {PRESSES.map((p) => (
          <article key={p.id} className="card flex flex-col p-5">
            <div className="grid grid-cols-[1.2fr_1fr] items-center gap-3">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-gradient-to-b from-surface to-white p-2">
                <Img image={p.image} className="h-full w-full object-contain" />
              </div>
              <figure className="m-0">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-line bg-white p-2">
                  <Img image={p.imprint} className="h-full w-full object-contain" />
                </div>
                <figcaption className="mt-1.5 text-center text-[11px] text-muted">דוגמת הבלטה</figcaption>
              </figure>
            </div>
            <h4 className="mt-4 text-lg font-bold">{p.name}</h4>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="chip">{p.size}</span>
              <span className="chip">{p.lines}</span>
              <span className="chip">הבלטה ללא דיו</span>
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-muted">{p.text}</p>
            <Cta price={p.price} />
          </article>
        ))}
      </div>

      <h3 className="mt-12 mb-2 text-xl font-bold">מדבקות הבלטה – מראה של חותם שעווה</h3>
      <p className="mb-5 max-w-2xl text-muted">מדביקים על המסמך ומבליטים עליהן: המדבקה המבריקה מדגישה את ההבלטה ונותנת למסמך מראה רשמי וחגיגי. מתאימות למכבשים העגולים 41 ו־51 מ״מ.</p>
      <div className="grid gap-5 sm:grid-cols-3">
        {LABELS.map((l) => (
          <article key={l.id} className="card flex flex-col p-5">
            <div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-gradient-to-b from-surface to-white p-4">
              <Img image={l.image} className="h-full w-full object-contain" />
            </div>
            <h4 className="mt-4 text-lg font-bold">{l.name}</h4>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="chip">קוטר 55 מ״מ</span>
              <span className="chip">שוליים משוננים</span>
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-muted">{l.text}</p>
            <Cta />
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">תמונות המוצרים ודוגמאות ההבלטה: COLOP GmbH.</p>
    </section>
  );
}
