'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SITE } from '@/lib/config';
import { ATTRS, DEFAULTS, PROFILES, STORAGE_KEY, TEXT_SCALES, type A11ySettings, type ProfileId } from './settings';

// ------------------------------------------------------------------ icons (24-unit stroke paths)
const P: Record<string, string> = {
  access: 'M12 3.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6zM4.5 8.2l7.5 1.3 7.5-1.3M12 9.5v4.3M12 13.8l-3.3 7M12 13.8l3.3 7',
  text: 'M4 7V5h11v2M9.5 5v14M7 19h5M14 12v-1.5h6V12M17 10.5V19M15.5 19h3',
  lineHeight: 'M10 6h10M10 12h10M10 18h10M5 4v16M3 6l2-2 2 2M3 18l2 2 2-2',
  letter: 'M3 17l3.5-10L10 17M4.3 13.5h4.4M13 7v10M13 7h3a2.5 2.5 0 0 1 0 5h-3h3.5a2.5 2.5 0 0 1 0 5H13M3 21h18M5 19.5 3 21l2 1.5M19 19.5l2 1.5-2 1.5',
  word: 'M3 8h6M3 12h6M3 16h6M15 8h6M15 12h6M15 16h6M10.5 12h3',
  font: 'M5 19 10.5 5h1L17 19M7.2 14h8.6M19 19V9',
  align: 'M4 6h16M8 10h12M4 14h16M8 18h12',
  contrast: 'M12 3a9 9 0 1 0 0 18zM12 3a9 9 0 0 1 0 18',
  dark: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  light: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  mono: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M12 8h6.5M12 12h9M12 16h6.5',
  drop: 'M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z',
  dropHalf: 'M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5zM12 4v16',
  invert: 'M4 4h16v16H4zM4 20 20 4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  heading: 'M6 4v16M18 4v16M6 12h12',
  cursor: 'M6 3l12 11h-6.5l3.8 6.5-2.6 1.4-3.8-6.6L4.5 20z',
  guide: 'M3 6h18M3 18h18M2 11h20v2H2z',
  mask: 'M3 3h18v6H3zM3 15h18v6H3zM3 11h18',
  pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
  image: 'M4 5h16v14H4zM4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18M3 3l18 18',
  speak: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  zoom: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.5-4.5M8 11h6M11 8v6',
  keyboard: 'M3 6h18v12H3zM6.5 9.5h1M10 9.5h1M13.5 9.5h1M17 9.5h.5M6.5 13h1M17 13h.5M9.5 15.5h5',
  focus: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M9 9h6v6H9z',
  tree: 'M4 4h6v4H4zM14 10h6v4h-6zM14 17h6v4h-6zM7 8v11h7M7 12h7',
  reset: 'M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17 19 7',
  big: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  swap: 'M7 7h13l-3-3M17 17H4l3 3',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  book: 'M4 5c3-1.2 6-1 8 1 2-2 5-2.2 8-1v14c-3-1.1-6-.9-8 1-2-1.9-5-2.1-8-1zM12 6v14',
  stop: 'M6 6h12v12H6z',
  play: 'M7 5v14l11-7z',
};

function Svg({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <path d={P[name]} />
    </svg>
  );
}

// ------------------------------------------------------------------ helpers

function load(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(s: A11ySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

const isDefault = (s: A11ySettings) => (Object.keys(DEFAULTS) as (keyof A11ySettings)[]).every((k) => k === 'side' || k === 'bigUi' || s[k] === DEFAULTS[k]);

/** Mirror the settings into data-a11y-* attributes (read by a11y.css and by the boot script). */
function applyAttrs(s: A11ySettings) {
  const el = document.documentElement;
  for (const [key, attr] of Object.entries(ATTRS) as [keyof A11ySettings, string][]) {
    const v = s[key];
    if (v === false || v === 0 || v === '' || v == null) el.removeAttribute(attr);
    else el.setAttribute(attr, v === true ? '1' : String(v));
  }
  if (s.motion) el.setAttribute('data-a11y-motion', 'off');
  else el.removeAttribute('data-a11y-motion');
  window.dispatchEvent(new Event('a11y:change'));
}

// --- text scaling: every element that carries its own text gets an explicit px size.
const SKIP = '#a11y-ui, svg, script, style, noscript, [data-a11y-skip]';
const scaled = new Set<HTMLElement>();

function textElements(): HTMLElement[] {
  const out: HTMLElement[] = [];
  const all = document.body.querySelectorAll<HTMLElement>('*');
  for (const el of all) {
    if (el.closest(SKIP)) continue;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') {
      out.push(el);
      continue;
    }
    for (const n of el.childNodes) {
      if (n.nodeType === 3 && n.textContent && n.textContent.trim()) {
        out.push(el);
        break;
      }
    }
  }
  return out;
}

function applyTextScale(scale: number) {
  for (const el of scaled) {
    el.style.removeProperty('font-size');
    el.removeAttribute('data-a11y-fs');
  }
  scaled.clear();
  if (scale === 1) return;
  const els = textElements();
  const sizes = els.map((el) => parseFloat(getComputedStyle(el).fontSize) || 16); // read all first…
  els.forEach((el, i) => {
    // …then write all, so the page lays out once.
    el.style.setProperty('font-size', `${(sizes[i] * scale).toFixed(2)}px`, 'important');
    el.setAttribute('data-a11y-fs', '');
    scaled.add(el);
  });
}

// --- speech
function speak(text: string, onEnd?: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) return false;
  synth.cancel();
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return true;
  // Long text is split into sentences – some engines stop after ~200 characters.
  const parts = clean.match(/[^.!?。\n]{1,220}[.!?]?/g) ?? [clean];
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('he')) ?? null;
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    u.lang = 'he-IL';
    if (voice) u.voice = voice;
    u.rate = 0.95;
    if (i === parts.length - 1 && onEnd) u.onend = onEnd;
    synth.speak(u);
  });
  return true;
}

const readable = (el: Element | null): HTMLElement | null =>
  (el?.closest('p, li, h1, h2, h3, h4, h5, h6, td, th, dd, dt, blockquote, label, summary, figcaption, a, button') as HTMLElement | null) ?? null;

// ------------------------------------------------------------------ UI pieces

type Opt<T> = { value: T; label: string };

function Tile({
  icon,
  label,
  active,
  onClick,
  levels,
  level,
  hint,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  levels?: number;
  level?: number;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={`a11y-tile group relative flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center text-[13px] font-semibold leading-tight transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400] ${
        active ? 'border-[#2457ff] bg-[#2457ff] text-white shadow-[0_8px_20px_-8px_rgba(36,87,255,.7)]' : 'border-[#e3e8f2] bg-white text-[#0b1426] hover:border-[#2457ff]/50 hover:bg-[#f3f6ff]'
      }`}
    >
      {active && (
        <span className="absolute top-1.5 left-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-[#2457ff]">
          <Svg name="check" size={13} />
        </span>
      )}
      <Svg name={icon} size={26} />
      <span>{label}</span>
      {levels ? (
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: levels }, (_, i) => (
            <span key={i} className={`h-1.5 w-4 rounded-full ${i < (level ?? 0) ? (active ? 'bg-white' : 'bg-[#2457ff]') : active ? 'bg-white/35' : 'bg-[#dfe6f2]'}`} />
          ))}
        </span>
      ) : null}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2.5 px-1 text-[13px] font-bold tracking-wide text-[#5b6678]">{title}</h3>
      <div className="a11y-grid grid grid-cols-2 gap-2.5 min-[380px]:grid-cols-3">{children}</div>
    </section>
  );
}

/** Cycle helper for multi-value tiles. */
function cycle<T>(opts: Opt<T>[], current: T): T {
  const i = opts.findIndex((o) => o.value === current);
  return opts[(i + 1) % opts.length].value;
}

const FONT_OPTS: Opt<A11ySettings['font']>[] = [
  { value: '', label: 'גופן קריא' },
  { value: 'readable', label: 'גופן קריא' },
  { value: 'dyslexia', label: 'גופן לדיסלקציה' },
];
const ALIGN_OPTS: Opt<A11ySettings['align']>[] = [
  { value: '', label: 'יישור טקסט' },
  { value: 'right', label: 'יישור לימין' },
  { value: 'center', label: 'יישור למרכז' },
  { value: 'left', label: 'יישור לשמאל' },
];
const CURSOR_OPTS: Opt<A11ySettings['cursor']>[] = [
  { value: '', label: 'סמן גדול' },
  { value: 'dark', label: 'סמן גדול שחור' },
  { value: 'light', label: 'סמן גדול לבן' },
];

const PROFILE_ICON: Record<ProfileId, string> = { vision: 'eye', seizure: 'bolt', adhd: 'target', cognitive: 'brain', dyslexia: 'book', keyboard: 'keyboard' };

// ------------------------------------------------------------------ main component

export function AccessibilityMenu() {
  const pathname = usePathname();
  const [s, setS] = useState<A11ySettings>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'main' | 'structure'>('main');
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const maskTopRef = useRef<HTMLDivElement>(null);
  const maskBottomRef = useRef<HTMLDivElement>(null);
  const magRef = useRef<HTMLDivElement>(null);

  // Load once.
  useEffect(() => {
    setS(load());
    setMounted(true);
  }, []);

  // Persist + mirror to <html>.
  useEffect(() => {
    if (!mounted) return;
    save(s);
    applyAttrs(s);
  }, [s, mounted]);

  const update = useCallback(<K extends keyof A11ySettings>(key: K, value: A11ySettings[K]) => {
    // Menu preferences keep the active profile; any page adjustment makes it "custom".
    setS((prev) => ({ ...prev, [key]: value, profile: key === 'side' || key === 'bigUi' ? prev.profile : '' }));
  }, []);
  const toggle = (key: keyof A11ySettings) => update(key, !s[key] as never);
  const step = (key: 'text' | 'lineHeight' | 'letter' | 'word', max: number) => update(key, ((s[key] + 1) % (max + 1)) as never);

  const announce = (msg: string) => {
    setNotice('');
    requestAnimationFrame(() => setNotice(msg));
  };

  // --- text size: re-applied on navigation and when content changes.
  useEffect(() => {
    if (!mounted) return;
    const scale = TEXT_SCALES[s.text];
    applyTextScale(scale);
    if (scale === 1) return;
    let t = 0;
    const mo = new MutationObserver((records) => {
      if (records.every((r) => (r.target as Element).closest?.('#a11y-ui'))) return;
      window.clearTimeout(t);
      t = window.setTimeout(() => applyTextScale(scale), 250);
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, [s.text, mounted, pathname]);
  useEffect(() => () => applyTextScale(1), []);

  // --- videos follow "stop animations".
  useEffect(() => {
    if (!mounted || !s.motion) return;
    document.querySelectorAll('video').forEach((v) => v.pause());
  }, [s.motion, mounted, pathname]);

  // --- reading guide / mask / magnifier follow the pointer.
  useEffect(() => {
    if (!s.guide && !s.mask && !s.magnifier) return;
    const H = 110;
    let raf = 0;
    const move = (x: number, y: number, target: EventTarget | null) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (guideRef.current) guideRef.current.style.top = `${y}px`;
        if (maskTopRef.current) maskTopRef.current.style.height = `${Math.max(0, y - H / 2)}px`;
        if (maskBottomRef.current) maskBottomRef.current.style.top = `${y + H / 2}px`;
        const mag = magRef.current;
        if (mag && s.magnifier) {
          const el = target instanceof Element && !target.closest('#a11y-ui') ? target : null;
          const img = el?.closest('img');
          const txt = img ? (img.getAttribute('alt') ? `תמונה: ${img.getAttribute('alt')}` : '') : (readable(el)?.innerText ?? '').trim().slice(0, 240);
          if (txt) {
            mag.textContent = txt;
            mag.style.display = 'block';
            const w = mag.offsetWidth;
            const h = mag.offsetHeight;
            mag.style.left = `${Math.min(window.innerWidth - w - 12, Math.max(12, x - w / 2))}px`;
            mag.style.top = `${y + 28 + h > window.innerHeight ? y - h - 20 : y + 28}px`;
          } else mag.style.display = 'none';
        }
      });
    };
    const onPointer = (e: PointerEvent) => move(e.clientX, e.clientY, e.target);
    const onTouch = (e: TouchEvent) => e.touches[0] && move(e.touches[0].clientX, e.touches[0].clientY, e.target);
    const start = window.innerHeight / 2;
    move(window.innerWidth / 2, start, null);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [s.guide, s.mask, s.magnifier]);

  // --- read aloud on click.
  useEffect(() => {
    if (!s.tts) return;
    let current: HTMLElement | null = null;
    const clear = () => current?.classList.remove('a11y-reading');
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest('#a11y-ui')) return;
      const el = readable(t);
      if (!el) return;
      const interactive = el.closest('a, button, input, select, textarea, summary, label');
      clear();
      current = el;
      el.classList.add('a11y-reading');
      speak(el.innerText || el.getAttribute('aria-label') || '', clear);
      // Links and buttons still work – the reading only accompanies them.
      if (!interactive) e.stopPropagation();
    };
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!el || el.closest('#a11y-ui')) return;
      const label = el.getAttribute('aria-label') || el.innerText || (el as HTMLInputElement).placeholder || '';
      if (label.trim()) speak(label);
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      clear();
      window.speechSynthesis?.cancel();
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('focusin', onFocus);
    };
  }, [s.tts]);

  // --- keyboard navigation shortcuts (H headings, K links, F form fields, B buttons, Shift = back).
  useEffect(() => {
    if (!s.keyboard) return;
    const groups: Record<string, string> = {
      h: 'h1, h2, h3, h4, h5, h6',
      k: 'a[href]',
      f: 'input:not([type=hidden]), select, textarea',
      b: 'button, [role=button]',
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable=true], #a11y-ui')) return;
      const sel = groups[e.key.toLowerCase()] ?? groups[{ י: 'h', ל: 'k', כ: 'f', נ: 'b' }[e.key] ?? ''];
      if (!sel) return;
      const list = [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => !el.closest('#a11y-ui') && el.offsetParent !== null);
      if (!list.length) return;
      e.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      let i = active ? list.indexOf(active) : -1;
      if (i === -1 && active) i = list.findIndex((el) => active.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) - (e.shiftKey ? 0 : 1);
      const next = list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length];
      if (!next.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(next.tagName)) next.setAttribute('tabindex', '-1');
      next.focus();
      next.scrollIntoView({ block: 'center', behavior: s.motion ? 'auto' : 'smooth' });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [s.keyboard, s.motion]);

  // --- open with Alt+A (or Alt+ש) from anywhere, or from any [data-a11y-open] link.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.code === 'KeyA' || e.key.toLowerCase() === 'a' || e.key === 'ש')) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('[data-a11y-open]')) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('a11y:open', onOpen);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('a11y:open', onOpen);
      document.removeEventListener('click', onClick);
    };
  }, []);

  // --- dialog behaviour: focus in, Esc, focus trap, focus back to the trigger.
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
      if (e.key === 'Tab' && panel) {
        const f = [...panel.querySelectorAll<HTMLElement>('button, a[href], input, select, [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      (prev && prev !== document.body ? prev : triggerRef.current)?.focus();
    };
  }, [open]);

  // Close the panel on navigation.
  useEffect(() => setOpen(false), [pathname]);

  const applyProfile = (id: ProfileId) => {
    if (s.profile === id) {
      setS((prev) => ({ ...DEFAULTS, side: prev.side, bigUi: prev.bigUi }));
      announce('הפרופיל בוטל');
      return;
    }
    setS((prev) => ({ ...DEFAULTS, side: prev.side, bigUi: prev.bigUi, ...PROFILES[id].settings, profile: id }));
    announce(`הופעל פרופיל: ${PROFILES[id].label}`);
  };

  const reset = () => {
    setS((prev) => ({ ...DEFAULTS, side: prev.side, bigUi: prev.bigUi }));
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    announce('כל הגדרות הנגישות אופסו');
  };

  const readPage = () => {
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    const main = document.getElementById('main') ?? document.body;
    const ok = speak(main.innerText, () => setSpeaking(false));
    if (!ok) announce('הדפדפן אינו תומך בהקראה');
    else setSpeaking(true);
  };

  const headings = useMemo(() => {
    if (view !== 'structure' || typeof document === 'undefined') return [];
    return [...document.querySelectorAll<HTMLElement>('main h1, main h2, main h3, main h4')]
      .filter((h) => h.offsetParent !== null && h.innerText.trim())
      .map((h) => ({ el: h, level: Number(h.tagName[1]), text: h.innerText.trim().replace(/\s+/g, ' ') }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, pathname]);

  const landmarks = useMemo(() => {
    if (view !== 'structure' || typeof document === 'undefined') return [];
    const names: [string, string][] = [
      ['header', 'כותרת עליונה'],
      ['nav', 'תפריט ניווט'],
      ['main', 'תוכן ראשי'],
      ['footer', 'כותרת תחתונה'],
    ];
    return names.flatMap(([sel, label]) => [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => !el.closest('#a11y-ui')).slice(0, 1).map((el) => ({ el, label })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, pathname]);

  const jump = (el: HTMLElement) => {
    setOpen(false);
    window.setTimeout(() => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.scrollIntoView({ block: 'start', behavior: s.motion ? 'auto' : 'smooth' });
      el.focus({ preventScroll: true });
    }, 60);
  };

  if (!mounted) return null;

  const left = s.side === 'left';
  const designer = pathname?.startsWith('/designer');
  const product = pathname?.startsWith('/stamp/');
  const changed = !isDefault(s);
  const big = s.bigUi;

  // Trigger placement: away from the product buy-bar and the editor's own controls.
  const triggerPos = designer
    ? `${left ? 'left-0 rounded-r-2xl' : 'right-0 rounded-l-2xl'} top-[42%] h-12 w-10`
    : `${left ? 'left-3 sm:left-5' : 'right-3 sm:right-5'} ${product ? 'bottom-[88px] lg:bottom-5' : 'bottom-3 sm:bottom-5'} h-14 w-14 rounded-full`;

  return (
    <div id="a11y-ui" dir="rtl" lang="he">
      {/* Page overlays */}
      <div id="a11y-filter" aria-hidden />
      {s.guide && <div ref={guideRef} className="a11y-guide" aria-hidden />}
      {s.mask && (
        <>
          <div ref={maskTopRef} className="a11y-mask" style={{ top: 0 }} aria-hidden />
          <div ref={maskBottomRef} className="a11y-mask" style={{ bottom: 0 }} aria-hidden />
        </>
      )}
      {s.magnifier && <div ref={magRef} className="a11y-mag" style={{ display: 'none' }} aria-hidden />}

      <p className="sr-only" role="status" aria-live="polite">
        {notice}
      </p>

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label="תפריט נגישות (Alt+A)"
        title="תפריט נגישות (Alt+A)"
        className={`fixed z-[2147483600] grid place-items-center bg-[#2457ff] text-white shadow-[0_10px_30px_-8px_rgba(36,87,255,.75)] ring-2 ring-white transition hover:scale-105 hover:bg-[#1a46e0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400] ${triggerPos} ${open ? 'pointer-events-none opacity-0' : ''}`}
      >
        <Svg name="access" size={designer ? 24 : 30} />
        {changed && <span className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#16a34a]" aria-hidden />}
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-[2147483500] bg-[#0b1426]/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />
          <div
            ref={panelRef}
            id="a11y-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-title"
            className={`fixed z-[2147483600] flex flex-col overflow-hidden bg-[#f5f7fb] text-[#0b1426] shadow-[0_30px_80px_-20px_rgba(11,20,38,.55)]
              inset-x-0 bottom-0 max-h-[90dvh] rounded-t-[28px]
              sm:inset-x-auto sm:top-4 sm:bottom-4 sm:max-h-none sm:rounded-[28px] ${left ? 'sm:left-4' : 'sm:right-4'}
              ${big ? 'sm:w-[520px]' : 'sm:w-[430px]'}`}
            style={big ? { fontSize: '1.15em' } : undefined}
          >
            {/* Header */}
            <div className="relative shrink-0 bg-gradient-to-l from-[#2457ff] to-[#1636b8] px-5 pt-3 pb-5 text-white">
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/40 sm:hidden" aria-hidden />
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
                  <Svg name="access" size={30} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="a11y-title" className={`${big ? 'text-2xl' : 'text-xl'} font-extrabold`}>
                    {view === 'main' ? 'תפריט נגישות' : 'מבנה העמוד'}
                  </h2>
                  <p className="mt-0.5 text-[13px] text-white/80">התאימו את האתר לצרכים שלכם · Alt+A</p>
                </div>
                <button
                  type="button"
                  data-autofocus
                  onClick={() => setOpen(false)}
                  aria-label="סגירת תפריט הנגישות"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400]"
                >
                  <Svg name="close" size={22} />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setView(view === 'main' ? 'structure' : 'main')}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[13px] font-bold text-[#1636b8] transition hover:bg-[#eef2ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400]"
                >
                  <Svg name={view === 'main' ? 'tree' : 'access'} size={17} />
                  {view === 'main' ? 'מבנה העמוד' : 'חזרה להגדרות'}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={!changed}
                  className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-bold transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400] disabled:opacity-50"
                >
                  <Svg name="reset" size={17} /> איפוס הכול
                </button>
                <button
                  type="button"
                  onClick={() => update('bigUi', !big)}
                  aria-pressed={big}
                  className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-bold transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400] sm:flex"
                >
                  <Svg name="big" size={17} /> {big ? 'תפריט רגיל' : 'תפריט מוגדל'}
                </button>
                <button
                  type="button"
                  onClick={() => update('side', left ? 'right' : 'left')}
                  className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-bold transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400] sm:flex"
                >
                  <Svg name="swap" size={17} /> {left ? 'הצמד לימין' : 'הצמד לשמאל'}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 [scrollbar-width:thin]">
              {view === 'main' ? (
                <>
                  {/* Profiles */}
                  <section className="mt-5">
                    <h3 className="mb-2.5 px-1 text-[13px] font-bold tracking-wide text-[#5b6678]">פרופילי נגישות – הפעלה בלחיצה</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(PROFILES) as ProfileId[]).map((id) => {
                        const on = s.profile === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => applyProfile(id)}
                            aria-pressed={on}
                            className={`relative flex flex-col gap-1.5 rounded-2xl border-2 p-3 text-start transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400] ${
                              on ? 'border-[#2457ff] bg-[#eef2ff]' : 'border-[#e3e8f2] bg-white hover:border-[#2457ff]/50'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${on ? 'bg-[#2457ff] text-white' : 'bg-[#eef2ff] text-[#2457ff]'}`}>
                                <Svg name={PROFILE_ICON[id]} size={18} />
                              </span>
                              <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-tight">{PROFILES[id].label}</span>
                              {on && (
                                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#2457ff] text-white" aria-hidden>
                                  <Svg name="check" size={13} />
                                </span>
                              )}
                            </span>
                            <span className="text-[12px] leading-snug text-[#5b6678]">{PROFILES[id].description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <Section title="התאמות תוכן וטקסט">
                    <Tile icon="text" label={s.text ? `גודל טקסט ${Math.round(TEXT_SCALES[s.text] * 100)}%` : 'הגדלת טקסט'} active={s.text > 0} levels={TEXT_SCALES.length - 1} level={s.text} onClick={() => step('text', TEXT_SCALES.length - 1)} />
                    <Tile icon="lineHeight" label="גובה שורה" active={s.lineHeight > 0} levels={3} level={s.lineHeight} onClick={() => step('lineHeight', 3)} />
                    <Tile icon="letter" label="ריווח אותיות" active={s.letter > 0} levels={3} level={s.letter} onClick={() => step('letter', 3)} />
                    <Tile icon="word" label="ריווח מילים" active={s.word > 0} levels={2} level={s.word} onClick={() => step('word', 2)} />
                    <Tile icon="font" label={FONT_OPTS.find((o) => o.value === s.font)!.label} active={!!s.font} levels={2} level={s.font === 'readable' ? 1 : s.font === 'dyslexia' ? 2 : 0} onClick={() => update('font', cycle(FONT_OPTS, s.font))} />
                    <Tile icon="align" label={ALIGN_OPTS.find((o) => o.value === s.align)!.label} active={!!s.align} levels={3} level={ALIGN_OPTS.findIndex((o) => o.value === s.align)} onClick={() => update('align', cycle(ALIGN_OPTS, s.align))} />
                    <Tile icon="zoom" label="זכוכית מגדלת לטקסט" active={s.magnifier} onClick={() => toggle('magnifier')} hint="מעבר עם העכבר על טקסט מציג אותו בגדול" />
                    <Tile icon="link" label="הדגשת קישורים" active={s.links} onClick={() => toggle('links')} />
                    <Tile icon="heading" label="הדגשת כותרות" active={s.headings} onClick={() => toggle('headings')} />
                  </Section>

                  <Section title="צבעים וניגודיות">
                    <Tile icon="dark" label="ניגודיות כהה" active={s.contrast === 'dark'} onClick={() => update('contrast', s.contrast === 'dark' ? '' : 'dark')} />
                    <Tile icon="light" label="ניגודיות בהירה" active={s.contrast === 'light'} onClick={() => update('contrast', s.contrast === 'light' ? '' : 'light')} />
                    <Tile icon="contrast" label="ניגודיות גבוהה" active={s.contrast === 'high'} onClick={() => update('contrast', s.contrast === 'high' ? '' : 'high')} />
                    <Tile icon="mono" label="מונוכרום" active={s.filter === 'mono'} onClick={() => update('filter', s.filter === 'mono' ? '' : 'mono')} />
                    <Tile icon="dropHalf" label="רוויה נמוכה" active={s.filter === 'lowsat'} onClick={() => update('filter', s.filter === 'lowsat' ? '' : 'lowsat')} />
                    <Tile icon="drop" label="רוויה גבוהה" active={s.filter === 'highsat'} onClick={() => update('filter', s.filter === 'highsat' ? '' : 'highsat')} />
                    <Tile icon="invert" label="היפוך צבעים" active={s.filter === 'invert'} onClick={() => update('filter', s.filter === 'invert' ? '' : 'invert')} />
                  </Section>

                  <Section title="ניווט, קריאה והתמצאות">
                    <Tile icon="speak" label="הקראת טקסט בלחיצה" active={s.tts} onClick={() => toggle('tts')} hint="לחיצה על פסקה מקריאה אותה בקול" />
                    <Tile icon={speaking ? 'stop' : 'play'} label={speaking ? 'עצירת הקראה' : 'הקראת העמוד'} active={speaking} onClick={readPage} />
                    <Tile icon="keyboard" label="ניווט מקלדת" active={s.keyboard} onClick={() => toggle('keyboard')} hint="H כותרות · K קישורים · F שדות · B כפתורים (Shift אחורה)" />
                    <Tile icon="focus" label="הדגשת פוקוס" active={s.focus} onClick={() => toggle('focus')} />
                    <Tile icon="cursor" label={CURSOR_OPTS.find((o) => o.value === s.cursor)!.label} active={!!s.cursor} levels={2} level={s.cursor === 'dark' ? 1 : s.cursor === 'light' ? 2 : 0} onClick={() => update('cursor', cycle(CURSOR_OPTS, s.cursor))} />
                    <Tile icon="guide" label="סרגל קריאה" active={s.guide} onClick={() => toggle('guide')} />
                    <Tile icon="mask" label="מסכת קריאה" active={s.mask} onClick={() => toggle('mask')} />
                    <Tile icon="pause" label="עצירת אנימציות" active={s.motion} onClick={() => toggle('motion')} />
                    <Tile icon="image" label="הסתרת תמונות" active={s.images} onClick={() => toggle('images')} />
                  </Section>

                  {s.keyboard && (
                    <p className="mt-4 rounded-2xl bg-white p-3 text-[13px] leading-relaxed text-[#36415a] ring-1 ring-[#e3e8f2]">
                      <b>קיצורי מקלדת:</b> <kbd className="rounded bg-[#eef2ff] px-1.5">H</kbd> כותרת הבאה · <kbd className="rounded bg-[#eef2ff] px-1.5">K</kbd> קישור ·{' '}
                      <kbd className="rounded bg-[#eef2ff] px-1.5">F</kbd> שדה טופס · <kbd className="rounded bg-[#eef2ff] px-1.5">B</kbd> כפתור · עם <kbd className="rounded bg-[#eef2ff] px-1.5">Shift</kbd> – אחורה ·{' '}
                      <kbd className="rounded bg-[#eef2ff] px-1.5">Alt+A</kbd> פתיחת התפריט
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-5 space-y-5">
                  <section>
                    <h3 className="mb-2 px-1 text-[13px] font-bold text-[#5b6678]">אזורים בעמוד</h3>
                    <ul className="grid grid-cols-2 gap-2">
                      {landmarks.map((l) => (
                        <li key={l.label}>
                          <button
                            type="button"
                            onClick={() => jump(l.el)}
                            className="w-full rounded-xl bg-white px-3 py-3 text-start text-[14px] font-semibold ring-1 ring-[#e3e8f2] transition hover:ring-[#2457ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400]"
                          >
                            {l.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section>
                    <h3 className="mb-2 px-1 text-[13px] font-bold text-[#5b6678]">כותרות ({headings.length})</h3>
                    <ul className="space-y-1.5">
                      {headings.map((h, i) => (
                        <li key={i} style={{ paddingInlineStart: `${(h.level - 1) * 14}px` }}>
                          <button
                            type="button"
                            onClick={() => jump(h.el)}
                            className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-start text-[14px] ring-1 ring-[#e3e8f2] transition hover:ring-[#2457ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400]"
                          >
                            <span className="shrink-0 rounded-md bg-[#eef2ff] px-1.5 py-0.5 text-[11px] font-bold text-[#2457ff]">H{h.level}</span>
                            <span className="min-w-0 truncate">{h.text}</span>
                          </button>
                        </li>
                      ))}
                      {!headings.length && <li className="rounded-xl bg-white p-4 text-center text-[14px] text-[#5b6678]">אין כותרות בעמוד זה.</li>}
                    </ul>
                  </section>
                </div>
              )}

              {/* Footer links */}
              <div className="mt-6 space-y-2 border-t border-[#e3e8f2] pt-4">
                <Link
                  href="/הצהרת-נגישות/"
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-[14px] font-semibold ring-1 ring-[#e3e8f2] transition hover:ring-[#2457ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400]"
                >
                  <Svg name="info" size={19} /> הצהרת נגישות
                </Link>
                <a
                  href={`mailto:${SITE.email}?subject=${encodeURIComponent('דיווח על בעיית נגישות באתר')}&body=${encodeURIComponent(`כתובת העמוד: ${typeof window !== 'undefined' ? window.location.href : ''}\n\nתיאור הבעיה:\n`)}`}
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-3 text-[14px] font-semibold ring-1 ring-[#e3e8f2] transition hover:ring-[#2457ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd400]"
                >
                  <Svg name="mail" size={19} /> דיווח על בעיית נגישות
                </a>
                <p className="px-1 pt-1 text-[12px] leading-relaxed text-[#5b6678]">
                  ההגדרות נשמרות בדפדפן שלכם ויופעלו בכל ביקור. נתקלתם בקושי? התקשרו{' '}
                  <a href={SITE.phoneHref} className="font-semibold text-[#2457ff] underline">
                    {SITE.phone}
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
