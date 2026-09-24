/** Pure config (no content imports) so it can be used by the edge middleware. */
/**
 * Landing categories under /stamps/[category]. Each one maps to WooCommerce
 * categories and/or product title patterns, and inherits the SEO text of the
 * old WordPress page that used to cover the topic (that page 301-redirects here).
 */
export interface StampCategory {
  slug: string;
  name: string;
  /** Short card label. */
  short: string;
  title: string;
  description: string;
  intro: string;
  wpPageSlug?: string;
  wpCategoryIds?: number[];
  titleIncludes?: string[];
  titleExcludes?: string[];
  minWidth?: number;
  faq?: { q: string; a: string }[];
  featured?: boolean;
}

const PRO_EXCLUDE = ['עורך דין', 'רופא'];

export const CATEGORIES: StampCategory[] = [
  {
    slug: 'business',
    name: 'חותמות לעסקים',
    short: 'חותמת עסקית',
    title: 'חותמות לעסקים – חותמת עסק בעיצוב אונליין',
    description: 'חותמת לעסק עם שם, כתובת, טלפון ומספר עוסק. מעצבים אונליין, רואים תצוגה מקדימה ומקבלים חותמת מוכנה תוך 2 דקות.',
    intro: 'חותמת עסקית עם שם העסק, מספר עוסק, כתובת וטלפון – בדיוק במידה שבחרתם. עצבו אונליין וקבלו קובץ מוכן לייצור.',
    wpPageSlug: 'חותמת-לעסק',
    wpCategoryIds: [21, 25],
    titleExcludes: PRO_EXCLUDE,
    featured: true,
  },
  {
    slug: 'personal',
    name: 'חותמות אישיות',
    short: 'חותמת אישית',
    title: 'חותמת אישית בהזמנה – עיצוב אונליין',
    description: 'חותמת אישית עם שם, כתובת או חתימה. בחרו דגם, עצבו אונליין והזמינו – מוכנה תוך 2 דקות.',
    intro: 'שם, כתובת, חתימה או כל טקסט שתרצו – חותמת אישית שמעוצבת בדיוק כמו שדמיינתם.',
    wpPageSlug: 'חותמת-אישית',
    wpCategoryIds: [21, 27],
    titleExcludes: PRO_EXCLUDE,
    featured: true,
  },
  {
    slug: 'doctors',
    name: 'חותמות לרופאים',
    short: 'חותמת רופא',
    title: 'חותמת רופא – עם מספר רישיון ומומחיות',
    description: 'חותמת רופא עם שם, מומחיות ומספר רישיון. דגמי כיס, עכבר ופרינט – עיצוב אונליין ומוכנה תוך 2 דקות.',
    intro: 'חותמת לרופאים ולצוותים רפואיים: שם, תואר, מומחיות ומספר רישיון, בדגמי כיס קטנים שנכנסים לחלוק.',
    wpPageSlug: 'חותמת-רופא',
    titleIncludes: ['רופא'],
    featured: true,
    faq: [{ q: 'מה חייב להופיע בחותמת רופא?', a: 'לרוב שם מלא, תואר (ד״ר), תחום מומחיות ומספר רישיון. אפשר להוסיף מספר מומחה ולוגו של מרפאה.' }],
  },
  {
    slug: 'lawyers',
    name: 'חותמות לעורכי דין',
    short: 'חותמת עורך דין',
    title: 'חותמת עורך דין ונוטריון – מלבנית, עגולה ותאריכון',
    description: 'חותמת לעורך דין עם שם ומספר רישיון, חותמת עגולה ונוטריון, תאריכון ועט חותמת. עיצוב אונליין ומוכנה תוך 2 דקות.',
    intro: 'חותמת עו״ד עם שם, מספר רישיון וטלפון – מלבנית, עגולה, תאריכון או עט חותמת יוקרתי.',
    wpPageSlug: 'חותמת-לעורך-דין',
    titleIncludes: ['עורך דין'],
    featured: true,
    faq: [{ q: 'מה כותבים בחותמת עורך דין?', a: 'שם מלא, "עורך דין" או "עו״ד ונוטריון" ומספר רישיון (מ.ר.). אפשר להוסיף כתובת משרד וטלפון.' }],
  },
  {
    slug: 'company',
    name: 'חותמות חברה',
    short: 'חותמת חברה',
    title: 'חותמת חברה בע״מ – עם ח.פ. ולוגו',
    description: 'חותמת חברה עם שם החברה, ח.פ. ולוגו – מלבנית או עגולה. העלו לוגו, עצבו אונליין וקבלו קובץ ייצור וקטורי.',
    intro: 'חותמת חברה עם שם, ח.פ. ולוגו. העלו את הלוגו – המערכת ממירה אותו לגרסה מתאימה להחתמה.',
    wpCategoryIds: [25, 23],
    titleExcludes: PRO_EXCLUDE,
    featured: true,
  },
  {
    slug: 'round',
    name: 'חותמות עגולות',
    short: 'חותמת עגולה',
    title: 'חותמת עגולה – לחברות, עמותות ועורכי דין',
    description: 'חותמות עגולות בקטרים 17–50 מ"מ עם טקסט מעגלי ולוגו. עצבו אונליין חותמת עגולה והזמינו.',
    intro: 'טקסט מסביב, לוגו או טקסט במרכז – חותמת עגולה בקוטר שמתאים לכם.',
    wpPageSlug: 'חותמת-עגולה',
    wpCategoryIds: [23],
    featured: true,
  },
  {
    slug: 'date',
    name: 'חותמות תאריך',
    short: 'חותמת תאריך',
    title: 'חותמת תאריך – תאריכון עם טקסט אישי',
    description: 'תאריכון עם טקסט אישי מעל ומתחת לתאריך: "התקבל", "שולם", שם העסק ועוד.',
    intro: 'תאריכון עם גלגלת תאריך וטקסט אישי מסביב – "התקבל", "שולם" או שם העסק.',
    wpPageSlug: 'חותמות-תאריך',
    wpCategoryIds: [28],
    featured: true,
  },
  {
    slug: 'numbering',
    name: 'חותמות מספרים',
    short: 'חותמת מספרים',
    title: 'נומרטור – חותמת מספרים אוטומטית',
    description: 'נומרטור (מספרון) אוטומטי 6 או 8 רצועות למספור מסמכים, קבלות וחשבוניות.',
    intro: 'מספור אוטומטי של מסמכים, קבלות ותעודות – 6 או 8 ספרות.',
    wpPageSlug: 'נומרטור-מספרון',
    wpCategoryIds: [44],
    featured: true,
  },
  {
    slug: 'logo',
    name: 'חותמות לוגו',
    short: 'חותמת לוגו',
    title: 'חותמת לוגו – העלו לוגו וקבלו חותמת',
    description: 'חותמת עם הלוגו שלכם. מעלים PNG, JPG, SVG או PDF – המערכת ממירה לקווים ובודקת איכות.',
    intro: 'העלו לוגו בכל פורמט – המערכת מסירה רקע, ממירה לשחור־לבן ולקווים וקטוריים, ומראה לכם בדיוק איך ייראה.',
    wpCategoryIds: [22, 23],
    titleExcludes: PRO_EXCLUDE,
    featured: true,
  },
  {
    slug: 'signature',
    name: 'חותמות חתימה',
    short: 'חותמת חתימה',
    title: 'חותמת חתימה אישית',
    description: 'חותמת עם החתימה שלכם – מעלים צילום של החתימה והמערכת הופכת אותה לחותמת חדה.',
    intro: 'צלמו את החתימה על דף לבן והעלו – המערכת תנקה, תמיר לקווים ותכין לייצור.',
    wpPageSlug: 'חותמות-חתימה-אישית',
    featured: true,
  },
  {
    slug: 'large',
    name: 'חותמות גדולות',
    short: 'חותמת גדולה',
    title: 'חותמות גדולות – עד 75 מ"מ',
    description: 'חותמות בשטח החתמה גדול לטקסט רב שורות, לוגו גדול או טפסים.',
    intro: 'הרבה טקסט? לוגו גדול? חותמות בשטח החתמה של 60–75 מ"מ.',
    minWidth: 58,
    featured: true,
  },
  {
    slug: 'pocket',
    name: 'חותמות כיס',
    short: 'חותמת כיס',
    title: 'חותמת כיס – קטנה, מתקפלת ולא דולפת',
    description: 'חותמות כיס מתקפלות: סליידר, עכבר ועגולה. אידיאלי לרופאים, אחיות ואנשים בתנועה.',
    intro: 'קטנה, סגורה ולא דולפת – נפתחת ומחתימה ביד אחת.',
    wpPageSlug: 'חותמת-כיס',
    wpCategoryIds: [27],
    featured: true,
  },
  {
    slug: 'pen',
    name: 'עט חותמת',
    short: 'עט חותמת',
    title: 'עט חותמת יוקרתי – עט וחותמת במוצר אחד',
    description: 'עט חותמת יוקרתי עם חותמת מובנית בשטח 7×35 מ"מ – מתנה מושלמת לעורכי דין ומנהלים.',
    intro: 'עט איכותי עם חותמת אישית מובנית – תמיד בכיס.',
    wpPageSlug: 'עט-חותמת-עט-חותמת-יוקרתי',
    wpCategoryIds: [30],
  },
  { slug: 'books', name: 'חותמות לספרים', short: 'חותמת לספרים', title: 'חותמת לספרים – "מספרייתו של"', description: 'חותמות לספרים עגולות ומרובעות – "מספרייתו של" עם שם ועיטור.', intro: 'חותמת "מספרייתו של" לספרייה הביתית, לבתי ספר ולגנים.', wpPageSlug: 'חותמות-לספרים', wpCategoryIds: [31] },
  { slug: 'wedding', name: 'חותמות לחתונה', short: 'חותמת חתונה', title: 'חותמת לחתונה – לעיצוב הזמנות ומזכרות', description: 'חותמת חתונה עם שמות הזוג והתאריך להזמנות, מעטפות ושקיות.', intro: 'שמות הזוג, תאריך ועיטור – להזמנות, מעטפות ומזכרות.', wpPageSlug: 'חותמת-חתונה', wpCategoryIds: [33] },
  { slug: 'research', name: 'חותמות מו״פ', short: 'חותמת מו״פ', title: 'חותמת מו"פ – חותמות מחקר ופיתוח', description: 'חותמות מו"פ למעבדות ומחלקות מחקר ופיתוח.', intro: 'חותמות תיעוד למחקר ופיתוח.', wpPageSlug: 'חותמת-מופ-חותמות-מחקר-ופיתוח', wpCategoryIds: [34] },
  { slug: 'guarantee', name: 'חותמות ערבות אישית', short: 'ערבות אישית', title: 'חותמת ערבות אישית', description: 'חותמות ערבות אישית בדגמים A1–A8.', intro: 'חותמות ערבות אישית בנוסחים מוכנים.', wpPageSlug: 'חותמת-ערבות-אישית', wpCategoryIds: [35] },
  { slug: 'qr', name: 'חותמות QR', short: 'חותמת QR', title: 'חותמת QR לפי דרישה בכל גודל', description: 'חותמת עם קוד QR לאתר, לתפריט או לתשלום.', intro: 'קוד QR שמוביל לאתר, לתפריט או לעמוד תשלום – בכל גודל.', wpPageSlug: 'חותמת-qr-לפי-דרישה-בכל-גודל', wpCategoryIds: [36] },
  { slug: 'special-surfaces', name: 'חותמות לבד, עץ ומתכת', short: 'משטחים מיוחדים', title: 'חותמות לבד, עץ, מתכת ודיו סמוי', description: 'חותמות עם דיו מיוחד להחתמה על בד, עץ, מתכת, גומי ודיו סמוי.', intro: 'דיו מיוחד לכל משטח – בד, עץ, מתכת, גומי ודיו סמוי ל-UV.', wpPageSlug: 'חותמות-לבד-עץ-מתכת', wpCategoryIds: [37] },
  { slug: 'kids', name: 'חותמות לילדים', short: 'חותמות לילדים', title: 'חותמות לילדים', description: 'חותמות לילדים ולגננות – שמות, עידוד ודמויות.', intro: 'חותמות צבעוניות לילדים, לגננות ולמורות.', wpPageSlug: 'kids-stamp' },
  { slug: 'diploma', name: 'תעודות על מתכת ועץ', short: 'תעודות', title: 'תעודות סיום צרובות במתכת על עץ', description: 'תעודת סיום או הסמכה צרובה במתכת ומודבקת על לוח עץ.', intro: 'תעודה יוקרתית צרובה במתכת על לוח עץ.', wpPageSlug: 'diploma', wpCategoryIds: [45] },
];

export const getStampCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
