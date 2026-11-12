import { requireStaff } from '@/server/staff';
import { Icon } from '@/components/ui/Icon';
import { databaseUrl, listContacts, listSubscribers } from '@/server/store/neon';
import { PageHead, Stats } from '../blocks';
import { LeadToggle } from './LeadToggle';
import { ABANDON_MINUTES, listCarts } from '@/server/abandoned';

export const metadata = { title: 'פניות' };
export const dynamic = 'force-dynamic';

/** Contact-form leads kept in the database (also those whose e-mail failed). */
export default async function LeadsPage() {
  await requireStaff(['admin']);
  const leads = await listContacts(300);
  const subs = await listSubscribers().catch(() => []);
  const carts = await listCarts(60).catch(() => []);
  const sentCount = carts.filter((c) => c.sentAt).length;
  const recovered = carts.filter((c) => c.sentAt && c.convertedOrder).length;
  const fmt = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Jerusalem' });
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHead title="פניות מהאתר" sub="טופס יצירת קשר, עגלות נטושות ונרשמים לדיוור" />
      <Stats
        items={[
          { label: 'פניות פתוחות', value: leads.filter((l) => !l.handled).length, sub: `${leads.length} בסך הכול`, tone: leads.some((l) => !l.handled) ? 'blue' : undefined },
          { label: 'עגלות נטושות', value: carts.length, sub: `${sentCount} תזכורות נשלחו` },
          { label: 'חזרו והזמינו', value: recovered, sub: sentCount ? `${Math.round((recovered / sentCount) * 100)}% מהתזכורות` : 'אחרי תזכורת', tone: recovered ? 'ok' : undefined },
          { label: 'נרשמים לדיוור', value: subs.length, sub: 'מטופס ההרשמה באתר' },
        ]}
      />
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
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-bold">
            עגלות נטושות <span className="font-normal text-muted">({carts.length})</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            מי שהקליד מייל בקופה ולא הזמין מקבל תזכורת אחת אחרי {ABANDON_MINUTES} דקות · {sentCount} תזכורות נשלחו · {recovered} חזרו והזמינו
          </p>
        </div>
        <ul className="divide-y divide-line text-sm">
          {carts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {c.name || c.email}{' '}
                  {c.total != null && <span className="font-normal text-muted tabular-nums">· ₪{c.total}</span>}
                </span>
                <span className="block truncate text-xs text-muted">
                  <a href={`mailto:${c.email}`} dir="ltr" className="text-blue">
                    {c.email}
                  </a>
                  {c.phone && (
                    <>
                      {' · '}
                      <a href={`tel:${c.phone}`} dir="ltr" className="text-blue">
                        {c.phone}
                      </a>
                    </>
                  )}
                  {' · '}
                  {c.items}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted tabular-nums">{fmt.format(new Date(c.updatedAt))}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${c.convertedOrder ? 'bg-ok/10 text-ok' : c.unsubscribed ? 'bg-line text-muted' : c.sentAt ? 'bg-blue-50 text-blue' : 'bg-warn/10 text-warn'}`}
              >
                {c.convertedOrder ? (c.sentAt ? 'חזר והזמין' : 'הזמין') : c.unsubscribed ? 'ביקש להסיר' : c.sentAt ? 'נשלחה תזכורת' : 'ממתין'}
              </span>
            </li>
          ))}
          {!carts.length && <li className="p-6 text-center text-muted">עדיין אין עגלות נטושות.</li>}
        </ul>
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
