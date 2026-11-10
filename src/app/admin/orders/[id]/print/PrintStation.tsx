'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { withCutLine } from '@/lib/cut-line';
import { logPrint, markInProduction } from '../../../actions';

const PRINTER_KEY = 's2g-printer';
const CUT_KEY = 's2g-cutline';
/** The studio's laser driver (Windows 10 station). */
const DEFAULT_PRINTER = 'Trotec Engraver v9.3.2';

/** Short, readable description of this computer (OS + browser) for the print log. */
function device() {
  const ua = navigator.userAgent;
  const os = /Windows NT 5\.1/.test(ua)
    ? 'Windows XP'
    : /Windows NT 6\.1/.test(ua)
      ? 'Windows 7'
      : /Windows NT 10/.test(ua)
        ? 'Windows 10/11'
        : /Mac OS X/.test(ua)
          ? 'Mac'
          : /Android/.test(ua)
            ? 'Android'
            : /iPhone|iPad/.test(ua)
              ? 'iOS'
              : 'מחשב';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'דפדפן';
  return `${os} · ${br}`;
}

export function PrintStation(p: {
  orderId: string;
  index: number;
  items: { index: number; label: string }[];
  mirror: boolean;
  svg: string;
  size: string;
  /** Plate size in mm – the printed page is exactly this size (the Trotec job size). */
  mm: { w: number; h: number };
  shape: 'rect' | 'round';
  quantity: number;
  canStart: boolean;
  omittedImages: number;
}) {
  const router = useRouter();
  const [printer, setPrinter] = useState('');
  const [printed, setPrinted] = useState(false);
  const [cut, setCut] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      setPrinter(localStorage.getItem(PRINTER_KEY) || DEFAULT_PRINTER);
      setCut(localStorage.getItem(CUT_KEY) !== '0');
    } catch {
      setPrinter(DEFAULT_PRINTER);
    }
  }, []);

  const go = (q: { item?: number; mirror?: boolean }) =>
    router.replace(`/admin/orders/${p.orderId}/print/?item=${q.item ?? p.index}&mirror=${(q.mirror ?? p.mirror) ? 1 : 0}`, { scroll: false });

  const print = () => {
    try {
      localStorage.setItem(PRINTER_KEY, printer.trim());
    } catch {
      /* ignore */
    }
    // Open the print dialog straight from the click – browsers (iPhone, Safari, some Chrome setups)
    // block it if it comes after waiting for the server. The log is written in the background.
    setPrinted(true);
    window.print();
    logPrint(p.orderId, { index: p.index, printer, mirror: p.mirror, size: p.size, device: device() })
      .then(() => router.refresh())
      .catch(() => {});
  };

  return (
    <>
      <style>{`
        #print-root { display: none }
        @media print {
          @page { size: ${p.mm.w}mm ${p.mm.h}mm; margin: 0 }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; height: auto !important; overflow: visible !important }
          body > *:not(#print-root) { display: none !important }
          #print-root { display: block !important; position: static; margin: 0; padding: 0; width: ${p.mm.w}mm; height: ${p.mm.h}mm; overflow: hidden; break-after: avoid; page-break-after: avoid }
          #print-root svg { display: block; width: ${p.mm.w}mm; height: ${p.mm.h}mm }
        }
      `}</style>
      {/* What actually goes to the printer: the plate at its true size in millimetres. */}
      {mounted && createPortal(<div id="print-root" dangerouslySetInnerHTML={{ __html: cut ? withCutLine(p.svg, p.shape, p.mm.w, p.mm.h) : p.svg }} />, document.body)}

      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <section className="card p-4 sm:p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">תצוגה מקדימה</span>
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs tabular-nums">
              {p.size} · {p.mirror ? 'מראה' : 'רגיל'}
            </span>
          </div>
          <div className="mt-3 grid min-h-48 place-items-center rounded-xl border border-dashed border-line bg-white p-4 [&_svg]:h-auto [&_svg]:max-h-80 [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: cut ? withCutLine(p.svg, p.shape, p.mm.w, p.mm.h) : p.svg }} />
          {p.omittedImages > 0 && <p className="mt-2 text-xs text-warn">יש בעיצוב לוגו כתמונה – בדקו שהוא מופיע בתצוגה לפני ההדפסה.</p>}
        </section>

        <section className="card space-y-4 p-4 sm:p-5">
          {p.items.length > 1 && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">פריט בהזמנה</span>
              <select value={p.index} onChange={(e) => go({ item: Number(e.target.value) })} className="input">
                {p.items.map((x) => (
                  <option key={x.index} value={x.index}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={p.mirror} onChange={(e) => go({ mirror: e.target.checked })} className="h-4 w-4 accent-[#2457ff]" />
            הדפסה במראה
          </label>
          <label className="flex items-start gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={cut}
              onChange={(e) => {
                setCut(e.target.checked);
                try {
                  localStorage.setItem(CUT_KEY, e.target.checked ? '1' : '0');
                } catch {
                  /* ignore */
                }
              }}
              className="mt-0.5 h-4 w-4 accent-[#2457ff]"
            />
            <span>
              קו חיתוך בגודל החותמת
              <span className="block text-xs font-normal text-muted">קו אדום דק (0.01 מ״מ) שה־Trotec חותך – בדיוק {p.size}</span>
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">שם המדפסת / המכונה</span>
            <input value={printer} onChange={(e) => setPrinter(e.target.value)} placeholder="Trotec Engraver v9.3.2" className="input" />
            <span className="mt-1 block text-xs text-muted">נשמר במחשב הזה ונרשם ביומן עם כל הדפסה.</span>
          </label>
          <button type="button" onClick={print} className="btn-primary w-full">
            {`הדפסה (${p.quantity > 1 ? `${p.quantity} עותקים` : 'עותק אחד'})`}
          </button>
          <a
            href={`/api/admin/export/?order=${encodeURIComponent(p.orderId)}&item=${p.index}&format=pdf&mirror=${p.mirror ? 1 : 0}&cut=${cut ? 1 : 0}`}
            onClick={() => logPrint(p.orderId, { index: p.index, printer: printer || 'PDF', mirror: p.mirror, size: p.size, device: `${device()} · הורדת PDF` }).catch(() => {})}
            className="btn-outline btn-sm w-full"
          >
            לא נפתח חלון הדפסה? הורדת PDF להדפסה
          </a>
          {printed && p.canStart && (
            <button
              type="button"
              className="btn-dark w-full"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await markInProduction(p.orderId);
                  router.push(`/admin/orders/${p.orderId}/`);
                })
              }
            >
              הודפס – העבר ל״בייצור״
            </button>
          )}
          <ul className="space-y-1 rounded-xl bg-surface p-3 text-xs leading-5 text-ink-2">
            <li>
              • בחלון ההדפסה בוחרים <strong dir="ltr">Trotec Engraver</strong> – העבודה נכנסת ל־JobControl.
            </li>
            <li>• קנה מידה: 100% / ״גודל אמיתי״, בלי ״התאמה לדף״.</li>
            <li>• שוליים: ללא. כותרות עליונות ותחתונות: כבוי.</li>
            <li>
              • בהעדפות Trotec: לסמן <strong dir="ltr">Size Optimization</strong> ולבחור תבנית חומר שבה אדום = חיתוך ושחור = חריטה.
            </li>
            <li>• מראה והיפוך לחותמת אפשר לסמן כאן או בהגדרות הדרייבר של Trotec – רק באחד מהם, כדי שלא יתהפך פעמיים.</li>
            {p.quantity > 1 && <li>• מספר עותקים: {p.quantity}.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
