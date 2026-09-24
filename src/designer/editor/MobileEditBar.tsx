'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { DesignElement } from '../types';
import { useEditor } from './context';

const STEP = 0.5; // mm per tap – visible on a phone (0.2mm was ~1px and felt unresponsive)
const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Touch editing bar for the selected element (mobile): precise nudging with
 * press-and-hold repeat, size −/+, centring and delete. Replaces
 * the resize/rotate handles, which are too small and fiddly for fingers.
 * (Duplicate stays in the layers panel – the bar must fit a 320px screen.)
 */
export function MobileEditBar() {
  const { selected, actions, design, render, profile, toast } = useEditor();
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const show = (msg: string) => {
    setFlash(msg);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1200);
  };
  const repeat = useRef<{ timer: number; n: number } | null>(null);
  const el = selected.length === 1 ? selected[0] : null;
  const ids = selected.map((s) => s.id);
  const locked = selected.some((s) => s.locked);

  const stop = () => {
    if (!repeat.current) return;
    window.clearTimeout(repeat.current.timer);
    repeat.current = null;
    actions.commit();
  };
  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nudge = (dx: number, dy: number) => {
    actions.patch(ids, (e: DesignElement) => ({ x: round2(e.x + dx), y: round2(e.y + dy) }), false);
    if (el) show(`${dx ? (dx > 0 ? '→' : '←') : dy > 0 ? '↓' : '↑'} ${Math.abs(dx || dy).toFixed(1)} מ״מ`);
  };

  /** Press = one step; hold = repeat, accelerating (fine → fast). */
  const hold = (dx: number, dy: number) => (ev: React.PointerEvent) => {
    ev.preventDefault();
    if (locked) return;
    stop();
    actions.begin();
    nudge(dx * STEP, dy * STEP);
    navigator.vibrate?.(4);
    const tick = () => {
      if (!repeat.current) return;
      repeat.current.n++;
      const f = repeat.current.n > 12 ? 4 : repeat.current.n > 5 ? 2 : 1;
      nudge(dx * STEP * f, dy * STEP * f);
      repeat.current.timer = window.setTimeout(tick, 70);
    };
    repeat.current = { timer: window.setTimeout(tick, 320), n: 0 };
  };

  const resize = (dir: 1 | -1) => {
    if (!el || locked) return;
    navigator.vibrate?.(4);
    if (el.type === 'text') {
      const eff = render?.info[el.id]?.effectiveSize ?? el.size;
      const maxW = design.width - 2 * profile.safeMargin;
      // Width-limited text only grows if its box grows too.
      if (dir > 0 && eff < el.size - 0.05 && el.maxWidth >= maxW - 0.1) {
        toast('הטקסט כבר ברוחב המקסימלי – קצרו אותו או הקטינו טקסט אחר');
        return;
      }
      const next = Math.max(4, Math.round((eff + dir * 0.5) * 2) / 2);
      const f = next / Math.max(0.1, eff);
      actions.patch(el.id, {
        size: next,
        ...(el.maxWidth && !el.curve ? { maxWidth: round2(Math.min(maxW, el.maxWidth * f)) } : {}),
      });
      show(`${next}pt`);
    } else {
      const f = dir > 0 ? 1.08 : 1 / 1.08;
      const w = round2(Math.max(0.5, el.width * f));
      actions.patch(el.id, { width: w, height: round2(Math.max(0, el.height * f)) });
      show(`${w.toFixed(1)} מ״מ`);
    }
  };

  if (!selected.length) return null;
  const btn = 'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-2 active:scale-90 active:bg-blue-50 active:text-blue disabled:opacity-30 touch-none select-none';
  const sep = <span className="mx-0.5 h-6 w-px shrink-0 bg-line" />;

  return (
    <div className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 flex flex-col items-center gap-1.5" role="toolbar" aria-label="הזזה ועריכה">
      {flash && (
        <span aria-live="polite" className="pointer-events-none rounded-full bg-ink/85 px-3 py-1 text-xs font-semibold text-white tabular-nums shadow-soft">
          {flash}
        </span>
      )}
      <div className="flex max-w-full animate-pop items-center overflow-x-auto rounded-2xl border border-line bg-white/95 p-1 shadow-lift backdrop-blur [scrollbar-width:none]">
        {/* Nudge pad – RTL order: right first */}
        {(
          [
            ['chevronUp', 'הזזה למעלה', 0, -1],
            ['chevronDown', 'הזזה למטה', 0, 1],
            ['chevronRight', 'הזזה ימינה', 1, 0],
            ['chevronLeft', 'הזזה שמאלה', -1, 0],
          ] as const
        ).map(([icon, label, dx, dy]) => (
          <button
            key={icon}
            type="button"
            aria-label={label}
            disabled={locked}
            onPointerDown={hold(dx, dy)}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onContextMenu={(e) => e.preventDefault()}
            className={btn}
          >
            <Icon name={icon} size={20} />
          </button>
        ))}
        {sep}
        <button type="button" aria-label="הקטנה" disabled={!el || locked} onClick={() => resize(-1)} className={btn}>
          <Icon name="minus" size={18} />
        </button>
        <button type="button" aria-label="הגדלה" disabled={!el || locked} onClick={() => resize(1)} className={btn}>
          <Icon name="plus" size={18} />
        </button>
        {sep}
        <button
          type="button"
          aria-label="מרכוז לרוחב"
          disabled={locked}
          onClick={() => {
            actions.patch(ids, { x: design.width / 2 });
            navigator.vibrate?.(4);
            show('ממורכז');
          }}
          className={btn}
        >
          <Icon name="alignCenter" size={19} />
        </button>
        <button type="button" aria-label="מחיקה" disabled={locked} onClick={() => actions.remove(ids)} className={`${btn} active:!bg-bad/10 active:!text-bad`}>
          <Icon name="trash" size={18} />
        </button>
        {sep}
        <button type="button" aria-label="סיום" onClick={() => actions.select([])} className={`${btn} bg-blue !text-white active:!bg-blue-600`}>
          <Icon name="check" size={19} />
        </button>
      </div>
    </div>
  );
}
