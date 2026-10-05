import { getSettings } from '@/server/settings';
import { requireStaff } from '@/server/staff';
import { PricingEditor } from './PricingEditor';

export const metadata = { title: 'תמחור' };
export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  await requireStaff(['admin']);
  const s = await getSettings(true);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold">תמחור, משלוחים ותוספות</h1>
      <p className="mt-1 text-sm text-muted">המחירים מחושבים מחדש בשרת בכל הזמנה – השינויים חלים מיד על העורך, הסל והקופה.</p>
      <PricingEditor initial={s.pricing} />
    </div>
  );
}
