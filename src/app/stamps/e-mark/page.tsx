import Link from 'next/link';
import type { Metadata } from 'next';
import { Img } from '@/components/Img';
import { Breadcrumbs } from '@/components/site/Breadcrumbs';
import { FaqList } from '@/components/site/FaqList';
import { Icon, type IconName } from '@/components/ui/Icon';
import { getStampCategory } from '@/lib/catalog';
import { SITE } from '@/lib/config';
import type { FaqItem } from '@/lib/faq';
import { formatPrice } from '@/lib/format';
import type { ImageRef } from '@/lib/types';

/**
 * COLOP e-mark – the handheld colour "pocket printer stamp". Content: colop.com
 * (e-mark & e-mark create product page) and the Hebrew accessories sheet at
 * emark.co.il. Photos: COLOP (/public/img/emark). Ordered by phone / WhatsApp –
 * the cart is built for designed rubber stamps only.
 */
const cat = getStampCategory('e-mark')!;
const PATH = '/stamps/e-mark/';
const PRICE = 1190;
const WHATSAPP = `https://api.whatsapp.com/send?phone=972507707715&text=${encodeURIComponent('היי, אשמח להזמין חותמת מדפסת כיס e-mark ב־1,190 ₪')}`;

export const metadata: Metadata = {
  title: cat.title,
  description: cat.description,
  alternates: { canonical: PATH },
  openGraph: { type: 'website', title: cat.title, description: cat.description, url: PATH, images: [{ url: '/img/emark/emark-white.jpg', width: 1200, height: 900, alt: 'חותמת מדפסת כיס COLOP e-mark' }] },
};

const img = (name: string, alt: string, width = 960, height = 640): ImageRef => ({ src: `/img/emark/${name}`, alt, width, height });

// ---------------------------------------------------------------- content
const HIGHLIGHTS: [IconName, string][] = [
  ['sparkles', 'הדפסה בצבעים מלאים'],
  ['layers', 'מחסנית HP לכ־1,500 הדפסות'],
  ['grid', 'QR, ברקוד, תאריך ומספור'],
  ['phone', 'אפליקציה ל־iOS ול־Android'],
  ['save', 'עד 4 הדפסות שמורות במכשיר'],
  ['clock', 'סוללה ל־5 שעות הדפסה'],
];

const FEATURES = [
  ['הדפסה צבעונית', 'מחסנית בשלושה צבעים (CMY) שמאפשרת כל שילוב צבעים – לוגו, תמונה וטקסט בהדפסה אחת.'],
  ['על משטחים סופגים', 'נייר, קרטון, בד, שעם, אבן, קרמיקה לא מזוגגת, עור לא מעובד ועץ לא מטופל.'],
  ['ברקוד, QR, מספור ותאריך', 'מחולל QR וברקוד מובנה, מספור רץ אוטומטי, תאריך ושעה – בלי להחליף חותמת.'],
  ['הדפסה רציפה', 'פונקציית סימון רציף להדפסה על סרט ארוך או על שורת פריטים ברצף.'],
  ['טלפון ומחשב', 'אפליקציה חינמית ל־iOS ול־Android, ותוכנה ומנהל התקן ל־Windows.'],
  ['אביזרים ומתכלים', 'תואם למתקן הגליל (Ribbon Station), לכלי להדפסת כרטיסים, למדבקות, לסרטים ולצמידים.'],
];

const STEPS = [
  'מורידים את האפליקציה לטלפון (iOS או Android) או את התוכנה ל־Windows.',
  'בוחרים עיצוב מוכן או מעצבים הדפסה חדשה – טקסט, לוגו, תמונה, QR או מספור.',
  'מחברים את התוכנה ל־e-mark – ב־Wi-Fi, או בכבל USB מהמחשב.',
  'שולחים את ההדפסה למכשיר.',
  'מניחים את ה־e-mark על המשטח ומעבירים אותו בתנועה אחת הצידה – ימינה או שמאלה.',
];

const USES: { title: string; text: string; image: ImageRef }[] = [
  { title: 'משרד', text: 'הדפסה ישירה על מסמכים נכנסים ויוצאים, תזכורות, אישורים פנימיים, סימון קלסרים ותיקיות, ודיוור ללקוחות בעזרת הדפסה סדרתית.', image: img('use-office.jpg', 'e-mark מדפיס על תיקייה משרדית') },
  { title: 'מלונות ומסעדות', text: 'הודעות "ברוכים הבאים" ו־VIP, תגיות מחיר ומנות, עדכונים לאורחים, מפיות ממותגות, תגיות מזוודה וקוד ה־Wi-Fi.', image: img('use-hotel.jpg', 'e-mark מדפיס לוגו על מפית במסעדה') },
  { title: 'לוגיסטיקה ומספור', text: 'מספרים סידוריים, ברקודים, קודי QR וכתובות – בקלות, עם פונקציית המספור, מחולל הברקוד וההדפסה הסדרתית.', image: img('use-logistics.jpg', 'e-mark מדפיס על קרטון משלוח') },
  { title: 'אריזות מתנה', text: 'הדפסה ישירה על נייר העטיפה, וסרטי כותנה אישיים שמוכנים תוך שניות.', image: img('use-gifts.jpg', 'אריזת מתנה עם סרט מודפס') },
  { title: 'מדבקות ותוויות', text: 'תוויות מבצע ומחיר לחנויות, ברקודים למדפי מחסן, מדבקות כתובת לחבילות – וגם תוויות טקסטיל לגיהוץ.', image: img('use-labels.jpg', 'e-mark מדפיס מדבקה לצנצנת') },
  { title: 'סרטים', text: 'עם מתקן הגליל (Ribbon Station) ה־e-mark עובד כמו מדפסת גלילים מקצועית – גליל שלם או בדיוק כמה הדפסות שצריך.', image: img('use-ribbon.jpg', 'הדפסה על סרט עם מתקן הגליל') },
  { title: 'כרטיסים', text: 'כרטיסי מחיר לדלפק, כרטיסי ביקור, כרטיסי עובד, מבקר או מנוי – עם הכלי להדפסת כרטיסים (MPT).', image: img('use-cards.jpg', 'הכלי להדפסת כרטיסים עם e-mark') },
  { title: 'תגיות ושלטים', text: 'תגיות, שלטים קטנים ותוויות יצירתיות עם מוטיבים שמעצבים באפליקציה או בתוכנה.', image: img('use-tags.jpg', 'תגיות מודפסות עם e-mark') },
];

const SPECS: [string, string][] = [
  ['טכנולוגיה', 'הזרקת דיו (Inkjet), ‏600 dpi'],
  ['הדפסה', 'צבעונית, ישירות על משטחים סופגים'],
  ['גודל הדפסה מרבי', 'גובה 14.5 מ״מ × אורך 150 מ״מ'],
  ['מהירות הדפסה מרבית', '300 מ״מ לשנייה'],
  ['מחסנית דיו', 'C2 בשלושה צבעים (CMY) – כ־1,500 הדפסות'],
  ['פונקציות', 'תאריך, שעה ומספור אוטומטיים · מחולל QR וברקוד · עיצובים מוכנים · העלאת לוגו ותמונות (JPG / PNG)'],
  ['זיכרון', 'עד 4 הדפסות שמורות במכשיר'],
  ['סוללה', 'Li-Ion ‏11.1V, לפחות 600mAh – עד 5 שעות הדפסה רציפה'],
  ['חיבור', 'Wi-Fi או USB'],
  ['תוכנה', 'אפליקציה חינמית ל־iOS ול־Android, תוכנה ל־Windows'],
  ['משקל', '224.5 גרם (ללא אריזה)'],
  ['באריזה', 'מכשיר e-mark, מחסנית דיו, כבל USB, מטען (תקע אירופאי Type C), מדריך התקנה מהיר'],
];

const ACCESSORIES: { name: string; text: string; facts: string[]; image: ImageRef; notCreate?: boolean }[] = [
  { name: 'מתקן להדפסת סרטים (Ribbon Guide Set)', text: 'שני מתקנים שממרכזים את ההדפסה על סרטים ופריטים דקים, גמישים וארוכים. משחילים את הסרט, מניחים מעליו את ה־e-mark ומדפיסים.', facts: ['לרוחב 15 ו־25 מ״מ'], image: img('acc-ribbon-guide.jpg', 'מתקן להדפסת סרטים', 640, 480) },
  { name: 'סרטי כותנה', text: 'סרטי כותנה איכותיים להדפסה מדויקת – לאריזות מתנה ולעבודות יד.', facts: ['100% כותנה', 'רוחב 15 או 25 מ״מ', 'גליל 25 מ׳, לבן'], image: img('acc-cotton-ribbon.jpg', 'סרטי כותנה ל־e-mark', 640, 480) },
  { name: 'צמידי V.I.P', text: 'צמידים אישיים לאירועים ולמסיבות. אפשר למספר אותם באפליקציה לספירת אורחים. הציפוי עמיד בפני קריעה, שפשוף ומים.', facts: ['19×255 מ״מ', '10 צמידים בדף', '100 צמידים באריזה'], image: img('acc-vip-wristband.jpg', 'צמידי V.I.P מודפסים', 640, 480) },
  { name: 'מדבקות לבנות מבריקות ושקופות', text: 'מדבקות עם ציפוי עמיד לשריטות ושפשוף והדבקה חזקה – לקופסאות במטבח, לציוד לבית הספר ועוד.', facts: ['מדבקה 14 מ״מ על גב 16 מ״מ', 'גליל 8 מ׳'], image: img('acc-labels-glossy.jpg', 'מדבקות לבנות מבריקות ושקופות', 640, 480) },
  { name: 'מדבקות לטקסטיל', text: 'תוויות לבגדי ילדים, לבגדי עבודה או לעיטור. מדפיסים, מניחים על הבד עם נייר אפייה ומגהצים. מתאימות לבד לבן ולבד צבעוני.', facts: ['גיהוץ ב־110–115 מעלות', '5–10 שניות'], image: img('acc-labels-textile.jpg', 'מדבקות טקסטיל ל־e-mark', 640, 480) },
  { name: 'סרגל ממקם', text: 'מאפשר להניח את המכשיר ישר ולהדפיס במדויק על פריטים קטנים, קשים או צרים – וגם על צמידי ה־V.I.P.', facts: ['מגרעת לסרגל רגיל', 'מרווח שורות במילימטרים'], image: img('acc-ruler.jpg', 'הסרגל הממקם של e-mark', 640, 480) },
  { name: 'תוויות פלסטיק', text: 'לתגי שם בכנסים וירידים, לשילוט מדפים, לתוויות מחיר ולתגיות מתנה. הציפוי עמיד למים ולשריטות קלות.', facts: ['18×18 מ״מ עם דבק – 50 יח׳', '18×45 מ״מ עם דבק – 50 יח׳', '18×45 מ״מ עם חור – 20 יח׳'], image: img('acc-plastic-tags.jpg', 'תוויות פלסטיק ל־e-mark', 640, 480) },
  { name: 'מתקן גליל (Ribbon Station)', text: 'הופך את ה־e-mark למדפסת גלילים מקצועית: גליל שלם או מספר מסוים של תוויות. בעזרת קטגוריה ייעודית באפליקציה.', facts: ['תבניות ייעודיות באפליקציה'], image: img('acc-ribbon-station.jpg', 'מתקן הגליל Ribbon Station', 640, 480), notCreate: true },
  { name: 'כלי להדפסת כרטיסים (MPT)', text: 'הדפסת כרטיסי ביקור בשלושה צעדים: מכניסים כרטיס, מניחים את המכשיר ומחליקים לאורך המסילה. כולל 10 כרטיסי נייר ו־10 כרטיסי פלסטיק.', facts: ['כרטיס 85.5×54 מ״מ'], image: img('acc-card-tool.jpg', 'הכלי להדפסת כרטיסים MPT', 640, 480), notCreate: true },
  { name: 'כרטיסי ביקור', text: 'כרטיסי נייר חזקים, או כרטיסי פלסטיק בגודל כרטיס אשראי עם ציפוי נגד רטיבות ושריטות.', facts: ['נייר – 100 יח׳', 'פלסטיק – 50 יח׳'], image: img('acc-cards.jpg', 'כרטיסי ביקור ל־e-mark', 640, 480), notCreate: true },
  { name: 'מחסנית שחור פיגמנטי', text: 'שחור עמוק שעמיד למים ולממסים. נבדק לעמידות במחיקה, באתנול, בהלבנה, בחומצה ובמים. לא מתאים לתוויות PVC ולמדבקות מבריקות ושקופות.', facts: ['כ־7,000 הדפסות של 14×100 מ״מ'], image: img('acc-cartridge-black.jpg', 'מחסנית שחור פיגמנטי ל־e-mark', 640, 480) },
  { name: 'מחסנית דיו UV', text: 'דיו שנראה רק באור UV – לאירועים ולאבטחת תוויות מוצר.', facts: ['קיבולת כמו המחסנית הרגילה'], image: img('acc-cartridge-uv.jpg', 'מחסנית דיו UV ל־e-mark', 640, 480) },
];

const FAQ_ITEMS: FaqItem[] = [
  { q: 'מה זה e-mark?', a: 'e-mark של COLOP היא חותמת מדפסת כיס: מדפסת צבעונית קטנה וניידת שמחזיקים ביד ומעבירים על המשטח. היא משמשת כמדפסת תוויות, שלטים, סרטים וכרטיסים, ומדפיסה ישירות על משטחים סופגים.' },
  { q: 'באיזה דיו משתמש ה־e-mark?', a: 'ה־e-mark עובד בטכנולוגיית הזרקת דיו. המחסנית הרגילה היא בשלושה צבעים (CMY), שפותחה במיוחד על ידי HP להדפסה ניידת, ומאפשרת כל שילוב צבעים. מחסנית אחת מספיקה לכ־1,500 הדפסות. אפשר להשתמש רק במחסניות מקוריות של COLOP. יש גם מחסנית שחור פיגמנטי ומחסנית דיו UV.' },
  { q: 'על אילו חומרים אפשר להדפיס?', a: 'כמעט על כל משטח סופג: סוגי נייר שונים, קרטון, עץ לא מטופל, שעם, בד, אבן, קרמיקה לא מזוגגת ועור לא מעובד.' },
  { q: 'אפשר לעצב הדפסה בעצמי?', a: 'כן. באפליקציה של e-mark מעצבים עם תמונות, לוגו וטקסט משלכם, ומוסיפים תאריך, שעה ומספור אוטומטיים, קוד QR וברקוד.' },
  { q: 'אילו פונקציות מקצועיות יש?', a: 'תאריך, שעה ומספור אוטומטיים, הדפסה סדרתית, מחולל QR וברקוד, ושמירת הדפסות במכשיר להדפסה בלי חיבור לאפליקציה. עם הכלי להדפסת כרטיסים (MPT) מדפיסים כרטיסים בגודל סטנדרטי.' },
  { q: 'מה ההבדל בין e-mark ל־e-mark create?', a: 'e-mark create היא הגרסה היצירתית, עם אפליקציית e-mark create לעיצובים יצירתיים. מתקן הגליל (Ribbon Station) והכלי להדפסת כרטיסים מתאימים רק ל־e-mark, ולא ל־e-mark create.' },
  { q: 'איך שומרים על המחסנית כשלא משתמשים במכשיר?', a: 'כשלא משתמשים ב־e-mark זמן רב, מוציאים את המחסנית וסוגרים אותה עם המכסה, כדי שהדיו לא יתייבש.' },
  { q: 'כמה עולה ה־e-mark?', a: `המחיר הוא ${formatPrice(PRICE)} כולל מע״מ, למכשיר e-mark עם מחסנית דיו, כבל USB, מטען ומדריך התקנה. מזמינים בטלפון ${SITE.phone}, בוואטסאפ או בטופס יצירת קשר.` },
];

// ---------------------------------------------------------------- pieces
function OrderButtons({ size = 'lg' }: { size?: 'lg' | 'md' }) {
  const big = size === 'lg' ? 'btn-lg' : '';
  return (
    <div className="flex flex-wrap gap-3">
      <a href={SITE.phoneHref} className={`btn-primary ${big}`}>
        <Icon name="phone" size={18} /> להזמנה: {SITE.phone}
      </a>
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={`btn-outline ${big}`}>
        <Icon name="whatsapp" size={18} /> הזמנה בוואטסאפ
      </a>
    </div>
  );
}

function SectionHead({ id, eyebrow, title, lead }: { id: string; eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-1 scroll-mt-28 text-3xl font-extrabold">
        {title}
      </h2>
      {lead && <p className="mt-3 text-lg leading-8 text-muted">{lead}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function EmarkPage() {
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'COLOP e-mark – חותמת מדפסת כיס',
    description: cat.description,
    brand: { '@type': 'Brand', name: 'COLOP' },
    category: 'מדפסת ניידת / חותמת מדפסת',
    image: ['emark-white.jpg', 'emark-imprint.jpg', 'life-ribbon.jpg', 'use-office.jpg'].map((n) => `${SITE.url}/img/emark/${n}`),
    offers: { '@type': 'Offer', priceCurrency: 'ILS', price: PRICE, availability: 'https://schema.org/InStock', url: SITE.url + PATH, seller: { '@type': 'Organization', name: 'Stamp2Go' } },
    additionalProperty: SPECS.slice(0, 6).map(([name, value]) => ({ '@type': 'PropertyValue', name, value })),
  };
  const accessoriesLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'אביזרים ומתכלים ל־e-mark',
    itemListElement: ACCESSORIES.map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Product', name: a.name, description: a.text, image: SITE.url + a.image.src, brand: { '@type': 'Brand', name: 'COLOP' } },
    })),
  };

  return (
    <>
      {/* Hero: photo + price + order */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-surface to-white pt-24 pb-12 sm:pt-28 sm:pb-16">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-blue/5 blur-3xl" />
        <div className="container-x relative">
          <Breadcrumbs items={[{ label: 'חותמות', href: '/stamps/' }, { label: cat.name }]} />
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">COLOP e-mark · מדפסת ניידת</p>
              <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
                <span dir="ltr">e-mark</span> – חותמת מדפסת כיס
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-8 text-muted">{cat.intro}</p>
              <p className="mt-6 text-4xl font-extrabold">
                {formatPrice(PRICE)} <span className="text-base font-normal text-muted">כולל מע״מ</span>
              </p>
              <ul className="mt-6 grid gap-2.5 text-[15px] sm:grid-cols-2">
                {HIGHLIGHTS.map(([icon, t]) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-blue">
                      <Icon name={icon} size={17} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <OrderButtons />
              </div>
              <p className="mt-3 text-sm text-muted">איסוף עצמי ברמת גן או משלוח לכל הארץ.</p>
            </div>
            <div>
              <div className="card grid aspect-[4/3] place-items-center overflow-hidden bg-white p-4">
                <Img image={img('emark-white.jpg', 'חותמת מדפסת כיס COLOP e-mark', 1200, 900)} className="h-full w-full object-contain" priority />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[img('emark-imprint.jpg', 'e-mark עם הדפסה צבעונית', 1200, 900), img('life-ribbon.jpg', 'הדפסה על סרט כותנה עם e-mark'), img('life-paper.jpg', 'הדפסה על נייר צבעוני עם e-mark')].map((im) => (
                  <div key={im.src} className="overflow-hidden rounded-xl border border-line bg-white">
                    <Img image={im} className="aspect-[4/3] w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What it is */}
      <section className="container-x py-14" aria-labelledby="about">
        <SectionHead
          id="about"
          eyebrow="מכשיר אחד, הרבה מדפסות"
          title="המדפסת הניידת והרב־שימושית של COLOP"
          lead="ה־e-mark משלב כמה מדפסות במכשיר אחד קטן ונייד: מדפסת תוויות, שלטים, סרטים וכרטיסים – וגם הדפסה ישירה בצבע מלא על משטחים סופגים. מעצבים באפליקציה או בתוכנה בכמה לחיצות, ומדפיסים בתנועת יד אחת."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="card p-5">
              <h3 className="text-lg font-bold">{t}</h3>
              <p className="mt-2 text-[15px] leading-7 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-surface py-14" aria-labelledby="how">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <SectionHead id="how" eyebrow="איך זה עובד" title="חמישה צעדים להדפסה" />
            <ol className="space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-4 rounded-2xl border border-line bg-white p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue font-bold text-white">{i + 1}</span>
                  <p className="pt-1.5 leading-7 text-ink-2">{s}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <Img image={img('life-gift.jpg', 'הדפסה על אריזת מתנה עם e-mark')} className="aspect-[3/2] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Uses */}
      <section className="container-x py-14" aria-labelledby="uses">
        <SectionHead id="uses" eyebrow="שימושים" title="למי זה מתאים?" lead="ממשרדים ומחסנים ועד מסעדות, חנויות ומתנות – ה־e-mark מדפיס כל דבר שצריך לסמן, למספר או למתג." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USES.map((u) => (
            <article key={u.title} className="card overflow-hidden">
              <Img image={u.image} className="aspect-[3/2] w-full object-cover" />
              <div className="p-4">
                <h3 className="font-bold">{u.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted">{u.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Models */}
      <section className="container-x pb-14" aria-labelledby="models">
        <SectionHead id="models" eyebrow="דגמים" title="e-mark או e-mark create?" />
        <div className="grid gap-5 md:grid-cols-2">
          <article className="card flex flex-col p-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="grid shrink-0 place-items-center rounded-xl bg-white sm:w-48">
              <Img image={img('emark-white.jpg', 'COLOP e-mark', 1200, 900)} className="aspect-[4/3] w-full object-contain" />
            </div>
            <div className="mt-4 sm:mt-0">
              <p className="text-xs font-semibold text-blue">לעסקים ולמקצוענים</p>
              <h3 className="mt-1 text-xl font-bold" dir="ltr">
                e-mark
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">כל הפונקציות המקצועיות: מספור, תאריך, QR, ברקוד והדפסה סדרתית. תואם למתקן הגליל ולכלי להדפסת כרטיסים.</p>
              <p className="mt-3 text-xl font-bold">
                {formatPrice(PRICE)} <span className="text-xs font-normal text-muted">כולל מע״מ</span>
              </p>
            </div>
          </article>
          <article className="card flex flex-col p-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="grid shrink-0 grid-cols-2 place-items-center gap-1 rounded-xl bg-white sm:w-48">
              <Img image={img('create-white.jpg', 'COLOP e-mark create לבן', 1200, 900)} className="aspect-[4/3] w-full object-contain" />
              <Img image={img('create-black.jpg', 'COLOP e-mark create שחור', 1200, 900)} className="aspect-[4/3] w-full object-contain" />
            </div>
            <div className="mt-4 sm:mt-0">
              <p className="text-xs font-semibold text-blue">ליצירה ולמתנות</p>
              <h3 className="mt-1 text-xl font-bold" dir="ltr">
                e-mark create
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">הגרסה היצירתית, עם אפליקציית e-mark create – לאריזות, סרטים ותגיות. בלבן או בשחור. לא מתאים למתקן הגליל ולכלי הכרטיסים.</p>
              <Link href="/contact/" className="mt-3 inline-block text-sm font-semibold text-blue hover:underline">
                מחיר לפי פנייה ←
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Specs */}
      <section className="border-y border-line bg-surface py-14" aria-labelledby="specs">
        <div className="container-x">
          <SectionHead id="specs" eyebrow="מפרט טכני" title="כל הנתונים של ה־e-mark" />
          <div className="card overflow-hidden">
            <dl className="divide-y divide-line">
              {SPECS.map(([k, v]) => (
                <div key={k} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[220px_1fr] sm:gap-6">
                  <dt className="text-sm font-semibold text-muted">{k}</dt>
                  <dd className="text-[15px] text-ink-2">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Accessories */}
      <section className="container-x py-14" aria-labelledby="accessories">
        <SectionHead id="accessories" eyebrow="אביזרים ומתכלים" title="כל מה שאפשר להוסיף ל־e-mark" lead="סרטים, מדבקות, צמידים, כרטיסים ומחסניות מיוחדות – לכל שימוש יש אביזר. המחירים לפי פנייה." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ACCESSORIES.map((a) => (
            <article key={a.name} className="card flex flex-col p-4">
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl bg-white">
                <Img image={a.image} className="h-full w-full object-contain" />
              </div>
              <h3 className="mt-3 font-bold">{a.name}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-6 text-muted">{a.text}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.facts.map((f) => (
                  <span key={f} className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium">
                    {f}
                  </span>
                ))}
                {a.notCreate && <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">ל־e-mark בלבד</span>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ (FAQPage markup is emitted by FaqList) */}
      <section className="container-x pb-14" aria-labelledby="faq">
        <div className="mx-auto max-w-3xl">
          <h2 id="faq" className="mb-5 text-2xl font-bold">
            שאלות נפוצות על חותמת מדפסת הכיס e-mark
          </h2>
          <FaqList items={FAQ_ITEMS} openFirst />
        </div>
      </section>

      {/* Order band */}
      <section className="border-t border-line bg-gradient-to-b from-surface to-white py-14">
        <div className="container-x flex flex-col items-center gap-5 text-center">
          <h2 className="text-3xl font-extrabold">
            מזמינים <span dir="ltr">e-mark</span> ב־{formatPrice(PRICE)}
          </h2>
          <p className="max-w-xl text-lg leading-8 text-muted">התקשרו או שלחו הודעה – נשמח לייעץ, להראות איך זה עובד ולהכין לכם את המכשיר לאיסוף או למשלוח.</p>
          <OrderButtons />
          <Link href="/contact/" className="text-sm font-semibold text-blue hover:underline">
            או השאירו פרטים בטופס יצירת קשר
          </Link>
        </div>
      </section>

      <p className="container-x pb-8 text-xs text-muted">תמונות המוצר: COLOP GmbH. מידע על האביזרים: emark.co.il.</p>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(accessoriesLd) }} />
    </>
  );
}
