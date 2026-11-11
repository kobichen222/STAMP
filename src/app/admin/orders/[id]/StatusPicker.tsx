'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { statusLabel, TRANSITIONS, type OrderStatus } from '@/server/orders/types';
import { setStatus } from '../../actions';

/** The regular path of an order, in order. */
const FLOW: OrderStatus[] = ['PAYMENT_PENDING', 'PAID', 'PREFLIGHT', 'AWAITING_APPROVAL', 'READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY_FOR_SHIPPING', 'SHIPPED', 'DELIVERED'];
/** Side statuses – off the regular path. */
const SIDE: OrderStatus[] = ['CHANGE_REQUESTED', 'PRODUCTION_FILE_ERROR', 'PAYMENT_FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'];
const DANGER: OrderStatus[] = ['CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
/** Steps that have a customer e-mail – staff decide each time whether it goes out. */
const EMAIL_STEPS: OrderStatus[] = ['IN_PRODUCTION', 'READY_FOR_SHIPPING', 'SHIPPED'];

function useStatus(id: string, status: OrderStatus, method?: string, hasEmail = false) {
  const L = (s: OrderStatus) => statusLabel(s, method);
  const router = useRouter();
  const [shown, setShown] = useOptimistic(status);
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [error, setError] = useState('');
  /** A step with a customer e-mail waits here for "send / don't send". */
  const [ask, setAsk] = useState<OrderStatus | null>(null);
  const go = (to: OrderStatus) => {
    if (to === shown || pending) return;
    if (DANGER.includes(to) && !window.confirm(`להעביר את ההזמנה ל"${L(to)}"?`)) return;
    if (hasEmail && EMAIL_STEPS.includes(to)) return setAsk(to);
    commit(to, false);
  };
  const commit = (to: OrderStatus, notify: boolean) => {
    setAsk(null);
    setError('');
    setTarget(to);
    start(async () => {
      setShown(to);
      try {
        await setStatus(id, to, undefined, notify);
        router.refresh();
      } catch {
        setError('השינוי לא נשמר – נסו שוב');
      }
    });
  };
  return { shown, pending, target, error, go, L, ask, setAsk, commit };
}

const Spinner = () => <span aria-hidden className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />;

/** Every step on view, the current one marked; a click moves the order there at once. */
/** "לשלוח ללקוח מייל?" – shown before a step that has a customer e-mail. */
function AskEmail({ to, L, commit, cancel }: { to: OrderStatus; L: (s: OrderStatus) => string; commit: (to: OrderStatus, notify: boolean) => void; cancel: () => void }) {
  return (
    <div role="dialog" aria-label="מייל ללקוח" className="rounded-xl border border-blue/40 bg-blue-50 p-3 text-sm">
      <p className="font-semibold">
        מעבירים ל״{L(to)}״. לשלוח ללקוח מייל עדכון?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => commit(to, true)} className="btn-primary btn-sm">
          כן, לשלוח מייל
        </button>
        <button type="button" onClick={() => commit(to, false)} className="btn-outline btn-sm">
          בלי מייל
        </button>
        <button type="button" onClick={cancel} className="btn-ghost btn-sm">
          ביטול
        </button>
      </div>
    </div>
  );
}

export function StatusPicker({ id, status, primary, method, hasEmail }: { id: string; status: OrderStatus; primary?: OrderStatus; method?: string; hasEmail?: boolean }) {
  const { shown, pending, target, error, go, L, ask, setAsk, commit } = useStatus(id, status, method, hasEmail);
  const at = FLOW.indexOf(shown);
  const allowed = TRANSITIONS[shown] ?? [];
  const next = primary && shown === status ? primary : allowed.find((s) => FLOW.indexOf(s) > at);

  return (
    <div className="mt-3 space-y-3">
      {ask && <AskEmail to={ask} L={L} commit={commit} cancel={() => setAsk(null)} />}
      {next && (
        <button type="button" onClick={() => go(next)} disabled={pending} className="btn-primary w-full">
          {pending && target === next ? <Spinner /> : null} העברה ל: {L(next)}
        </button>
      )}
      <ol className="grid gap-1" aria-label="שלבי ההזמנה">
        {FLOW.map((s, n) => {
          const current = s === shown;
          const done = at >= 0 && n < at;
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => go(s)}
                disabled={pending && target !== s}
                aria-current={current ? 'step' : undefined}
                className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-right text-sm transition active:scale-[0.98] ${
                  current ? 'border-blue bg-blue text-white font-bold' : done ? 'border-blue/20 bg-blue-50 text-ink hover:border-blue' : 'border-line bg-white text-muted hover:border-blue hover:text-ink'
                }`}
              >
                <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] ${current ? 'bg-white text-blue' : done ? 'bg-blue text-white' : 'bg-line text-muted'}`}>
                  {pending && target === s ? <Spinner /> : done ? '✓' : n + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{L(s)}</span>
                {!current && allowed.includes(s) && <span className="text-[10px] text-blue">הבא</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-1.5">
        {SIDE.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            disabled={pending && target !== s}
            className={`btn-sm rounded-full border px-3 transition active:scale-95 ${
              s === shown ? 'border-bad bg-bad text-white' : DANGER.includes(s) ? 'border-bad/30 text-bad hover:bg-bad/5' : 'border-line text-muted hover:border-blue hover:text-ink'
            }`}
          >
            {pending && target === s ? <Spinner /> : null} {L(s)}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
    </div>
  );
}

/** The sticky phone bar button – same instant response. */
export function NextStatusButton({ id, status, primary, method, hasEmail }: { id: string; status: OrderStatus; primary: OrderStatus; method?: string; hasEmail?: boolean }) {
  const { shown, pending, go, L, ask, setAsk, commit } = useStatus(id, status, method, hasEmail);
  const done = shown !== status;
  if (ask)
    return (
      <div className="flex gap-1.5">
        <button type="button" onClick={() => commit(ask, true)} className="btn-primary !h-11 min-w-0 flex-1 truncate text-sm">
          + מייל ללקוח
        </button>
        <button type="button" onClick={() => commit(ask, false)} className="btn-outline !h-11 min-w-0 flex-1 truncate text-sm">
          בלי מייל
        </button>
        <button type="button" onClick={() => setAsk(null)} className="btn-ghost !h-11 shrink-0 !px-2 text-sm" aria-label="ביטול">
          ✕
        </button>
      </div>
    );
  return (
    <button type="button" onClick={() => go(primary)} disabled={pending || done} className="btn-primary !h-11 w-full truncate text-sm">
      {pending ? <Spinner /> : null} {done ? L(shown) : `העברה ל: ${L(primary)}`}
    </button>
  );
}
