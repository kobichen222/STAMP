import { getSettings } from '@/server/settings';
import { requireStaff } from '@/server/staff';
import { PageHead } from '../blocks';
import { PricingEditor } from './PricingEditor';

export const metadata = { title: 'תמחור' };
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  await requireStaff(['admin']);
  const s = await getSettings(true);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="תמחור, משלוחים ותוספות" sub="המחירים מחושבים מחדש בשרת בכל הזמנה – השינויים חלים מיד על העורך, הסל והקופה." />
      <PricingEditor initial={s.pricing} />
    </div>
  );
}
