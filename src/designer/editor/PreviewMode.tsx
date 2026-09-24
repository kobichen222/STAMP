'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { toSvgD } from '../geometry';
import type { RenderResult } from '../render';
import { INK_COLORS, type InkColor } from '../types';

type Tab = 'paper' | 'file' | 'product';

export function InkImpression({ render, ink, className, rough = true }: { render: RenderResult; ink: InkColor; className?: string; rough?: boolean }) {
  const pad = 2;
  const id = `ink-${ink}`;
  return (
    <svg viewBox={`${-pad} ${-pad} ${render.width + 2 * pad} ${render.height + 2 * pad}`} className={className} aria-label="טביעת החותמת על נייר">
      <defs>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="2" seed="3" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.55" result="speckle" />
          <feComposite in="SourceGraphic" in2="speckle" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="8" result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="0.12" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g fill={INK_COLORS[ink].hex} filter={rough ? `url(#${id})` : undefined} opacity={0.92}>
        {render.items.map((it, i) =>
          it.kind === 'path' ? (
            <path key={i} d={toSvgD(it.path)} fillRule={it.fillRule} />
          ) : (
            <image key={i} href={it.href} width={1} height={1} preserveAspectRatio="none" transform={`matrix(${it.matrix.join(' ')})`} />
          ),
        )}
      </g>
    </svg>
  );
}

function FileView({ render }: { render: RenderResult }) {
  return (
    <div className="bg-white p-4 shadow-lift">
      <svg viewBox={`0 0 ${render.width} ${render.height}`} className="block max-h-[50vh] w-[min(80vw,640px)]" aria-label="קובץ הייצור">
        {render.shape === 'round' ? (
          <circle cx={render.width / 2} cy={render.height / 2} r={render.width / 2} fill="none" stroke="#2457ff" strokeWidth={0.08} strokeDasharray="0.5 0.4" />
        ) : (
          <rect width={render.width} height={render.height} fill="none" stroke="#2457ff" strokeWidth={0.08} strokeDasharray="0.5 0.4" />
        )}
        <g fill="#000">
          {render.items.map((it, i) =>
            it.kind === 'path' ? <path key={i} d={toSvgD(it.path)} fillRule={it.fillRule} /> : <image key={i} href={it.href} width={1} height={1} preserveAspectRatio="none" transform={`matrix(${it.matrix.join(' ')})`} />,
          )}
        </g>
      </svg>
      <p className="mt-3 text-center text-xs text-muted">
        קובץ ייצור · {render.width}×{render.height} מ״מ · שחור 100% · טקסט מומר לקווים
      </p>
    </div>
  );
}

export function PreviewMode({ render, ink, onInk, productImage, onClose }: { render: RenderResult; ink: InkColor; onInk: (i: InkColor) => void; productImage: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('paper');
  const [run, setRun] = useState(0);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const aspect = render.width / render.height;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#eef1f5]" role="dialog" aria-modal="true" aria-label="תצוגה מקדימה">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
        <div className="flex gap-1 rounded-lg bg-surface p-1">
          {(
            [
              ['paper', 'על נייר'],
              ['file', 'הקובץ עצמו'],
              ['product', 'במוצר'],
            ] as [Tab, string][]
          ).map(([t, l]) => (
            <button key={t} type="button" onClick={() => { setTab(t); setRun((r) => r + 1); }} className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? 'bg-white shadow-soft' : 'text-muted'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          {(Object.keys(INK_COLORS) as InkColor[]).map((k) => (
            <button key={k} type="button" aria-label={`דיו ${INK_COLORS[k].label}`} title={INK_COLORS[k].label} onClick={() => onInk(k)} className={`h-7 w-7 rounded-full border-2 ${ink === k ? 'border-blue' : 'border-white'}`} style={{ background: INK_COLORS[k].hex }} />
          ))}
        </div>
        <button type="button" onClick={onClose} className="btn-outline btn-sm">
          <Icon name="close" size={16} /> חזרה לעריכה
        </button>
      </div>
      <div className="relative grid flex-1 place-items-center overflow-hidden p-6">
        {tab === 'file' && <FileView render={render} />}
        {tab === 'paper' && (
          <div key={run} className="relative grid w-[min(86vw,720px)] place-items-center bg-[#fdfcf8] p-[8%] shadow-lift" style={{ aspectRatio: '1.414 / 1', backgroundImage: 'radial-gradient(rgba(0,0,0,.025) 1px, transparent 1px)', backgroundSize: '4px 4px' }}>
            <div className="w-[58%] animate-[impression_1.4s_ease_forwards] opacity-0" style={{ transform: 'rotate(-2deg)' }}>
              <InkImpression render={render} ink={ink} className="w-full" />
            </div>
            <div className="pointer-events-none absolute top-1/2 left-1/2 w-[46%] -translate-x-1/2 animate-[stamp-press_1.4s_ease_forwards]" aria-hidden>
              <div className="mx-auto h-14 w-2/3 rounded-t-[40px] bg-gradient-to-b from-ink-2 to-ink" />
              <div className="h-16 rounded-md border border-line bg-gradient-to-b from-white to-[#e7ebf1]" />
              <div className="h-2 rounded-b-md bg-blue" />
            </div>
            <button type="button" onClick={() => setRun((r) => r + 1)} className="absolute bottom-3 left-3 flex items-center gap-1 text-xs text-muted hover:text-ink">
              <Icon name="rotate" size={14} /> החתמה נוספת
            </button>
          </div>
        )}
        {tab === 'product' && (
          <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
            <div className="card grid aspect-square place-items-center p-6">
              {productImage ? <img src={encodeURI(productImage)} alt="המוצר" className="max-h-full object-contain mix-blend-multiply" /> : <Icon name="image" size={40} className="text-muted" />}
              <p className="text-xs text-muted">חזית</p>
            </div>
            <div className="card grid aspect-square place-items-center gap-4 p-6">
              <div className="w-4/5 rounded-xl bg-[#c9ccd3] p-3 shadow-inner" style={{ aspectRatio: `${aspect}` }}>
                <svg viewBox={`0 0 ${render.width} ${render.height}`} className="h-full w-full" style={{ transform: 'scaleX(-1)' }} aria-label="תחתית החותמת – פלטת הגומי (במראה)">
                  <g fill="#2b2f37">
                    {render.items.map((it, i) =>
                      it.kind === 'path' ? <path key={i} d={toSvgD(it.path)} fillRule={it.fillRule} /> : <image key={i} href={it.href} width={1} height={1} preserveAspectRatio="none" transform={`matrix(${it.matrix.join(' ')})`} />,
                    )}
                  </g>
                </svg>
              </div>
              <p className="text-xs text-muted">תחתית – פלטת הגומי (במראה, כמו במציאות)</p>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes stamp-press { 0% { transform: translate(-50%, -160%); opacity: 1 } 40% { transform: translate(-50%, -62%) } 52% { transform: translate(-50%, -56%) scaleY(.96) } 70% { transform: translate(-50%, -62%) } 100% { transform: translate(-50%, -190%); opacity: 0 } }
        @keyframes impression { 0%, 45% { opacity: 0 } 60% { opacity: 1 } 100% { opacity: 1 } }
      `}</style>
    </div>
  );
}
