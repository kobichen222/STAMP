'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { composeLayout, newShape, newText, restackLines, uid } from '../compose';
import { FONT_FAMILIES } from '../fonts';
import { ICONS } from '../icons';
import { DEFAULT_PROCESS, LogoError, loadLogoFile, logoQualityFromPixels, processLogo, vectorize, type LoadedLogo, type ProcessOptions } from '../logo';
import { renderDesign } from '../render';
import { StampSvg } from '../StampSvg';
import { TEMPLATE_CATEGORIES, TEMPLATES, type StampTemplate } from '../templates';
import type { BorderStyle, Design, ImageElement, ShapeElement, TextElement } from '../types';
import { PT_TO_MM } from '../types';
import { IconButton, IconToggle, Section, Segmented, Slider, Field } from './controls';
import { useEditor } from './context';

// ------------------------------------------------------------------ templates

function TemplateThumb({ t }: { t: StampTemplate }) {
  const { model, resolveFace } = useEditor();
  const r = useMemo(() => {
    try {
      return renderDesign(composeLayout(model, t.content, t.style), resolveFace);
    } catch {
      return null;
    }
  }, [model, t, resolveFace]);
  return r ? <StampSvg render={r} className="h-full w-full" pad={1} /> : <div className="h-full w-full animate-pulse bg-line/50" />;
}

export function TemplatesPanel() {
  const { model, design, actions, toast } = useEditor();
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const list = TEMPLATES.filter((t) => (cat === 'all' || t.category === cat) && (!q || `${t.name} ${t.content.lines.join(' ')} ${t.content.arcTop ?? ''}`.includes(q))).sort(
    (a, b) => Number((b.shape ?? model.shape) === model.shape) - Number((a.shape ?? model.shape) === model.shape),
  );

  const apply = (t: StampTemplate) => {
    const logo = design.elements.find((e): e is ImageElement => e.type === 'image') ?? null;
    const next = composeLayout(model, { ...t.content, logo: t.withLogo ? logo : null }, t.style);
    actions.set({
      ...next,
      inkColor: design.inkColor,
      modelId: design.modelId,
    });
    toast(t.withLogo && !logo ? 'התבנית הוחלה – העלו לוגו בלשונית "לוגו"' : 'התבנית הוחלה · אפשר לבטל עם Undo');
  };

  return (
    <>
      <Section>
        <label className="relative block">
          <Icon name="search" size={16} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש תבנית" className="input !py-2 !pr-9 text-sm" aria-label="חיפוש תבנית" />
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button type="button" className={`chip !px-2.5 !py-1 !text-xs ${cat === 'all' ? 'chip-on' : ''}`} onClick={() => setCat('all')}>
            הכול
          </button>
          {TEMPLATE_CATEGORIES.map((c) => (
            <button key={c.id} type="button" className={`chip !px-2.5 !py-1 !text-xs ${cat === c.id ? 'chip-on' : ''}`} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </Section>
      <div className="grid grid-cols-2 gap-2.5 p-4 pt-0">
        {list.map((t) => (
          <button key={t.id} type="button" onClick={() => apply(t)} className="group rounded-xl border border-line bg-white p-2 text-right transition hover:border-blue hover:shadow-soft">
            <div className="grid aspect-[4/3] place-items-center rounded-lg bg-surface p-1.5">
              <TemplateThumb t={t} />
            </div>
            <span className="mt-1.5 block truncate text-xs font-medium">{t.name}</span>
            <span className="text-[11px] text-blue opacity-0 transition group-hover:opacity-100">החל תבנית</span>
          </button>
        ))}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ text

const NEW_TEXT_FIRST = 'השם שלכם כאן';
const NEW_TEXT_MORE = 'טקסט נוסף';

function LinesEditor() {
  const { design, actions, selection, focusTextId, setFocusTextId, profile, render } = useEditor();
  const refs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const texts = design.elements
    .filter((e): e is TextElement => e.type === 'text')
    .sort((a, b) => (a.curve?.position === 'top' ? -1 : b.curve?.position === 'top' ? 1 : a.curve?.position === 'bottom' ? 1 : b.curve?.position === 'bottom' ? -1 : a.y - b.y));

  useEffect(() => {
    if (!focusTextId) return;
    const el = refs.current[focusTextId];
    if (el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      // Placeholder copy is selected so typing simply replaces it.
      if (el.value === NEW_TEXT_FIRST || el.value === NEW_TEXT_MORE) el.select();
      else el.setSelectionRange?.(el.value.length, el.value.length);
    }
    setFocusTextId(null);
  }, [focusTextId, setFocusTextId]);

  const addText = () => {
    const last = texts.filter((t) => !t.curve).at(-1);
    // Only pass what we inherit – undefined keys would wipe newText's defaults.
    const el = newText(
      design,
      last ? NEW_TEXT_MORE : NEW_TEXT_FIRST,
      last
        ? { font: last.font, size: Math.max(profile.minFontPt + 1, Math.round(last.size * 0.9)), align: last.align, x: last.x, y: last.y + 1, maxWidth: last.maxWidth }
        : { y: design.height / 2, bold: true, size: Math.max(profile.minFontPt + 2, Math.min(18, Math.round((Math.min(design.height, design.width) * 0.28) / PT_TO_MM))) },
    );
    actions.set(restackLines({ ...design, elements: [...design.elements, el] }));
    actions.select([el.id]);
    setFocusTextId(el.id);
  };
  const removeText = (id: string) => actions.set(restackLines({ ...design, elements: design.elements.filter((e) => e.id !== id) }));

  return (
    <>
      <Section>
        <button type="button" className="btn-primary w-full" onClick={addText}>
          <Icon name="plus" size={18} /> הוסף טקסט
        </button>
      </Section>
      {texts.length > 0 && (
        <Section title="הטקסט על החותמת">
          <ul className="space-y-2">
            {texts.map((t, i) => {
              const on = selection.includes(t.id);
              const eff = render?.info[t.id]?.effectiveSize;
              const small = eff != null && eff < profile.minFontPt;
              const common = {
                ref: (el: HTMLInputElement | HTMLTextAreaElement | null) => {
                  refs.current[t.id] = el;
                },
                dir: 'auto' as const,
                value: t.text,
                placeholder: 'כתבו כאן…',
                'aria-label': `טקסט ${i + 1}`,
                onFocus: () => {
                  actions.select([t.id]);
                  actions.begin();
                },
                onBlur: actions.commit,
                onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => actions.patch(t.id, { text: e.target.value }),
                className: 'min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base leading-6 outline-none',
              };
              return (
                <li key={t.id} className={`rounded-xl border transition ${on ? 'border-blue bg-blue-50/40 ring-2 ring-blue/10' : 'border-line bg-white'}`}>
                  <div className="flex items-center">
                    {t.text.includes('\n') ? <textarea {...common} rows={t.text.split('\n').length} /> : <input {...common} enterKeyHint="done" />}
                    <button
                      type="button"
                      aria-label="מחיקת הטקסט"
                      onClick={() => removeText(t.id)}
                      disabled={t.locked}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:text-bad disabled:opacity-30"
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                  {(t.curve || small) && (
                    <p className={`px-3 pb-1.5 text-[11px] ${small ? 'text-bad' : 'text-muted'}`}>
                      {t.curve ? (t.curve.position === 'top' ? 'בקשת העליונה' : 'בקשת התחתונה') : ''}
                      {t.curve && small ? ' · ' : ''}
                      {small ? 'קטן מדי לייצור – הגדילו או קצרו' : ''}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </>
  );
}

export function TextPanel() {
  const { design, selected, actions, advanced, render, profile } = useEditor();
  const text = selected.length === 1 && selected[0].type === 'text' ? (selected[0] as TextElement) : null;
  const up = (p: Partial<TextElement>, history = true) => text && actions.patch(text.id, p, history);
  const eff = text ? render?.info[text.id]?.effectiveSize : undefined;

  return (
    <>
      <LinesEditor />
      {!text ? (
        <p className="px-4 pb-6 text-center text-sm text-muted">{design.elements.some((e) => e.type === 'text') ? 'הקישו על טקסט כדי לשנות גודל, גופן ויישור.' : 'לחצו ״הוסף טקסט״ והקלידו – הטקסט יופיע מיד על החותמת.'}</p>
      ) : (
        <>
          <Section title="עיצוב הטקסט הנבחר">
            <select
              value={text.font}
              onChange={(e) => up({ font: e.target.value })}
              className="input !py-2"
              aria-label="גופן"
              style={{
                fontFamily: FONT_FAMILIES.find((f) => f.id === text.font)?.css,
              }}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.id} value={f.id} style={{ fontFamily: f.css }}>
                  {f.label}
                </option>
              ))}
            </select>
            <div className="mt-3">
              <Slider label="גודל" unit="pt" min={4} max={36} step={0.5} value={text.size} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => up({ size: v })} />
              {eff != null && eff < text.size - 0.05 && <p className="mt-1 text-xs text-muted">הוקטן אוטומטית ל־{eff.toFixed(1)}pt כדי להיכנס ברוחב</p>}
              {eff != null && eff < profile.minFontPt && <p className="mt-1 text-xs text-bad">מתחת למינימום לייצור ({profile.minFontPt}pt)</p>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <IconToggle icon="bold" label="מודגש" on={text.bold} onClick={() => up({ bold: !text.bold })} />
              <IconToggle icon="italic" label="נטוי" on={!!text.italic} onClick={() => up({ italic: !text.italic })} />
              <IconToggle icon="underline" label="קו תחתון" on={!!text.underline} onClick={() => up({ underline: !text.underline })} />
              <span className="mx-1 h-6 w-px bg-line" />
              <Segmented
                label="יישור"
                value={text.align}
                onChange={(v) => up({ align: v })}
                options={[
                  { value: 'right', icon: 'alignRight', title: 'ימין' },
                  { value: 'center', icon: 'alignCenter', title: 'מרכז' },
                  { value: 'left', icon: 'alignLeft', title: 'שמאל' },
                ]}
              />
            </div>
          </Section>
          {design.shape === 'round' && (
            <Section title="טקסט מעגלי">
              <Segmented
                label="מיקום"
                value={text.curve ? text.curve.position : 'none'}
                onChange={(v) =>
                  up(
                    v === 'none'
                      ? {
                          curve: null,
                          x: design.width / 2,
                          y: design.height / 2,
                        }
                      : {
                          curve: {
                            radius: text.curve?.radius ?? design.width / 2 - 4,
                            position: v,
                          },
                          x: design.width / 2,
                          y: design.height / 2,
                          maxWidth: 0,
                        },
                  )
                }
                options={[
                  { value: 'none', label: 'ישר' },
                  { value: 'top', label: 'קשת עליונה' },
                  { value: 'bottom', label: 'קשת תחתונה' },
                ]}
              />
              {text.curve && (
                <div className="mt-3">
                  <Slider
                    label="רדיוס"
                    unit="מ״מ"
                    min={3}
                    max={design.width / 2}
                    step={0.1}
                    value={text.curve.radius}
                    onStart={actions.begin}
                    onEnd={actions.commit}
                    onChange={(v) => up({ curve: { ...text.curve!, radius: v } })}
                  />
                </div>
              )}
            </Section>
          )}
          {advanced && (
            <>
              <Section title="ריווח">
                <div className="space-y-3">
                  <Slider label="ריווח אותיות" min={-100} max={400} step={10} value={text.letterSpacing} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => up({ letterSpacing: v })} />
                  <Slider label="ריווח שורות" min={0.8} max={2.5} step={0.05} value={text.lineHeight} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => up({ lineHeight: v })} />
                  {!text.curve && (
                    <Slider
                      label="רוחב אזור הטקסט"
                      unit="מ״מ"
                      min={0}
                      max={design.width}
                      step={0.5}
                      value={text.maxWidth}
                      onStart={actions.begin}
                      onEnd={actions.commit}
                      onChange={(v) => up({ maxWidth: v })}
                    />
                  )}
                </div>
              </Section>
              <PositionSection />
            </>
          )}
        </>
      )}
    </>
  );
}

/** Mobile "Elements" tab: icons, shapes and frames in one place. */
export function ElementsPanel() {
  return (
    <>
      <FramesPanel />
      <IconsPanel />
      <ShapesPanel />
    </>
  );
}

export function PositionSection() {
  const { selected, actions, design } = useEditor();
  const el = selected.length === 1 ? selected[0] : null;
  if (!el) return null;
  return (
    <Section title="מיקום וסיבוב">
      <div className="grid grid-cols-2 gap-3">
        <Field label="X (מ״מ)">
          <input type="number" step={0.1} value={Math.round(el.x * 100) / 100} onChange={(e) => actions.patch(el.id, { x: +e.target.value })} className="input !py-1.5 text-sm" />
        </Field>
        <Field label="Y (מ״מ)">
          <input type="number" step={0.1} value={Math.round(el.y * 100) / 100} onChange={(e) => actions.patch(el.id, { y: +e.target.value })} className="input !py-1.5 text-sm" />
        </Field>
      </div>
      <div className="mt-3">
        <Slider label="סיבוב" unit="°" min={0} max={360} value={el.rotation} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => actions.patch(el.id, { rotation: v % 360 })} />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-outline btn-sm flex-1" onClick={() => actions.patch(el.id, { x: design.width / 2 })}>
          מרכז אופקי
        </button>
        <button type="button" className="btn-outline btn-sm flex-1" onClick={() => actions.patch(el.id, { y: design.height / 2 })}>
          מרכז אנכי
        </button>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ logo

const QUALITY = {
  excellent: { label: 'איכות מעולה', cls: 'bg-ok/10 text-ok' },
  good: { label: 'איכות סבירה', cls: 'bg-warn/10 text-warn' },
  low: { label: 'איכות נמוכה', cls: 'bg-bad/10 text-bad' },
};

export function LogoPanel({ readyFile = false }: { readyFile?: boolean }) {
  const { design, actions, selected, advanced, toast } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<LoadedLogo | null>(null);
  const [opts, setOpts] = useState<ProcessOptions>(DEFAULT_PROCESS);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [useVector, setUseVector] = useState(true);
  const [traced, setTraced] = useState<{ d: string; aspect: number } | null>(null);
  const processed = useMemo(() => (loaded ? processLogo(loaded.bitmap, opts) : null), [loaded, opts]);
  const current = selected.length === 1 && selected[0].type === 'image' ? (selected[0] as ImageElement) : null;

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setError('');
    setBusy('טוען קובץ…');
    setTraced(null);
    try {
      const l = await loadLogoFile(file);
      setLoaded(l);
      setUseVector(true);
      if (l.mime === 'application/pdf') {
        setBusy('ממיר לקווים…');
        const v = await vectorize(processLogo(l.bitmap, DEFAULT_PROCESS).canvas, 'high');
        setTraced(v);
      }
    } catch (e) {
      setError(e instanceof LogoError ? e.message : 'לא הצלחנו לקרוא את הקובץ');
    } finally {
      setBusy(null);
    }
  };

  const doTrace = async (detail: 'low' | 'medium' | 'high' = 'medium') => {
    if (!processed) return;
    setBusy('ממיר לקווים…');
    try {
      setTraced(await vectorize(processed.canvas, detail));
      setUseVector(true);
    } finally {
      setBusy(null);
    }
  };

  const autoImprove = () => {
    setOpts({ ...DEFAULT_PROCESS, contrast: 45, threshold: 140 });
    void doTrace('high');
  };

  const place = () => {
    if (!loaded || !processed) return;
    const vector = useVector ? (loaded.vector ?? traced) : null;
    const aspect = vector ? vector.aspect : processed.height / processed.width;
    const maxW = readyFile ? design.width - 2 : design.width * (design.shape === 'round' ? 0.5 : 0.35);
    const maxH = readyFile ? design.height - 2 : design.height * (design.shape === 'round' ? 0.5 : 0.8);
    let w = maxW;
    if (w * aspect > maxH) w = maxH / aspect;
    const el: ImageElement = {
      id: uid('img'),
      type: 'image',
      x: readyFile ? design.width / 2 : design.shape === 'round' ? design.width / 2 : design.width - 1.5 - w / 2,
      y: design.height / 2,
      rotation: 0,
      width: Math.round(w * 100) / 100,
      height: Math.round(w * aspect * 100) / 100,
      src: processed.dataUrl,
      vector: vector?.d ?? null,
      source: {
        name: loaded.name,
        mime: loaded.mime,
        pxWidth: loaded.pxWidth,
        pxHeight: loaded.pxHeight,
        isVector: loaded.isVector,
      },
    };
    if (current)
      actions.patch(current.id, {
        ...el,
        id: current.id,
        x: current.x,
        y: current.y,
      } as Partial<ImageElement>);
    else actions.add(el);
    toast(vector ? 'הלוגו נוסף כקווים וקטוריים' : 'הלוגו נוסף');
    setLoaded(null);
    setTraced(null);
  };

  const q = loaded ? logoQualityFromPixels(loaded.pxWidth, design.width * 0.35, loaded.isVector || !!traced) : null;

  return (
    <>
      <Section>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void onFile(e.dataTransfer.files[0]);
          }}
          className={`grid place-items-center rounded-xl border-2 border-dashed p-6 text-center transition ${drag ? 'border-blue bg-blue-50' : 'border-line'}`}
        >
          <Icon name="upload" size={26} className="text-blue" />
          <p className="mt-2 text-sm font-medium">{readyFile ? 'העלו קובץ חותמת מוכן' : 'גררו לוגו לכאן'}</p>
          <p className="mt-1 text-xs text-muted">PNG · JPG · SVG · PDF · עד 10MB</p>
          <button type="button" className="btn-outline btn-sm mt-3" onClick={() => inputRef.current?.click()}>
            {readyFile ? 'בחירת קובץ' : 'העלה לוגו'}
          </button>
          <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.svg,.pdf,.webp,.gif,image/*,application/pdf" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        {busy && <p className="mt-3 animate-pulse text-center text-sm text-muted">{busy}</p>}
        {error && (
          <p className="mt-3 text-sm text-bad" role="alert">
            {error}
          </p>
        )}
      </Section>

      {loaded && processed && (
        <>
          <Section title="לפני / אחרי">
            <div className="grid grid-cols-2 gap-2">
              <figure className="rounded-lg border border-line bg-white p-2">
                <img src={loaded.bitmap.toDataURL('image/png')} alt="מקור" className="mx-auto max-h-28 object-contain" />
                <figcaption className="mt-1 text-center text-[11px] text-muted">מקור</figcaption>
              </figure>
              <figure className="rounded-lg border border-line bg-[linear-gradient(45deg,#f1f3f7_25%,transparent_25%,transparent_75%,#f1f3f7_75%),linear-gradient(45deg,#f1f3f7_25%,#fff_25%,#fff_75%,#f1f3f7_75%)] bg-[length:12px_12px] bg-[position:0_0,6px_6px] p-2">
                {(loaded.vector ?? traced) && useVector ? (
                  <svg viewBox={`0 0 1 ${(loaded.vector ?? traced)!.aspect}`} className="mx-auto max-h-28 w-full">
                    <path d={(loaded.vector ?? traced)!.d} fillRule="evenodd" />
                  </svg>
                ) : (
                  <img src={processed.dataUrl} alt="אחרי עיבוד" className="mx-auto max-h-28 object-contain" />
                )}
                <figcaption className="mt-1 text-center text-[11px] text-muted">{(loaded.vector ?? traced) && useVector ? 'וקטור' : 'לחותמת'}</figcaption>
              </figure>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
              <dt className="text-muted">רזולוציה</dt>
              <dd>{loaded.isVector ? 'וקטורי' : `${loaded.pxWidth}×${loaded.pxHeight}px`}</dd>
              <dt className="text-muted">מידות בחותמת</dt>
              <dd>
                ~{Math.round(design.width * 0.35)} מ״מ · {q?.dpi} DPI
              </dd>
            </dl>
            {q && (
              <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${QUALITY[q.level].cls}`}>
                {QUALITY[q.level].label}
                {q.level === 'low' && <p className="mt-1 text-xs font-normal">איכות הקובץ נמוכה ועלולה לגרום לתוצאה פחות חדה.</p>}
              </div>
            )}
            {q?.level === 'low' && (
              <button type="button" className="btn-outline btn-sm mt-2 w-full" onClick={autoImprove}>
                <Icon name="wand" size={16} /> נסה שיפור אוטומטי
              </button>
            )}
          </Section>
          {!loaded.vector && (
            <Section title="עיבוד">
              <div className="space-y-3">
                <label className="flex items-center justify-between text-[13px]">
                  הסרת רקע
                  <input type="checkbox" className="h-4 w-4 accent-blue" checked={opts.removeBackground} onChange={(e) => setOpts({ ...opts, removeBackground: e.target.checked })} />
                </label>
                <label className="flex items-center justify-between text-[13px]">
                  היפוך (Invert)
                  <input type="checkbox" className="h-4 w-4 accent-blue" checked={opts.invert} onChange={(e) => setOpts({ ...opts, invert: e.target.checked })} />
                </label>
                <label className="flex items-center justify-between text-[13px]">
                  חיתוך שוליים (Crop)
                  <input type="checkbox" className="h-4 w-4 accent-blue" checked={opts.crop} onChange={(e) => setOpts({ ...opts, crop: e.target.checked })} />
                </label>
                <Slider
                  label="סף שחור־לבן (Threshold)"
                  min={20}
                  max={240}
                  value={opts.threshold}
                  onChange={(v) => {
                    setOpts({ ...opts, threshold: v });
                    setTraced(null);
                  }}
                />
                <Slider
                  label="ניגודיות"
                  min={-50}
                  max={90}
                  value={opts.contrast}
                  onChange={(v) => {
                    setOpts({ ...opts, contrast: v });
                    setTraced(null);
                  }}
                />
                <button type="button" className="btn-outline btn-sm w-full" onClick={() => void doTrace(advanced ? 'high' : 'medium')} disabled={!!busy}>
                  <Icon name="wand" size={16} /> המרה לקווים (Vectorize)
                </button>
                {traced && (
                  <label className="flex items-center justify-between text-[13px]">
                    שימוש בגרסה הווקטורית
                    <input type="checkbox" className="h-4 w-4 accent-blue" checked={useVector} onChange={(e) => setUseVector(e.target.checked)} />
                  </label>
                )}
              </div>
            </Section>
          )}
          <Section>
            <button type="button" className="btn-primary w-full" onClick={place}>
              {current ? 'החלפת הלוגו' : readyFile ? 'הכנס לחותמת' : 'הוסף לחותמת'}
            </button>
          </Section>
        </>
      )}
      {current && !loaded && (
        <>
          <Section title="לוגו נבחר">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-lg border border-line bg-white p-1">
                {current.vector ? (
                  <svg viewBox={`0 0 1 ${current.height / current.width}`} className="h-full w-full">
                    <path d={current.vector} fillRule="evenodd" />
                  </svg>
                ) : (
                  <img src={current.src} alt="" className="max-h-full" />
                )}
              </div>
              <div className="text-xs">
                <p className="font-medium">{current.source.name}</p>
                <p className="text-muted">
                  {current.width.toFixed(1)}×{current.height.toFixed(1)} מ״מ · {current.vector ? 'וקטורי' : 'מפת סיביות'}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Slider
                label="גודל"
                unit="מ״מ"
                min={2}
                max={design.width}
                step={0.1}
                value={current.width}
                onStart={actions.begin}
                onEnd={actions.commit}
                onChange={(v) =>
                  actions.patch(current.id, {
                    width: v,
                    height: (v * current.height) / current.width,
                  })
                }
              />
            </div>
          </Section>
          {advanced && <PositionSection />}
        </>
      )}
    </>
  );
}

// ------------------------------------------------------------------ icons

const ICON_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'יצירת קשר', ids: ['phone', 'mail', 'web', 'place'] },
  { label: 'רפואה ומשפט', ids: ['medical', 'check'] },
  { label: 'עיטורים', ids: ['heart', 'star-david'] },
];

export function IconsPanel() {
  const { design, actions } = useEditor();
  const [q, setQ] = useState('');
  const add = (icon: string) => {
    const s = Math.min(design.height * 0.3, 5);
    actions.add(newShape(design, 'icon', { icon, width: s, height: s }));
  };
  const addText = (text: string) => actions.add(newText(design, text, { size: 12, maxWidth: 0 }));
  return (
    <>
      <Section>
        <label className="relative block">
          <Icon name="search" size={16} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חפש אייקון" className="input !py-2 !pr-9 text-sm" />
        </label>
      </Section>
      {ICON_GROUPS.map((g) => {
        const items = g.ids.map((id) => ICONS.find((i) => i.id === id)!).filter((i) => !q || i.label.includes(q) || g.label.includes(q));
        if (!items.length) return null;
        return (
          <Section key={g.label} title={g.label}>
            <div className="grid grid-cols-4 gap-2">
              {items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => add(i.id)}
                  className="grid aspect-square place-items-center rounded-lg border border-line bg-white transition hover:border-blue hover:bg-blue-50"
                  aria-label={`הוסף אייקון ${i.label}`}
                  title={i.label}
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6">
                    <path d={i.d} fillRule="evenodd" />
                  </svg>
                </button>
              ))}
            </div>
          </Section>
        );
      })}
      <Section title="סמלים">
        <div className="grid grid-cols-4 gap-2">
          {['₪', '★', '©', '®', '✓', '•', '№', '&'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addText(s)}
              className="grid aspect-square place-items-center rounded-lg border border-line bg-white text-lg transition hover:border-blue hover:bg-blue-50"
              aria-label={`הוסף סימן ${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>
      <Section title="שדות מוכנים">
        <div className="flex flex-wrap gap-2">
          {['טל׳ ', 'ח.פ. ', 'ע.מ. ', 'מ.ר. ', 'www.', 'חתימה: __________'].map((s) => (
            <button key={s} type="button" className="chip !text-xs" onClick={() => addText(s)}>
              {s.trim()}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ shapes

export function ShapesPanel() {
  const { design, actions, selected } = useEditor();
  const shape = selected.length === 1 && selected[0].type === 'shape' ? (selected[0] as ShapeElement) : null;
  const items: {
    kind: ShapeElement['kind'];
    icon: string;
    label: string;
    over?: Partial<ShapeElement>;
  }[] = [
    { kind: 'line', icon: 'line', label: 'קו' },
    {
      kind: 'line',
      icon: 'minus',
      label: 'מפריד',
      over: { width: design.width * 0.4, stroke: 0.3 },
    },
    { kind: 'rect', icon: 'square', label: 'מלבן' },
    { kind: 'ellipse', icon: 'circle', label: 'עיגול' },
    {
      kind: 'ellipse',
      icon: 'ellipse',
      label: 'אליפסה',
      over: {
        width: Math.min(design.width * 0.5, 20),
        height: Math.min(design.height * 0.4, 10),
      },
    },
    { kind: 'star', icon: 'star', label: 'כוכב' },
  ];
  const up = (p: Partial<ShapeElement>, h = true) => shape && actions.patch(shape.id, p, h);
  return (
    <>
      <Section title="צורות">
        <div className="grid grid-cols-3 gap-2">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => actions.add(newShape(design, it.kind, it.over))}
              className="flex flex-col items-center gap-1 rounded-lg border border-line bg-white py-3 text-xs transition hover:border-blue hover:bg-blue-50"
            >
              <Icon name={it.icon} size={22} />
              {it.label}
            </button>
          ))}
        </div>
      </Section>
      {shape && shape.kind !== 'icon' && (
        <Section title="מאפיינים">
          <div className="space-y-3">
            {shape.kind !== 'line' && shape.kind !== 'star' && (
              <label className="flex items-center justify-between text-[13px]">
                מילוי
                <input type="checkbox" className="h-4 w-4 accent-blue" checked={shape.filled} onChange={(e) => up({ filled: e.target.checked })} />
              </label>
            )}
            {!shape.filled && (
              <Slider label="עובי קו" unit="מ״מ" min={0.1} max={2} step={0.05} value={shape.stroke} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => up({ stroke: v })} />
            )}
            <Slider label="רוחב" unit="מ״מ" min={0.5} max={design.width} step={0.1} value={shape.width} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => up({ width: v })} />
            {shape.kind !== 'line' && (
              <Slider label="גובה" unit="מ״מ" min={0.5} max={design.height} step={0.1} value={shape.height} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => up({ height: v })} />
            )}
            {shape.kind === 'rect' && (
              <Slider label="פינות מעוגלות" unit="מ״מ" min={0} max={5} step={0.1} value={shape.radius ?? 0} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => up({ radius: v })} />
            )}
            <Slider label="סיבוב" unit="°" min={0} max={360} value={shape.rotation} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => up({ rotation: v })} />
          </div>
        </Section>
      )}
      {shape?.kind === 'icon' && (
        <Section title="אייקון">
          <Slider label="גודל" unit="מ״מ" min={1} max={design.height} step={0.1} value={shape.width} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => up({ width: v, height: v })} />
        </Section>
      )}
    </>
  );
}

// ------------------------------------------------------------------ frames

const FRAMES: {
  style: BorderStyle;
  label: string;
  round?: boolean;
  rect?: boolean;
}[] = [
  { style: 'none', label: 'ללא' },
  { style: 'rect', label: 'מלבנית', rect: true },
  { style: 'rounded', label: 'מעוגלת', rect: true },
  { style: 'double', label: 'כפולה' },
  { style: 'circle', label: 'עיגול', round: true },
  { style: 'oval', label: 'אובלית', rect: true },
  { style: 'dashed', label: 'מקווקוות' },
  { style: 'minimal', label: 'מינימלית' },
];

export function FramesPanel() {
  const { design, actions, resolveFace } = useEditor();
  const setBorder = (p: Partial<Design['border']>, h = true) => actions.set({ ...design, border: { ...design.border, ...p } }, h);
  const frames = FRAMES.filter((f) => (design.shape === 'round' ? !f.rect : !f.round));
  return (
    <>
      <Section title="מסגרות – מותאמות לגודל החותמת">
        <div className="grid grid-cols-2 gap-2">
          {frames.map((f) => {
            const preview = renderDesign(
              {
                ...design,
                elements: [],
                border: { ...design.border, style: f.style },
              },
              resolveFace,
            );
            return (
              <button
                key={f.style}
                type="button"
                onClick={() => setBorder({ style: f.style })}
                aria-pressed={design.border.style === f.style}
                className={`rounded-lg border p-2 text-xs transition ${design.border.style === f.style ? 'border-blue bg-blue-50' : 'border-line bg-white hover:border-ink/30'}`}
              >
                <div className="grid aspect-[3/2] place-items-center">
                  <StampSvg render={preview} className="max-h-full w-full" pad={0.5} />
                </div>
                {f.label}
              </button>
            );
          })}
        </div>
      </Section>
      {design.border.style !== 'none' && (
        <Section title="הגדרות מסגרת">
          <div className="space-y-3">
            <Slider
              label="עובי"
              unit="מ״מ"
              min={0.2}
              max={2}
              step={0.05}
              value={design.border.thickness}
              onStart={actions.begin}
              onEnd={actions.commit}
              onChange={(v) => setBorder({ thickness: v })}
            />
            <Slider label="מרחק מהקצה" unit="מ״מ" min={0} max={4} step={0.1} value={design.border.inset} onStart={actions.begin} onEnd={actions.commit} onChange={(v) => setBorder({ inset: v })} />
            {design.border.style === 'double' && (
              <Slider
                label="רווח בין הקווים"
                unit="מ״מ"
                min={0.2}
                max={3}
                step={0.1}
                value={design.border.gap}
                onStart={actions.begin}
                onEnd={actions.commit}
                onChange={(v) => setBorder({ gap: v })}
              />
            )}
          </div>
        </Section>
      )}
    </>
  );
}

// ------------------------------------------------------------------ layers

export function LayersPanel() {
  const { design, actions, selection } = useEditor();
  const [dragId, setDragId] = useState<string | null>(null);
  const list = [...design.elements].reverse(); // top-most first
  const name = (el: Design['elements'][number]) =>
    el.type === 'text'
      ? el.text.split('\n')[0] || 'טקסט'
      : el.type === 'image'
        ? `לוגו – ${el.source.name}`
        : {
            rect: 'מלבן',
            ellipse: 'עיגול',
            line: 'קו',
            star: 'כוכב',
            icon: 'אייקון',
          }[el.kind];
  return (
    <Section title="שכבות">
      <ul className="space-y-1">
        {list.map((el) => (
          <li
            key={el.id}
            draggable
            onDragStart={() => setDragId(el.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!dragId || dragId === el.id) return;
              const to = design.elements.findIndex((x) => x.id === el.id);
              actions.reorder(dragId, to);
              setDragId(null);
            }}
            className={`group flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm ${selection.includes(el.id) ? 'border-blue bg-blue-50' : 'border-transparent hover:bg-surface'}`}
          >
            <span className="cursor-grab text-muted" aria-hidden>
              <Icon name="drag" size={16} />
            </span>
            <button type="button" className={`flex-1 truncate text-right ${el.hidden ? 'text-muted line-through' : ''}`} onClick={() => actions.select([el.id])}>
              {name(el)}
            </button>
            <IconButton icon={el.hidden ? 'eyeOff' : 'eye'} label={el.hidden ? 'הצג' : 'הסתר'} onClick={() => actions.patch(el.id, { hidden: !el.hidden })} size={16} className="!h-7 !w-7" />
            <IconButton
              icon={el.locked ? 'lock' : 'unlock'}
              label={el.locked ? 'שחרר נעילה' : 'נעל'}
              onClick={() => actions.patch(el.id, { locked: !el.locked })}
              size={16}
              className={`!h-7 !w-7 ${el.locked ? 'text-blue' : ''}`}
            />
            <IconButton icon="copy" label="שכפל" onClick={() => actions.duplicate([el.id])} size={16} className="!h-7 !w-7" />
            <IconButton icon="trash" label="מחק" onClick={() => actions.remove([el.id])} size={16} className="!h-7 !w-7" disabled={el.locked} />
          </li>
        ))}
        <li className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted">
          <Icon name="frame" size={16} /> מסגרת: {design.border.style === 'none' ? 'ללא' : FRAMES.find((f) => f.style === design.border.style)?.label}
        </li>
      </ul>
      {!design.elements.length && <p className="py-4 text-center text-sm text-muted">אין עדיין אלמנטים.</p>}
    </Section>
  );
}
