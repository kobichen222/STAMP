'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { StampScene } from './stamp-scene';
import { PART_LABELS } from './stamp-labels';

const STORY = [
  { from: 0, to: 0.1, eyebrow: 'Stamp2Go', title: null },
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
      scene.setProgress(p);
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
      window.addEventListener('scroll', request, { passive: true });
      setReady(true);
      request();
      cleanup.push(() => {
        window.removeEventListener('resize', resize);
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

  return (
    <section ref={sectionRef} className={`relative ${staticMode ? '' : 'h-[420vh] max-md:h-[300vh]'}`} aria-label="החותמת שלכם, מבפנים">
      <div className={`${staticMode ? '' : 'sticky top-0'} flex min-h-dvh items-center overflow-hidden bg-gradient-to-b from-white via-white to-surface`}>
        <div className="pointer-events-none absolute -top-32 left-[-10%] h-[36rem] w-[36rem] rounded-full bg-gradient-to-br from-blue/10 to-violet/10 blur-3xl" />
        <div className="container-x relative grid w-full items-center gap-6 pt-20 lg:grid-cols-2">
          <div className="relative z-10 max-w-xl">
            <p className="eyebrow animate-fade-up">חותמות בהתאמה אישית · מוכנות תוך 2 דקות</p>
            <h1 className="mt-3 animate-fade-up text-[2.6rem] leading-[1.08] font-extrabold sm:text-6xl">
              מעצבים חותמת אונליין.
              <br />
              <span className="grad-text">אנחנו הופכים אותה למוצר אמיתי.</span>
            </h1>
            <p className="mt-5 animate-fade-up text-lg leading-8 text-muted">
              בחרו חותמת, הוסיפו טקסט או לוגו, ראו את התוצאה בזמן אמת והזמינו ישירות לייצור.
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3">
              <Link href="/designer/" className="btn-primary btn-lg">
                עיצוב חותמת עכשיו
              </Link>
              <Link href="/how-it-works/" className="btn-outline btn-lg">
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
          <div className="relative h-[46vh] min-h-[320px] lg:h-[78vh]">
            {!ready && (
              <div className="absolute inset-0 grid place-items-center p-10">
                <div className="h-full max-h-[420px] w-full max-w-[420px]">
                  <StaticStamp />
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className={`h-full w-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
            <div ref={labelsRef} className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
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
        {!staticMode && (
          <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-muted md:flex" aria-hidden>
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
