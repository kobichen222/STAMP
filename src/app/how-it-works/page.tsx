import type { Metadata } from 'next';
import { HowItWorksStory } from '@/components/home/HowItWorksStory';
import { PageHero } from '@/components/site/PageHero';

export const metadata: Metadata = {
  title: 'איך זה עובד – מעיצוב אונליין לחותמת ביד',
  description: 'בחירת מוצר, עיצוב, תצוגה מקדימה, ייצור ומשלוח – כך הופך עיצוב דיגיטלי לחותמת גומי אמיתית תוך דקות.',
  alternates: { canonical: '/how-it-works/' },
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero eyebrow="איך זה עובד" title="מעיצוב אונליין לחותמת ביד" lead="הלקוח לא צריך להבין Photoshop, Illustrator או Corel. בחרתם, עיצבתם, אישרתם, שילמתם – השאר עלינו." crumbs={[{ label: 'איך זה עובד' }]} />
      <HowItWorksStory />
    </>
  );
}
