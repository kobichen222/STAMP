import { requireStaff } from '@/server/staff';
import { Icon } from '@/components/ui/Icon';
import { databaseUrl, listContacts, listSubscribers } from '@/server/store/neon';
import { LeadToggle } from './LeadToggle';

export const metadata = { title: 'פניות' };
export const dynamic = 'force-dynamic';

/** Contact-form leads kept in the database (also those whose e-mail failed). */
export default async function LeadsPage() {
  await requireStaff(['admin']);
  const leads = await listContacts(300);
  const subs = await listSubscribers().catch(() => []);
  const fmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jerusalem' });
  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <h1 className="text-xl font-bold sm:text-2xl">פניות מהאתר</h1>
      <p className="text-sm text-muted">
        {leads.filter((l) => !l.handled).length} פתוחות · {leads.length} בסך הכול
      </p>
      {!databaseUrl() && <p className="card p-4 text-sm text-muted">מסד הנתונים לא מוגדר (DATABASE_URL) – פניות נשלחות באימייל בלבד.</p>}
      <section className="card divide-y divide-line overflow-hidden">
        {leads.map((l) => (
          <div key={l.id} className={`grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr_auto] sm:items-start sm:gap-4 ${l.handled ? 'opacity-60' : ''}`}>
            <p className="text-xs text-muted tabular-nums">{fmt.format(new Date(l.at))}</p>
            <div className="min-w-0">
              <p className="font-semibold">
                {l.name}{' '}
                <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="ms-2 text-sm font-normal text-blue" dir="ltr">
                  {l.phone}
                </a>
                {l.email && (
                  <a href={`mailto:${l.email}`} className="ms-2 text-sm font-normal text-blue" dir="ltr">
                    {l.email}
                  </a>
                )}
              </p>
              {l.message && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{l.message}</p>}
              {l.page && <p className="mt-1 truncate text-xs text-muted" dir="ltr">{l.page}</p>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0">
              <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} className="btn-outline btn-sm sm:hidden">
                <Icon name="phone" size={15} /> חיוג
              </a>
              <a href={`https://wa.me/972${l.phone.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noopener" className="btn-outline btn-sm sm:hidden">
                <Icon name="whatsapp" size={15} /> וואטסאפ
              </a>
              {!l.mailed && <span className="h-fit rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200">לא נשלח במייל</span>}
              <LeadToggle id={l.id} handled={l.handled} />
            </div>
          </div>
        ))}
        {!leads.length && <p className="p-8 text-center text-sm text-muted">אין עדיין פניות.</p>}
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="font-bold">
            נרשמים לדיוור <span className="font-normal text-muted">({subs.length})</span>
          </h2>
          {subs.length > 0 && (
            <a
              className="btn-outline btn-sm"
              download="newsletter.csv"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent('\ufeffemail,date\n' + subs.map((x) => `${x.email},${x.at.slice(0, 10)}`).join('\n'))}`}
            >
              <Icon name="download" size={15} /> ייצוא CSV
            </a>
          )}
        </div>
        <ul className="divide-y divide-line text-sm">
          {subs.slice(0, 50).map((x) => (
            <li key={x.email} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <a href={`mailto:${x.email}`} className="min-w-0 truncate text-blue" dir="ltr">
                {x.email}
              </a>
              <span className="shrink-0 text-xs text-muted tabular-nums">{fmt.format(new Date(x.at))}</span>
            </li>
          ))}
          {!subs.length && <li className="p-6 text-center text-muted">עדיין אין נרשמים – טופס ההרשמה נמצא בתחתית האתר.</li>}
        </ul>
      </section>
    </div>
  );
}
