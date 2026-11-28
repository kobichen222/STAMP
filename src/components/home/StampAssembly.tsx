'use client';

import { useEffect, useRef } from 'react';
import { motionReduced } from '@/lib/motion';
import { ASSEMBLED, IMPRINT, PARTS, type PartId } from './stamp-parts';

/**
 * Home-page hero animation built from the product render in
 * design/reference/colop-printer-20-exploded.png: the closed stamp opens into
 * its six parts (with labels), closes again, presses, and leaves an imprint.
 *
 * Everything is laid out in the render's own pixel grid ("stage units") and
 * positioned with percentages, so the stage scales with the page without JS.
 * A single requestAnimationFrame loop drives the timeline from `progress`.
 */

const ORDER: PartId[] = ['cover', 'sheet', 'body', 'pad', 'plate', 'base'];

const LABELS: Record<PartId, string> = {
  cover: 'כיסוי עליון עם עיצוב',
  sheet: 'דף עיצוב מתחלף עם לוגו',
  body: 'גוף החותמת (מנגנון)',
  pad: 'כרית דיו מתחלפת',
  plate: 'פלטת גומי להחרטה',
  base: 'בסיס שקוף',
};

// ---------------------------------------------------------------- stage geometry
const GUTTER = 300; // room for the labels, left of the stack (stage units)
const PAD = 12;
const minX = Math.min(...ORDER.map((id) => PARTS[id].x));
const maxX = Math.max(...ORDER.map((id) => PARTS[id].x + PARTS[id].w));
const minY = Math.min(...ORDER.map((id) => PARTS[id].y));
const maxY = Math.max(...ORDER.map((id) => PARTS[id].y + PARTS[id].h));
const STAGE_W = GUTTER + (maxX - minX) + PAD * 2;
const STAGE_H = maxY - minY + PAD * 2;
// Source pixel -> stage unit.
const sx = (x: number) => x - minX + GUTTER + PAD;
const sy = (y: number) => y - minY + PAD;

const body = PARTS.body;
/** Where each part sits when the stamp is closed (stage y of the part's top). */
const COLLAPSED_Y: Record<PartId, number> = {
  cover: sy(body.y + 12 - PARTS.cover.h),
  sheet: sy(body.y + 12 - PARTS.cover.h + 14),
  body: sy(body.y),
  pad: sy(body.y + body.h * 0.55 - PARTS.pad.h / 2),
  plate: sy(body.y + body.h * 0.74 - PARTS.plate.h / 2),
  base: sy(body.y + body.h - 42),
};
const EXPLODED_Y: Record<PartId, number> = Object.fromEntries(ORDER.map((id) => [id, sy(PARTS[id].y)])) as Record<PartId, number>;
/** Parts that live inside the housing: invisible while the stamp is closed. */
const INNER: PartId[] = ['sheet', 'pad', 'plate'];

// Closed stamp photo: as wide as the housing, standing on the collapsed base.
const ASM_W = body.w * 0.98;
const ASM_H = (ASM_W * ASSEMBLED.h) / ASSEMBLED.w;
const ASM_X = sx(body.x + body.w / 2) - ASM_W / 2;
const ASM_BOTTOM = COLLAPSED_Y.base + PARTS.base.h - 6;
const ASM_Y = ASM_BOTTOM - ASM_H;
// Imprint on the "paper" below the closed stamp.
const IMP_W = body.w * 0.92;
const IMP_H = (IMP_W * IMPRINT.h) / IMPRINT.w;
const IMP_X = sx(body.x + body.w / 2) - IMP_W / 2 - 10;
const IMP_Y = ASM_BOTTOM + 34;

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

// ---------------------------------------------------------------- timeline
const CYCLE = 14000; // ms
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)));

export interface Frame {
  /** 0 closed … 1 fully exploded */
  explode: number;
  /** Visibility of the exploded stack (vs the closed photo). */
  stack: number;
  press: number;
  imprint: number;
  labels: number[];
}

export function frameAt(p: number): Frame {
  const explode = seg(p, 0.1, 0.26) * (1 - seg(p, 0.5, 0.64));
  const stack = seg(p, 0.07, 0.1) * (1 - seg(p, 0.64, 0.67));
  const press = seg(p, 0.69, 0.72) * (1 - seg(p, 0.72, 0.755));
  const imprint = seg(p, 0.715, 0.76) * (1 - seg(p, 0.95, 1));
  const labels = ORDER.map((_, i) => {
    const a = 0.15 + i * 0.03;
    return seg(p, a, a + 0.05) * (1 - seg(p, 0.48, 0.52));
  });
  return { explode, stack, press, imprint, labels };
}

/** Reduced motion / no JS: the opened stamp with its labels, nothing moves. */
const STILL: Frame = { explode: 1, stack: 1, press: 0, imprint: 0, labels: ORDER.map(() => 1) };

export function StampAssembly({ onProgress, className = '' }: { onProgress?: (p: number) => void; className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current!;
    const parts = ORDER.map((id) => root.querySelector<HTMLElement>(`[data-part="${id}"]`)!);
    const labels = ORDER.map((id) => root.querySelector<HTMLElement>(`[data-label="${id}"]`)!);
    const closed = root.querySelector<HTMLElement>('[data-closed]')!;
    const imprint = root.querySelector<HTMLElement>('[data-imprint]')!;

    const apply = (f: Frame) => {
      ORDER.forEach((id, i) => {
        const el = parts[i];
        const y = COLLAPSED_Y[id] + (EXPLODED_Y[id] - COLLAPSED_Y[id]) * f.explode;
        // translate % is relative to the element's own height.
        el.style.transform = `translateY(${((y - EXPLODED_Y[id]) / PARTS[id].h) * 100}%)`;
        const inner = INNER.includes(id) ? clamp((f.explode - 0.12) / 0.3) : 1;
        el.style.opacity = String(f.stack * inner);
        labels[i].style.opacity = String(f.labels[i]);
        labels[i].style.transform = `translate(${(1 - f.labels[i]) * -10}px, -50%)`;
      });
      closed.style.opacity = String(1 - f.stack);
      closed.style.transform = `translateY(${f.press * 4.5}%)`;
      imprint.style.opacity = String(f.imprint);
      imprint.style.transform = `rotate(-5deg) scale(${0.94 + 0.06 * f.imprint})`;
    };

    if (motionReduced()) {
      apply(STILL);
      onProgress?.(0.35);
      return;
    }

    let raf = 0;
    let elapsed = 0;
    let last = 0;
    let visible = true;
    const tick = (now: number) => {
      raf = 0;
      if (last) elapsed += Math.min(64, now - last);
      last = now;
      const p = (elapsed % CYCLE) / CYCLE;
      apply(frameAt(p));
      onProgress?.(p);
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const play = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) play();
    });
    io.observe(root);
    document.addEventListener('visibilitychange', play);
    apply(frameAt(0));
    play();
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', play);
      cancelAnimationFrame(raf);
    };
  }, [onProgress]);

  return (
    <div ref={rootRef} className={`stamp-stage-wrap ${className}`} aria-label="הדמיה: החותמת נפתחת לחלקיה ונסגרת" role="img">
      {/* Below lg the labels are hidden, so shift the stack back into the middle of the empty gutter. */}
      <div className="stamp-stage max-lg:-translate-x-[22%]" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, width: `min(100%, calc(100cqh * ${STAGE_W / STAGE_H}))` }}>
        {/* Closed stamp (what the page shows first, before any script runs). */}
        <img
          data-closed
          src="/img/stamp/assembled.png"
          alt=""
          width={ASSEMBLED.w}
          height={ASSEMBLED.h}
          fetchPriority="high"
          decoding="async"
          className="absolute will-change-transform"
          style={{ left: pct(ASM_X, STAGE_W), top: pct(ASM_Y, STAGE_H), width: pct(ASM_W, STAGE_W) }}
        />
        <img
          data-imprint
          src="/img/stamp/imprint.png"
          alt=""
          width={IMPRINT.w}
          height={IMPRINT.h}
          loading="lazy"
          decoding="async"
          className="absolute opacity-0 will-change-transform"
          style={{ left: pct(IMP_X, STAGE_W), top: pct(IMP_Y, STAGE_H), width: pct(IMP_W, STAGE_W) }}
        />
        {/* The six parts, each at its exploded position; the frame loop slides them. */}
        {ORDER.map((id, i) => (
          <img
            key={id}
            data-part={id}
            src={`/img/stamp/${id}.png`}
            alt=""
            width={PARTS[id].w}
            height={PARTS[id].h}
            loading="lazy"
            decoding="async"
            className="absolute opacity-0 will-change-transform"
            style={{ left: pct(sx(PARTS[id].x), STAGE_W), top: pct(EXPLODED_Y[id], STAGE_H), width: pct(PARTS[id].w, STAGE_W), zIndex: 10 - i }}
          />
        ))}
        {/* Labels: desktop only, left of each part with a pointer line. */}
        {ORDER.map((id) => (
          <span
            key={id}
            data-label={id}
            className="stamp-label"
            style={{ top: pct(EXPLODED_Y[id] + PARTS[id].h / 2, STAGE_H), right: pct(STAGE_W - sx(PARTS[id].x) + 6, STAGE_W) }}
          >
            {/* RTL flex: first child sits at the right, next to the part. */}
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="h-px w-8 bg-red-500/70" />
            <span className="rounded-full border border-line bg-white/90 px-2.5 py-1 shadow-soft backdrop-blur">{LABELS[id]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
