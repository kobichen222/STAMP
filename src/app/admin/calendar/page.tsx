import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { addDays, buildWeek, COURIER_WINDOW, dayKey, inTheWorks, weekStart, type CalEvent, type EventKind } from '@/lib/ship-calendar';
import { getStore } from '@/server/store';

import { PageHead } from '../blocks';

export const metadata = { title: 'יומן משלוחים ואיסופים' };
export const dynamic = 'force-dynamic';

const KIND: Record<EventKind, { label: string; cls: string; dot: string }> = {
  'courier-waiting': { label: 'מחכה לשליח', cls: 'border-blue/30 bg-blue-50', dot: 'bg-blue' },
  'courier-unbooked': { label: 'עוד לא הוזמן שליח', cls: 'border-warn/40 bg-warn/10', dot: 'bg-warn' },
  'courier-collected': { label: 'נאסף ע״י השליח', cls: 'border-ok/30 bg-white', dot: 'bg-ok' },
  'courier-delivered': { label: 'נמסר ללקוח', cls: 'border-ok/30 bg-ok/10', dot: 'bg-ok' },
  'pickup-ready': { label: 'מוכן לאיסוף', cls: 'border-violet/30 bg-violet/5', dot: 'bg-violet' },
  'pickup-waiting': { label: 'מחכה לאיסוף', cls: 'border-warn/40 bg-warn/10', dot: 'bg-warn' },
  'pickup-collected': { label: 'נאסף ע״י הלקוח', cls: 'border-ok/30 bg-ok/10', dot: 'bg-ok' },
};
const LEGEND: Record<'courier' | 'pickup', EventKind[]> = {
  courier: ['courier-waiting', 'courier-unbooked', 'courier-collected', 'courier-delivered'],
  pickup: ['pickup-ready', 'pickup-waiting', 'pickup-collected'],
};

const dayName = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString('he-IL', { weekday: 'long', timeZone: 'UTC' });
const dayNum = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });

function Chip({ e }: { e: CalEvent }) {
  const k = KIND[e.kind];
  return (
    <Link href={`/admin/orders/${e.orderId}/`} className={`block min-w-0 rounded-xl border p-2 text-start transition hover:shadow-soft ${k.cls}`}>
      <span className="flex items-center gap-1.5 text-[11px] font-bold">
        <span className={`h-2 w-2 shrink-0 rounded-full ${k.dot}`} aria-hidden />
        <span className="min-w-0 truncate">{k.label}</span>
        {e.urgent && <span className="shrink-0 rounded-full bg-bad px-1.5 text-[10px] text-white">דחוף</span>}
      </span>
      {(e.time || e.waitingDays) && (
        <span className="mt-0.5 block text-xs font-semibold tabular-nums">
          <span dir="ltr">{e.time}</span>
          {!!e.waitingDays && <span className="text-bad">{e.time ? ' · ' : ''}{e.waitingDays === 1 ? 'מאתמול' : `${e.waitingDays} ימים`}</span>}
        </span>
      )}
      <span className="mt-0.5 block truncate text-sm font-semibold">{e.customer}</span>
      <span className="block truncate text-[11px] text-muted">
        <span dir="ltr">{e.orderId}</span>
        {e.city ? ` · ${e.city}` : ''}
      </span>
    </Link>
  );
}

function Track({ title, icon, note, kinds, days, track, today }: { title: string; icon: 'truck' | 'store'; note: string; kinds: EventKind[]; days: ReturnType<typeof buildWeek>; track: 'courier' | 'pickup'; today: string }) {
  const total = days.reduce((n, d) => n + d[track].length, 0);
  return (
    <section className="card p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name={icon} size={20} className="text-blue" /> {title}
          <span className="rounded-full bg-surface px-2 text-sm font-semibold text-muted tabular-nums">{total}</span>
        </h2>
        <p className="text-sm text-muted">{note}</p>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted" aria-label="מקרא">
        {kinds.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${KIND[k].dot} ${k === 'courier-collected' ? 'opacity-50' : ''}`} aria-hidden /> {KIND[k].label}
          </li>
        ))}
      </ul>
      {/* Phones and tablets: a list of the days that have something (today always); wide screens: the whole week side by side. */}
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2 xl:grid-cols-[repeat(7,minmax(0,1fr))]">
        {days.map((d) => {
          const list = d[track];
          const isToday = d.key === today;
          const weekend = new Date(`${d.key}T12:00:00Z`).getUTCDay() >= 5;
          return (
            <div key={d.key} className={`min-w-0 rounded-2xl border p-2 ${isToday ? 'border-blue bg-blue-50/40 ring-1 ring-blue/20' : 'border-line bg-surface/50'} ${!list.length && !isToday ? 'max-xl:hidden' : ''} ${isToday ? 'max-xl:order-first' : ''} ${weekend && !list.length ? 'xl:opacity-50' : ''}`}>
              <p className="mb-2 flex items-baseline justify-between gap-2 px-1 text-sm">
                <span className={`font-bold ${isToday ? 'text-blue' : ''}`}>
                  {dayName(d.key)}
                  {isToday && ' · היום'}
                </span>
                <span className="text-xs text-muted tabular-nums">{dayNum(d.key)}</span>
              </p>
              {list.length ? (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 sm:max-xl:grid-cols-[repeat(2,minmax(0,1fr))]">
                  {list.map((e) => (
                    <Chip key={e.id} e={e} />
                  ))}
                </div>
              ) : (
                <p className="px-1 pb-1 text-xs text-muted">אין</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const now = new Date();
  const today = dayKey(now);
  const start = weekStart(/^\d{4}-\d{2}-\d{2}$/.test(week ?? '') ? week! : today);
  const orders = await getStore().listOrders({ limit: 500 });
  const days = buildWeek(orders, start, now);
  const making = inTheWorks(orders);
  const todayCol = days.find((d) => d.key === today);
  const waitingCourier = todayCol?.courier.filter((e) => e.kind === 'courier-waiting' || e.kind === 'courier-unbooked') ?? [];
  const unbooked = waitingCourier.filter((e) => e.kind === 'courier-unbooked').length;
  const waitingPickup = todayCol?.pickup.filter((e) => e.kind !== 'pickup-collected') ?? [];
  const thisWeek = start === weekStart(today);
  const href = (k: string) => `/admin/calendar/?week=${k}`;

  return (
    <div className="mx-auto max-w-7xl space-y-3 sm:space-y-4">
      <PageHead title="יומן משלוחים ואיסופים" sub={`${dayNum(start)} – ${dayNum(addDays(start, 6))} · מתעדכן לבד לפי סטטוס ההזמנות`}>
        <nav className="flex items-center gap-1.5" aria-label="מעבר בין שבועות">
          <Link href={href(addDays(start, -7))} className="btn-outline btn-sm">
            → הקודם
          </Link>
          <Link href="/admin/calendar/" className={`btn-sm ${thisWeek ? 'btn-dark' : 'btn-outline'}`} aria-current={thisWeek ? 'page' : undefined}>
            השבוע
          </Link>
          <Link href={href(addDays(start, 7))} className="btn-outline btn-sm">
            הבא ←
          </Link>
        </nav>
      </PageHead>

      {thisWeek && (
        <div className="grid gap-3 sm:grid-cols-2">
          <a href="#courier" className="card flex items-center gap-3 p-3 sm:p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue">
              <Icon name="truck" size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm text-muted">
                שליח היום · <span dir="ltr">{COURIER_WINDOW.label}</span>
              </span>
              <span className="block font-bold">
                {waitingCourier.length ? `${waitingCourier.length} חבילות מחכות לשליח` : 'אין חבילות לשליח היום'}
                {unbooked > 0 && <span className="text-warn"> · {unbooked} בלי שליח מוזמן</span>}
              </span>
            </span>
          </a>
          <a href="#pickup" className="card flex items-center gap-3 p-3 sm:p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet/10 text-violet">
              <Icon name="store" size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm text-muted">איסוף עצמי היום</span>
              <span className="block font-bold">{waitingPickup.length ? `${waitingPickup.length} הזמנות מחכות לאיסוף` : 'אין הזמנות שמחכות לאיסוף'}</span>
            </span>
          </a>
        </div>
      )}

      <div id="courier" className="scroll-mt-20">
        <Track title="משלוחים" icon="truck" note={`איסוף השליח מהסטודיו: א׳–ה׳, ${COURIER_WINDOW.from}:00 עד ${COURIER_WINDOW.to}:00 · בהכנה: ${making.courier}`} kinds={LEGEND.courier} days={days} track="courier" today={today} />
      </div>
      <div id="pickup" className="scroll-mt-20">
        <Track title="איסוף עצמי" icon="store" note={`הלקוח אוסף מהסטודיו · בהכנה: ${making.pickup}`} kinds={LEGEND.pickup} days={days} track="pickup" today={today} />
      </div>
    </div>
  );
}
