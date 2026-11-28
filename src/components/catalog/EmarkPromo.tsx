import Link from 'next/link';
import { Img } from '@/components/Img';

/** Small cross-link to the e-mark page, shown on the date and numbering category pages. */
export function EmarkPromo({ topic }: { topic: 'date' | 'numbering' }) {
  const text =
    topic === 'date'
      ? 'צריכים תאריך ושעה שמתעדכנים לבד, ואפילו בצבע? חותמת מדפסת הכיס e-mark מדפיסה תאריך, שעה, לוגו וטקסט בתנועה אחת.'
      : 'צריכים מספור רץ, ברקוד או QR? חותמת מדפסת הכיס e-mark ממספרת אוטומטית ומדפיסה ברקודים וקודי QR בצבע.';
  return (
    <aside className="card mb-12 flex flex-col items-center gap-5 overflow-hidden p-5 sm:flex-row sm:p-6">
      <div className="w-40 shrink-0">
        <Img image={{ src: '/img/emark/emark-white.jpg', alt: 'חותמת מדפסת כיס e-mark', width: 1200, height: 900 }} className="aspect-[4/3] w-full object-contain" />
      </div>
      <div className="flex-1 text-center sm:text-right">
        <p className="eyebrow">אפשרות נוספת</p>
        <p className="mt-1 text-lg font-bold">
          <span dir="ltr">e-mark</span> – חותמת מדפסת כיס
        </p>
        <p className="mt-1 text-[15px] leading-7 text-muted">{text}</p>
      </div>
      <Link href="/stamps/e-mark/" className="btn-primary shrink-0">
        להכיר את ה־e-mark
      </Link>
    </aside>
  );
}
