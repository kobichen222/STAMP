import { requireStaff } from '@/server/staff';
import { databaseUrl, listContacts } from '@/server/store/neon';

export const metadata = { title: 'פניות' };

/** Contact-form leads kept in the database (also those whose e-mail failed). */
export default async function LeadsPage() {
  await requireStaff(['admin']);
  const leads = await listContacts(300);
  const fmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jerusalem' });
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="text-2xl font-bold">פניות מהאתר</h1>
      {!databaseUrl() && <p className="card p-4 text-sm text-muted">מסד הנתונים לא מוגדר (DATABASE_URL) – פניות נשלחות באימייל בלבד.</p>}
      <section className="card divide-y divide-line overflow-hidden">
        {leads.map((l) => (
          <div key={l.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr_auto] sm:items-start sm:gap-4">
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
            {!l.mailed && <span className="h-fit rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 ring-1 ring-amber-200">לא נשלח במייל</span>}
          </div>
        ))}
        {!leads.length && <p className="p-8 text-center text-sm text-muted">אין עדיין פניות.</p>}
      </section>
    </div>
  );
}
