'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motionReduced, useMotionReduced } from '@/lib/motion';
import type { StampScene } from './stamp-scene';
import { PART_LABELS } from './stamp-labels';

const STORY = [
  { from: 0, to: 0.1, eyebrow: 'חותמות 2 דקות', title: null },
  { from: 0.12, to: 0.42, eyebrow: 'מבפנים', title: 'כל רכיב מדויק. כל חותמת נבנית להחזיק שנים.' },
  { from: 0.44, to: 0.62, eyebrow: 'פלטת הגומי', title: 'העיצוב שלכם הופך לפלטת גומי – בדיוק במילימטר.' },
  { from: 0.64, to: 0.8, eyebrow: 'הרכבה', title: 'מוכנה תוך 2 דקות מרגע האישור.' },
  { from: 0.84, to: 1.01, eyebrow: 'עכשיו תורכם', title: 'עכשיו תורכם לעצב.' },
];

/** Static fallback shown before WebGL loads, on reduced motion and without WebGL. */
function StaticStamp() {
  return (
    <svg viewBox="0 0 320 300" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="h" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1c2a44" />
          <stop offset="1" stopColor="#0b1426" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="262" rx="120" ry="16" fill="#0b1426" opacity=".08" />
      <rect x="95" y="40" width="130" height="58" rx="29" fill="url(#h)" />
      <rect x="70" y="92" width="180" height="120" rx="10" fill="#eef1f6" stroke="#dfe4ec" />
      <rect x="84" y="150" width="152" height="10" rx="3" fill="#2457ff" />
      <rect x="62" y="210" width="196" height="30" rx="6" fill="#e3e8ef" />
      <rect x="62" y="238" width="196" height="8" rx="4" fill="#2457ff" />
    </svg>
  );
}

export function StampHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [staticMode, setStaticMode] = useState(false);

  // Re-evaluated when the accessibility menu stops / restarts animations.
  const motionOff = useMotionReduced();

  useEffect(() => {
    const reduced = motionReduced();
    const canvas = canvasRef.current!;
    const hasGL = (() => {
      try {
        return !!document.createElement('canvas').getContext('webgl2');
      } catch {
        return false;
      }
    })();
    if (reduced || !hasGL) {
      setStaticMode(true);
      return;
    }
    setStaticMode(false);
    let scene: StampScene | null = null;
    let raf = 0;
    let disposed = false;
    const lowPower = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4;
    const mq = window.matchMedia('(max-width: 1023px)');
    const ease = (x: number) => x * x * (3 - 2 * x);

    // Plays by itself (no scroll-jacking): forward, hold on the finished
    // impression, gently back, hold – and again. Paused when off-screen.
    const FWD = 15000;
    const HOLD_END = 2600;
    const BACK = 5200;
    const HOLD_START = 1400;
    const CYCLE = FWD + HOLD_END + BACK + HOLD_START;
    let elapsed = 0;
    let last = 0;
    let visible = true;
    const progress = () => {
      const t = elapsed % CYCLE;
      if (t < FWD) return t / FWD;
      if (t < FWD + HOLD_END) return 1;
      if (t < FWD + HOLD_END + BACK) return 1 - ease((t - FWD - HOLD_END) / BACK);
      return 0;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!scene) return;
      if (last) elapsed += Math.min(64, now - last);
      last = now;
      const p = progress();
      const mobile = mq.matches;

      // The stage has its own area under the headline on every screen size.
      scene.setFraming(mobile ? 0.04 : 0, mobile ? 0.92 : 1);
      scene.setProgress(p);
      const introEl = introRef.current;
      if (introEl) {
        introEl.style.opacity = '';
        introEl.style.transform = '';
        introEl.style.pointerEvents = '';
      }
      const labels = labelsRef.current;
      if (labels) {
        for (const pos of scene.labelPositions()) {
          const node = labels.querySelector<HTMLElement>(`[data-part="${pos.id}"]`);
          if (!node) continue;
          node.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(0, -50%)`;
          node.style.opacity = String(pos.visible);
        }
      }
      const story = storyRef.current;
      if (story) {
        story.querySelectorAll<HTMLElement>('[data-from]').forEach((n) => {
          const a = +n.dataset.from!;
          const b = +n.dataset.to!;
          const on = p >= a && p < b;
          n.style.opacity = on ? '1' : '0';
          n.style.transform = on ? 'none' : 'translateY(10px)';
        });
      }
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const loop = (now: number) => {
      frame(now);
      if (visible && !document.hidden && !disposed) raf = requestAnimationFrame(loop);
      else last = 0;
    };
    const play = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };

    const start = async () => {
      const { createStampScene } = await import('./stamp-scene');
      if (disposed) return;
      await document.fonts?.load('800 40px Heebo').catch(() => undefined);
      scene = createStampScene(canvas, { lowPower, lines: ['ישראל ישראלי', 'עורך דין ונוטריון', 'מ.ר. 12345'] });
      const resize = () => {
        const { width, height } = canvas.getBoundingClientRect();
        scene?.resize(width, height);
        request();
      };
      resize();
      window.addEventListener('resize', resize);
      mq.addEventListener('change', resize);
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) play();
      });
      io.observe(sectionRef.current!);
      const onVis = () => play();
      document.addEventListener('visibilitychange', onVis);
      setReady(true);
      play();
      cleanup.push(() => {
        io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('resize', resize);
        mq.removeEventListener('change', resize);
      });
    };
    const cleanup: (() => void)[] = [];
    // Load 3D after the page is idle so it never competes with LCP.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => void start(), { timeout: 1500 });
    else setTimeout(() => void start(), 600);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup.forEach((f) => f());
      scene?.dispose();
    };
  }, [motionOff]);

  const animated = !staticMode;
  return (
    <section ref={sectionRef} className="relative overflow-x-clip" aria-label="מעצבים חותמת אונליין">
      {/* Shorter than the screen on purpose: the next section peeks in, so it's clear the page goes on. */}
      <div className="relative flex items-center overflow-hidden bg-gradient-to-b from-white via-white to-surface lg:min-h-[calc(100dvh-12rem)]">
        <div className="pointer-events-none absolute -top-32 left-[-10%] h-[36rem] w-[36rem] rounded-full bg-gradient-to-br from-blue/10 to-violet/10 blur-3xl" />
        <div className={`container-x relative grid w-full gap-6 lg:grid-cols-2 lg:items-center lg:pt-24 ${animated ? 'h-full content-start pt-24 max-lg:pb-[calc(30svh+4rem)]' : 'pt-24 pb-10'}`}>
          <div ref={introRef} className="relative z-10 max-w-xl will-change-transform">
            <h1 className="animate-fade-up text-[2.15rem] leading-[1.12] font-extrabold max-[390px]:text-[1.9rem] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1] xl:text-6xl">
              מעצבים חותמת אונליין,
              <br />
              <span className="grad-text">החותמת מוכנה תוך&nbsp;2&nbsp;דקות.</span>
            </h1>
            <ul className="mt-2 flex animate-fade-up flex-wrap items-center gap-x-4 gap-y-1 text-lg font-bold text-ink-2 sm:mt-3 sm:text-2xl">
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue" aria-hidden /> איסוף עצמי ברמת גן
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue" aria-hidden /> משלוחים לכל הארץ
              </li>
            </ul>
            <div className="mt-5 flex animate-fade-up flex-wrap items-center gap-x-4 gap-y-3 sm:mt-9">
              <Link
                href="/designer/"
                className="btn-primary cta-glow group !h-12 !rounded-xl !px-6 !text-[17px] font-extrabold shadow-[0_14px_30px_-12px_rgba(36,87,255,.8)] sm:!h-[4.25rem] sm:!rounded-2xl sm:!px-9 sm:!text-[1.35rem]"
              >
                עצבו חותמת עכשיו
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition group-hover:-translate-x-1" aria-hidden>
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
              </Link>
              <Link href="/how-it-works/" className="font-semibold text-blue underline-offset-4 hover:underline sm:px-3">
                איך זה עובד?
              </Link>
            </div>
            <div ref={storyRef} className="relative mt-10 hidden h-20 lg:block" aria-hidden={!ready}>
              {STORY.filter((s) => s.title).map((s) => (
                <div key={s.from} data-from={s.from} data-to={s.to} className="absolute inset-0 opacity-0 transition duration-500">
                  <p className="text-sm font-semibold text-blue">{s.eyebrow}</p>
                  <p className="mt-1 text-2xl font-bold">{s.title}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={animated ? 'absolute inset-x-0 bottom-14 h-[30svh] min-h-[210px] lg:relative lg:inset-auto lg:h-[60vh] lg:min-h-[320px]' : 'relative h-[46vh] min-h-[300px] lg:h-[72vh]'}>
            {!ready && (
              <div className={`absolute inset-0 grid place-items-center p-10 ${animated ? 'max-lg:p-4' : ''}`}>
                <div className="h-full max-h-[420px] w-full max-w-[420px]">
                  <StaticStamp />
                </div>
              </div>
            )}
            {animated && <canvas ref={canvasRef} className={`h-full w-full transition-opacity duration-700 [mask-image:linear-gradient(to_bottom,transparent,#000_3%,#000_96%,transparent)] ${ready ? 'opacity-100' : 'opacity-0'}`} aria-hidden />}
            <div ref={labelsRef} className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
              {PART_LABELS.map((l) => (
                <span
                  key={l.id}
                  data-part={l.id}
                  className="absolute top-0 left-0 flex items-center gap-2 text-[13px] font-medium whitespace-nowrap text-ink-2 opacity-0"
                >
                  <span className="h-px w-8 bg-ink/30" />
                  <span className="rounded-full border border-line bg-white/90 px-2.5 py-1 shadow-soft backdrop-blur">{l.text}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <a
          href="#how"
          className="group absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full whitespace-nowrap border border-blue/25 bg-white/90 py-2 ps-5 pe-2 text-[15px] font-bold text-blue shadow-soft backdrop-blur transition hover:bg-blue hover:text-white sm:text-base"
        >
          איך זה עובד? גללו למטה
          <span className="grid h-8 w-8 animate-bounce place-items-center rounded-full bg-blue text-white group-hover:bg-white group-hover:text-blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </a>
      </div>
    </section>
  );
}
