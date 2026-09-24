'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
  const mobileStoryRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const [staticMode, setStaticMode] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    let scene: StampScene | null = null;
    let raf = 0;
    let disposed = false;
    const lowPower = window.innerWidth < 768 || (navigator.hardwareConcurrency ?? 8) <= 4;
    const mq = window.matchMedia('(max-width: 1023px)');
    const ease = (x: number) => x * x * (3 - 2 * x);
    const seg = (p: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (p - a) / (b - a))));

    const progress = () => {
      const el = sectionRef.current!;
      const r = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      return total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    };

    const frame = () => {
      raf = 0;
      if (!scene) return;
      const p = progress();
      const mobile = mq.matches;
      // Mobile: the headline sits over the top of the stage and fades out as
      // the stamp slides up to the centre and takes over the screen.
      const intro = mobile ? seg(p, 0.015, 0.09) : 1;
      if (mobile) {
        // Fit the closed stamp into the space actually left under the headline
        // and buttons (headline height varies with screen width and font).
        const h = canvas.clientHeight || 1;
        const introEl = introRef.current;
        const canvasTop = canvas.parentElement?.offsetTop ?? 64;
        const freeTop = introEl ? Math.max(0, introEl.offsetTop + introEl.offsetHeight - canvasTop + 64) : h * 0.5;
        const freeH = Math.max(120, h - freeTop - 16);
        const startShift = (freeTop + freeH / 2 - h / 2) / h;
        const startZoom = Math.min(0.55, Math.max(0.28, (freeH / h) * 1.15));
        scene.setFraming(startShift * (1 - intro), startZoom + (0.72 - startZoom) * intro);
      } else scene.setFraming(0, 1);
      scene.setProgress(p);
      const introEl = introRef.current;
      if (introEl) {
        introEl.style.opacity = mobile ? String(1 - intro) : '';
        introEl.style.transform = mobile ? `translateY(${-24 * intro}px)` : '';
        introEl.style.pointerEvents = mobile && intro > 0.5 ? 'none' : '';
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      const ms = mobileStoryRef.current;
      if (ms) {
        ms.style.opacity = String(seg(p, 0.08, 0.12));
        ms.querySelectorAll<HTMLElement>('[data-from]').forEach((n) => {
          const on = p >= +n.dataset.from! && p < +n.dataset.to!;
          n.style.opacity = on ? '1' : '0';
          n.style.transform = on ? 'none' : 'translateY(8px)';
          n.style.pointerEvents = on ? 'auto' : 'none';
        });
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
      window.addEventListener('scroll', request, { passive: true });
      setReady(true);
      request();
      cleanup.push(() => {
        window.removeEventListener('resize', resize);
        mq.removeEventListener('change', resize);
        window.removeEventListener('scroll', request);
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
  }, []);

  const animated = !staticMode;
  return (
    <section ref={sectionRef} className={`relative overflow-x-clip ${animated ? 'h-[420vh] max-lg:h-[340vh]' : ''}`} aria-label="החותמת שלכם, מבפנים">
      <div className={`${animated ? 'sticky top-0 h-svh max-lg:min-h-[560px] lg:min-h-dvh lg:h-auto' : 'min-h-dvh'} flex items-center overflow-hidden bg-gradient-to-b from-white via-white to-surface`}>
        <div className="pointer-events-none absolute -top-32 left-[-10%] h-[36rem] w-[36rem] rounded-full bg-gradient-to-br from-blue/10 to-violet/10 blur-3xl" />
        <div className={`container-x relative grid w-full gap-6 lg:h-auto lg:grid-cols-2 lg:items-center lg:pt-20 ${animated ? 'h-full content-start pt-20' : 'pt-24 pb-10'}`}>
          <div ref={introRef} className="relative z-10 max-w-xl will-change-transform">
            <p className="eyebrow animate-fade-up">חותמות בהתאמה אישית · מוכנות תוך 2 דקות</p>
            <h1 className="mt-2 animate-fade-up text-[2.15rem] leading-[1.1] max-[390px]:text-[1.9rem] font-extrabold sm:mt-3 sm:text-5xl lg:text-6xl lg:leading-[1.08]">
              מעצבים חותמת אונליין.
              <br />
              <span className="grad-text">אנחנו הופכים אותה למוצר אמיתי.</span>
            </h1>
            <p className="mt-3 animate-fade-up text-base leading-7 text-muted max-[390px]:text-[15px] max-[390px]:leading-6 sm:mt-5 sm:text-lg sm:leading-8">
              בחרו חותמת, הוסיפו טקסט או לוגו, ראו את התוצאה בזמן אמת והזמינו ישירות לייצור.
            </p>
            <div className="mt-5 flex animate-fade-up gap-2.5 sm:mt-8 sm:flex-wrap sm:gap-3">
              <Link href="/designer/" className="btn-primary max-sm:flex-1 sm:btn-lg">
                עיצוב חותמת עכשיו
              </Link>
              <Link href="/how-it-works/" className="btn-outline max-sm:flex-1 sm:btn-lg">
                איך זה עובד
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
          <div className={animated ? 'absolute inset-x-0 top-16 bottom-0 lg:relative lg:inset-auto lg:h-[78vh] lg:min-h-[320px]' : 'relative h-[46vh] min-h-[300px] lg:h-[78vh]'}>
            {!ready && (
              <div className={`absolute inset-0 grid place-items-center p-10 ${animated ? 'max-lg:top-auto max-lg:h-[42%] max-lg:p-4' : ''}`}>
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

        {/* Mobile story: a caption card under the stamp, with scroll progress. */}
        {animated && (
          <div ref={mobileStoryRef} className="absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] opacity-0 lg:hidden" aria-hidden={!ready}>
            <div className="relative h-[92px] overflow-hidden rounded-2xl border border-line bg-white/85 shadow-soft backdrop-blur-md">
              {STORY.filter((s) => s.title).map((s, i, arr) => (
                <div key={s.from} data-from={s.from} data-to={i === arr.length - 1 ? 1.01 : arr[i + 1].from} className="absolute inset-0 flex items-center gap-3 px-4 opacity-0 transition duration-300">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-blue">
                      {s.eyebrow} <span className="font-normal text-muted">· {i + 1}/{arr.length}</span>
                    </p>
                    <p className="mt-0.5 text-[17px] leading-snug font-bold">{s.title}</p>
                  </div>
                  {i === arr.length - 1 && (
                    <Link href="/designer/" className="btn-primary btn-sm shrink-0">
                      לעיצוב
                    </Link>
                  )}
                </div>
              ))}
              <span className="absolute inset-x-0 bottom-0 h-1 bg-line/60">
                <span ref={barRef} className="block h-full origin-right bg-blue" style={{ transform: 'scaleX(0)' }} />
              </span>
            </div>
          </div>
        )}

        {animated && (
          <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-muted lg:flex" aria-hidden>
            גללו כדי לראות מבפנים
            <span className="h-8 w-5 rounded-full border border-ink/20 p-1">
              <span className="block h-2 w-full animate-bounce rounded-full bg-ink/40" />
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
