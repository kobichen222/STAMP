import type { Metadata } from 'next';
import { TemplateGallery, type GalleryItem } from '@/components/catalog/TemplateGallery';
import { PageHero } from '@/components/site/PageHero';
import { TEMPLATES } from '@/designer/templates';

export const metadata: Metadata = {
  title: 'דוגמאות חותמות – השראה לעיצוב',
  description: 'דוגמאות לחותמות לעסקים, עורכי דין, רופאים, חותמות פרטיות ועגולות. מצאתם משהו שאהבתם? עצבו חותמת דומה בלחיצה.',
  alternates: { canonical: '/examples/' },
};

const T = (id: string) => TEMPLATES.find((t) => t.id === id)!;
const withText = (id: string, lines: string[], extra: Partial<GalleryItem['template']['content']> = {}) => ({
  ...T(id),
  content: { ...T(id).content, lines, ...extra },
});

const EXAMPLES: GalleryItem[] = [
  { id: 'ex1', label: 'משרד עורכי דין', tags: ['lawyers'], template: withText('lawyer-classic', ['כהן, לוי ושות׳', 'משרד עורכי דין', 'רח׳ ז׳בוטינסקי 7, רמת גן', 'טל׳ 03-7654321']) },
  { id: 'ex2', label: 'נוטריון – עגולה', tags: ['lawyers', 'round'], ink: 'blue', template: withText('lawyer-round', ['נוטריון'], { arcTop: 'עו״ד דנה כהן', arcBottom: 'מ.ר. 45678' }) },
  { id: 'ex3', label: 'רופאת משפחה', tags: ['doctors'], ink: 'blue', template: withText('doctor-classic', ['ד״ר מיכל אברהם', 'רפואת משפחה', 'מ.ר. 98765']) },
  { id: 'ex4', label: 'וטרינר', tags: ['doctors'], template: withText('doctor-modern', ['ד״ר יואב שמיר', 'רופא וטרינר', 'מ.ר. 1234 · 052-1112233']) },
  { id: 'ex5', label: 'חברה בע״מ', tags: ['business', 'round'], template: withText('company-round', ['חותמת החברה'], { arcTop: 'אלפא טכנולוגיות בע״מ', arcBottom: 'ח.פ. 515151515' }) },
  { id: 'ex6', label: 'בית קפה', tags: ['business'], ink: 'red', template: withText('business-modern', ['קפה השכונה', 'כרטיס מתנה', 'www.cafe.co.il']) },
  { id: 'ex7', label: 'עוסק מורשה', tags: ['business'], template: withText('business-address', ['יוסי כהן – שיפוצים', 'עוסק מורשה 034567891', 'טל׳ 054-7654321']) },
  { id: 'ex8', label: 'כתובת למעטפות', tags: ['private'], ink: 'blue', template: withText('private-name', ['משפחת לוי', 'רח׳ הגפן 4, גבעתיים']) },
  { id: 'ex9', label: 'מספרייה ביתית', tags: ['private', 'round'], template: withText('private-book', [], { arcTop: 'מספרייתה של', arcBottom: 'נועה ישראלי' }) },
  { id: 'ex10', label: 'שולם', tags: ['business', 'round'], ink: 'red', template: withText('round-approved', ['שולם'], { arcTop: 'חשבונות – מחלקת כספים', arcBottom: 'תאריך' }) },
];

const FILTERS = [
  { id: 'business', label: 'עסקים' },
  { id: 'lawyers', label: 'עורכי דין' },
  { id: 'doctors', label: 'רופאים' },
  { id: 'private', label: 'פרטיים' },
  { id: 'round', label: 'עגול' },
];

export default function ExamplesPage() {
  return (
    <>
      <PageHero eyebrow="השראה" title="דוגמאות" lead="עיצובים אמיתיים שנבנו במעצב. מצאתם משהו שאהבתם? לחצו ״עצב חותמת דומה״ והתחילו ממנו." crumbs={[{ label: 'דוגמאות' }]} />
      <div className="container-x py-12">
        <TemplateGallery items={EXAMPLES} filters={FILTERS} cta="עצב חותמת דומה" />
      </div>
    </>
  );
}
