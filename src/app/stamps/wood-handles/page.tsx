import Link from 'next/link';
import type { Metadata } from 'next';
import { Img } from '@/components/Img';
import { FaqList } from '@/components/site/FaqList';
import { PageHero } from '@/components/site/PageHero';
import { Icon } from '@/components/ui/Icon';
import { getStampCategory } from '@/lib/catalog';
import { SITE } from '@/lib/config';
import type { FaqItem } from '@/lib/faq';
import type { ImageRef } from '@/lib/types';

/**
 * Wooden-handle stamps and desk ink pads – a catalogue page (price on request).
 * Pad photos: COLOP (Micro 1–3, MAKE 1). Wooden-handle photos: cut from the
 * supplier sheet at mirkam.biz (see /public/img/wood).
 */
const cat = getStampCategory('wood-handles')!;
const PATH = '/stamps/wood-handles/';

export const metadata: Metadata = {
  title: cat.title,
  description: cat.description,
  alternates: { canonical: PATH },
  openGraph: { title: cat.title, description: cat.description, url: PATH, images: [{ url: '/img/wood/wood-rect.jpg', width: 960, height: 720 }] },
};

// ---------------------------------------------------------------- data
type Ink = 'black' | 'blue' | 'red' | 'purple' | 'green' | 'dry';
const INK: Record<Ink, { label: string; className: string }> = {
  black: { label: 'שחור', className: 'bg-[#1b1e24]' },
  blue: { label: 'כחול', className: 'bg-[#1f4fd8]' },
  red: { label: 'אדום', className: 'bg-[#d6283b]' },
  purple: { label: 'סגול', className: 'bg-[#7b4dff]' },
  green: { label: 'ירוק', className: 'bg-[#12a150]' },
  dry: { label: 'יבשה (ללא דיו)', className: 'bg-white ring-1 ring-inset ring-ink/30' },
};
const SIX: Ink[] = ['black', 'blue', 'red', 'purple', 'green', 'dry'];
const FOUR: Ink[] = ['black', 'blue', 'red', 'dry'];

const img = (src: string, alt: string): ImageRef => ({ src, alt, width: 960, height: 720 });

interface Variant {
  sizes: string[];
  pad: string;
  inks: Ink[];
}
interface WoodStamp {
  id: string;
  name: string;
  shape: string;
  text: string;
  image: ImageRef;
  variants: Variant[];
}

const WOOD: WoodStamp[] = [
  {
    id: 'rect',
    name: 'חותמת עץ מהודרת – מלבנית',
    shape: 'מלבן',
    text: 'ידית עץ מלוטשת עם פלטה מלבנית – הקלאסיקה של חותמות המשרד. מתאימה לשם, כתובת, לוגו קטן או חותמת "שולם".',
    image: img('/img/wood/wood-rect.jpg', 'חותמות עץ מלבניות בגדלים שונים'),
    variants: [{ sizes: ['40×15', '50×20', '60×30', '60×40', '70×30', '80×40'], pad: 'מיקרו 1', inks: SIX }],
  },
  {
    id: 'round',
    name: 'חותמת עץ מהודרת – עגולה',
    shape: 'עיגול',
    text: 'ידית עץ עם פלטה עגולה – לחותמות חברה, עמותה, לוגו או "מספרייתו של".',
    image: img('/img/wood/wood-round.jpg', 'חותמות עץ עגולות בקטרים שונים'),
    variants: [{ sizes: ['קוטר 20', 'קוטר 30', 'קוטר 40'], pad: 'מיקרו 1', inks: SIX }],
  },
  {
    id: 'rect-large',
    name: 'חותמת עץ מהודרת – מלבנית גדולה',
    shape: 'מלבן גדול',
    text: 'בסיס עץ רחב לשטח החתמה גדול – טפסים, טבלאות, לוגו גדול או הדפסה על שקיות וקרטונים.',
    image: img('/img/wood/wood-rect-large.jpg', 'חותמת עץ מלבנית גדולה'),
    variants: [
      { sizes: ['90×60'], pad: 'מיקרו 2', inks: SIX },
      { sizes: ['150×80'], pad: 'מיקרו 3', inks: FOUR },
    ],
  },
  {
    id: 'round-large',
    name: 'חותמת עץ מהודרת – עגולה גדולה',
    shape: 'עיגול גדול',
    text: 'פלטה עגולה גדולה עם ידית עץ – לחותמות רשמיות עם הרבה טקסט מסביב, לוגו מפורט או מיתוג על אריזות.',
    image: img('/img/wood/wood-round-large.jpg', 'חותמת עץ עגולה גדולה'),
    variants: [
      { sizes: ['קוטר 60'], pad: 'מיקרו 2', inks: SIX },
      { sizes: ['קוטר 85'], pad: 'מיקרו 3', inks: FOUR },
    ],
  },
];

const PADS = [
  { id: 'micro-1', name: 'כרית דיו שולחנית מיקרו 1', size: '90×50 מ״מ', fits: 'לפלטות עד 80×40 או קוטר 40', inks: SIX, image: img('/img/pads/micro-1.jpg', 'כרית שולחנית COLOP Micro 1') },
  { id: 'micro-2', name: 'כרית דיו שולחנית מיקרו 2', size: '110×70 מ״מ', fits: 'לפלטות עד 90×60 או קוטר 60', inks: SIX, image: img('/img/pads/micro-2.jpg', 'כרית שולחנית COLOP Micro 2') },
  { id: 'micro-3', name: 'כרית דיו שולחנית מיקרו 3', size: '160×90 מ״מ', fits: 'לפלטות עד 150×80 או קוטר 85', inks: FOUR, image: img('/img/pads/micro-3.jpg', 'כרית שולחנית COLOP Micro 3') },
];

const COLOR_PADS = [
  { id: 'pink', name: 'ורוד זרחני', swatch: '#f29ac8', image: img('/img/pads/make1-pink.jpg', 'כרית צבעונית ורוד זרחני') },
  { id: 'red', name: 'אדום עז', swatch: '#e8323f', image: img('/img/pads/make1-red.jpg', 'כרית צבעונית אדום עז') },
  { id: 'mint', name: 'ירוק מנטה', swatch: '#17a99a', image: img('/img/pads/make1-mint.jpg', 'כרית צבעונית ירוק מנטה') },
  { id: 'blue', name: 'תכלת', swatch: '#5fb2e6', image: img('/img/pads/make1-blue.jpg', 'כרית צבעונית תכלת') },
  { id: 'orange', name: 'כתום זרחני', swatch: '#f28a1c', image: img('/img/pads/make1-orange.jpg', 'כרית צבעונית כתום זרחני') },
];

const GUIDE = [
  ['מיקרו 1', 'עד 80×40 מ״מ', 'עד קוטר 40'],
  ['מיקרו 2', 'עד 90×60 מ״מ', 'עד קוטר 60'],
  ['מיקרו 3', 'עד 150×80 מ״מ', 'עד קוטר 85'],
];

const FAQ_ITEMS: FaqItem[] = [
  { q: 'איזו כרית דיו מתאימה לחותמת עץ?', a: 'הכרית צריכה להיות גדולה מפלטת הגומי. מיקרו 1 מתאימה לפלטות עד 80×40 מ״מ או קוטר 40, מיקרו 2 לפלטות עד 90×60 מ״מ או קוטר 60, ומיקרו 3 לפלטות עד 150×80 מ״מ או קוטר 85.' },
  { q: 'באילו צבעי דיו יש כריות שולחניות?', a: 'מיקרו 1 ומיקרו 2 זמינות בשחור, כחול, אדום, סגול וירוק, וגם יבשות ללא דיו. מיקרו 3 זמינה בשחור, כחול ואדום, או יבשה. בנוסף יש כריות צבעוניות בגודל מיקרו 1: ורוד זרחני, אדום עז, ירוק מנטה, תכלת וכתום זרחני.' },
  { q: 'מה ההבדל בין חותמת עץ לחותמת אוטומטית?', a: 'בחותמת אוטומטית הכרית מובנית בתוך גוף החותמת. חותמת עץ היא חותמת גומי עם ידית, ומחתימים איתה בעזרת כרית דיו שולחנית נפרדת. היא מאפשרת גדלים גדולים במיוחד ושימוש בכמה צבעי דיו עם אותה חותמת.' },
  { q: 'למה משמשת כרית לדיו מהיר ייבוש?', a: 'להחתמה על משטחים שאינם סופגים, כמו פלסטיק, מתכת, זכוכית ונייר מצופה. משתמשים בה עם דיו מהיר ייבוש שמתאים לחומר שעליו מחתימים.' },
];

const SECTIONS = [
  ['wood', 'חותמות ידית עץ'],
  ['pads', 'כריות שולחניות'],
  ['color-pads', 'כריות צבעוניות'],
  ['quick-dry', 'דיו מהיר ייבוש'],
] as const;

// ---------------------------------------------------------------- pieces
function InkDots({ inks }: { inks: Ink[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="צבעי דיו">
      {inks.map((k) => (
        <li key={k} title={INK[k].label} className={`h-4 w-4 rounded-full ${INK[k].className}`}>
          <span className="sr-only">{INK[k].label}</span>
        </li>
      ))}
    </ul>
  );
}

function Contact({ label = 'לפרטים ולהזמנה' }: { label?: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <span className="text-sm font-semibold text-muted">מחיר לפי פנייה</span>
      <Link href="/contact/" className="btn-outline btn-sm">
        {label}
      </Link>
    </div>
  );
}

function SectionHead({ id, eyebrow, title, lead }: { id: string; eyebrow: string; title: string; lead: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-1 scroll-mt-28 text-3xl font-extrabold">
        {title}
      </h2>
      <p className="mt-3 text-lg leading-8 text-muted">{lead}</p>
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function WoodHandlesPage() {
  const products = [
    ...WOOD.map((w) => ({ name: w.name, image: w.image.src, description: w.text })),
    ...PADS.map((p) => ({ name: p.name, image: p.image.src, description: `כרית דיו שולחנית בגודל ${p.size}, ${p.fits}.` })),
    ...COLOR_PADS.map((c) => ({ name: `כרית דיו צבעונית – ${c.name}`, image: c.image.src, description: 'כרית דיו שולחנית צבעונית בגודל מיקרו 1, 90×50 מ״מ.' })),
    { name: 'כרית עגולה R-95 לדיו מהיר ייבוש', image: '/img/wood/pad-r95.jpg', description: 'כרית שולחנית עגולה בקוטר 95 מ״מ לדיו מהיר ייבוש.' },
  ];
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: cat.name,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Product', name: p.name, image: SITE.url + p.image, description: p.description, brand: { '@type': 'Brand', name: p.image.startsWith('/img/pads/') ? 'COLOP' : 'Stamp2Go' } },
    })),
  };

  return (
    <>
      <PageHero eyebrow="חותמות" title={cat.name} lead={cat.intro} crumbs={[{ label: 'חותמות', href: '/stamps/' }, { label: cat.name }]}>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="ניווט בדף">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="chip">
              {label}
            </a>
          ))}
        </nav>
      </PageHero>

      {/* Wooden-handle stamps */}
      <section className="container-x py-14" aria-labelledby="wood">
        <SectionHead id="wood" eyebrow="ידיות עץ" title="חותמות ידית עץ" lead="חותמת גומי קלאסית עם ידית עץ מלוטשת ופלטה בהתאמה אישית. מחתימים בעזרת כרית דיו שולחנית – בכל צבע שתבחרו." />
        <div className="grid gap-6 lg:grid-cols-2">
          {WOOD.map((w) => (
            <article key={w.id} className="card flex flex-col overflow-hidden">
              <div className="grid aspect-[16/10] place-items-center overflow-hidden border-b border-line bg-white p-4">
                <Img image={w.image} className="h-full w-full object-contain mix-blend-multiply" />
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <p className="text-xs font-semibold text-blue">{w.shape}</p>
                <h3 className="mt-1 text-xl font-bold">{w.name}</h3>
                <p className="mt-2 text-[15px] leading-7 text-muted">{w.text}</p>
                <div className="mt-4 space-y-4">
                  {w.variants.map((v) => (
                    <div key={v.sizes.join()} className="rounded-xl bg-surface p-3.5">
                      <p className="text-xs font-semibold text-muted">גודל פלטה (מ״מ)</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {v.sizes.map((s) => (
                          <span key={s} className="rounded-full border border-line bg-white px-2.5 py-1 text-sm font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <a href="#pads" className="text-ink-2 underline-offset-4 hover:text-blue hover:underline">
                          כרית מתאימה: <strong>{v.pad}</strong>
                        </a>
                        <InkDots inks={v.inks} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-auto">
                  <Contact />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Which pad fits which plate */}
      <section className="border-y border-line bg-surface py-12" aria-labelledby="guide">
        <div className="container-x grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="eyebrow">מדריך התאמה</p>
            <h2 id="guide" className="mt-1 text-2xl font-extrabold sm:text-3xl">
              איזו כרית מתאימה לחותמת שלי?
            </h2>
            <p className="mt-3 leading-8 text-muted">הכרית צריכה להיות גדולה מפלטת הגומי, כדי שכל החותמת תקבל דיו בלחיצה אחת. לפי הגודל:</p>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-right text-[15px]">
              <thead className="bg-white text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="px-4 py-3 font-semibold">כרית</th>
                  <th className="px-4 py-3 font-semibold">פלטה מלבנית</th>
                  <th className="px-4 py-3 font-semibold">פלטה עגולה</th>
                </tr>
              </thead>
              <tbody>
                {GUIDE.map(([pad, rect, round]) => (
                  <tr key={pad} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-bold">{pad}</td>
                    <td className="px-4 py-3">{rect}</td>
                    <td className="px-4 py-3">{round}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Desk pads */}
      <section className="container-x py-14" aria-labelledby="pads">
        <SectionHead id="pads" eyebrow="COLOP Micro" title="כריות שולחניות" lead="כרית דיו שולחנית של COLOP במארז שחור עם מכסה, בשלושה גדלים ובמבחר צבעי דיו – לכל חותמת עץ יש כרית דיו שמתאימה לה." />
        <div className="grid gap-6 md:grid-cols-3">
          {PADS.map((p) => (
            <article key={p.id} className="card flex flex-col p-5">
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-gradient-to-b from-surface to-white p-3">
                <Img image={p.image} className="h-full w-full object-contain mix-blend-multiply" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{p.name}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="chip">גודל כרית {p.size}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{p.fits}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                <span className="text-muted">צבעי דיו</span>
                <InkDots inks={p.inks} />
              </div>
              <div className="mt-auto">
                <Contact label="להזמנה" />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Coloured pads */}
      <section className="container-x pb-14" aria-labelledby="color-pads">
        <SectionHead id="color-pads" eyebrow="כריות שולחניות מיוחדות" title="כריות צבעוניות" lead="כריות בגודל מיקרו 1 (90×50 מ״מ) בצבעים עזים וזרחניים – ליצירה, לגנים, לעטיפות מתנה ולמיתוג עם חותמת עץ." />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {COLOR_PADS.map((c) => (
            <article key={c.id} className="card flex flex-col p-4">
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-gradient-to-b from-surface to-white p-2">
                <Img image={c.image} className="h-full w-full object-contain mix-blend-multiply" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: c.swatch }} aria-hidden />
                <h3 className="font-bold">{c.name}</h3>
              </div>
              <p className="mt-1 text-xs text-muted">מיקרו 1 · 90×50 מ״מ</p>
              <Link href="/contact/" className="mt-3 text-sm font-semibold text-blue hover:underline">
                מחיר לפי פנייה ←
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Quick-dry round pad */}
      <section className="container-x pb-16" aria-labelledby="quick-dry">
        <SectionHead id="quick-dry" eyebrow="למשטחים מיוחדים" title="כרית שולחנית לדיו מהיר ייבוש" lead="לדיו שמתייבש בשניות על משטחים שאינם סופגים – פלסטיק, מתכת, זכוכית ונייר מצופה." />
        <article className="card grid overflow-hidden sm:grid-cols-[minmax(0,320px)_1fr]">
          <div className="grid place-items-center border-line bg-white p-4 max-sm:border-b sm:border-l">
            <Img image={img('/img/wood/pad-r95.jpg', 'כרית עגולה R-95 לדיו מהיר ייבוש')} className="aspect-[4/3] w-full object-contain mix-blend-multiply" />
          </div>
          <div className="flex flex-col p-5 sm:p-7">
            <h3 className="text-xl font-bold">כרית עגולה R-95 לדיו מהיר ייבוש</h3>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="chip">קוטר 95 מ״מ</span>
              <span className="chip">לדיו מהיר ייבוש</span>
            </div>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted">
              כרית עגולה עם מכסה, שמשמשת עם דיו מהיר ייבוש המתאים למשטח שעליו מחתימים. ספרו לנו על איזה חומר אתם מחתימים, ונתאים לכם את הדיו.
            </p>
            <div className="mt-auto">
              <Contact />
            </div>
          </div>
        </article>
      </section>

      {/* Questions (also marked up as FAQPage for Google) */}
      <section className="container-x pb-16" aria-labelledby="faq">
        <div className="mx-auto max-w-3xl">
          <h2 id="faq" className="mb-5 text-2xl font-bold">
            שאלות נפוצות על חותמות עץ וכריות דיו
          </h2>
          <FaqList items={FAQ_ITEMS} />
        </div>
      </section>

      {/* Contact band */}
      <section className="border-t border-line bg-gradient-to-b from-surface to-white py-14">
        <div className="container-x flex flex-col items-center gap-5 text-center">
          <h2 className="text-3xl font-extrabold">רוצים חותמת עץ או כרית?</h2>
          <p className="max-w-xl text-lg leading-8 text-muted">ספרו לנו איזה גודל וצבע אתם צריכים – ונחזור אליכם עם מחיר וזמן אספקה.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={SITE.phoneHref} className="btn-primary btn-lg">
              <Icon name="phone" size={18} /> {SITE.phone}
            </a>
            <a href={SITE.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline btn-lg">
              <Icon name="whatsapp" size={18} /> וואטסאפ
            </a>
            <Link href="/contact/" className="btn-outline btn-lg">
              טופס יצירת קשר
            </Link>
          </div>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    </>
  );
}
