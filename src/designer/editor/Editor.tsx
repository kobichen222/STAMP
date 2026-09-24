'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { Icon } from '@/components/ui/Icon';
import { clearActiveDraft, setActiveDraft } from '@/lib/active-draft';
import { addToCart } from '@/lib/cart-store';
import { saveDesign } from '@/lib/designs-store';
import { formatPrice } from '@/lib/format';
import { quoteLine } from '@/lib/pricing';
import { autoFix, composeForProduction } from '../autofix';
import { composeLayout, improveLayout, newDesign } from '../compose';
import { formatSize } from '../models';
import { profileForModel } from '../profiles';
import { renderDesign } from '../render';
import { toProductionSvg } from '../production';
import { TEMPLATES } from '../templates';
import type { Design, DesignElement, InkColor, StampModel, TextElement } from '../types';
import { isProductionReady, validateDesign } from '../validate';
import { useFaces } from '../useFaces';
import { Canvas, type ViewSettings } from './Canvas';
import { EditorContext, type EditorContextValue, type PanelId } from './context';
import { IconButton } from './controls';
import { AddToCartModal } from './AddToCartModal';
import { AiPanel } from './AiPanel';
import { EmptyState } from './EmptyState';
import { FloatingToolbar } from './FloatingToolbar';
import { MobileEditBar } from './MobileEditBar';
import { Onboarding } from './Onboarding';
import { PreflightBadge } from './PreflightBadge';
import { PreviewMode } from './PreviewMode';
import { SettingsPanel } from './SettingsPanel';
import { ElementsPanel, FramesPanel, IconsPanel, LayersPanel, LogoPanel, ShapesPanel, TemplatesPanel, TextPanel } from './panels';
import { useEditorStore } from './store';

export interface DesignerProduct {
  slug: string;
  title: string;
  price: number | null;
  image: string | null;
  model: StampModel;
}

const PANELS: {
  id: PanelId;
  label: string;
  icon: string;
  advanced?: boolean;
}[] = [
  { id: 'templates', label: 'תבניות', icon: 'template' },
  { id: 'text', label: 'טקסט', icon: 'text' },
  { id: 'logo', label: 'לוגו', icon: 'image' },
  { id: 'icons', label: 'אייקונים', icon: 'star' },
  { id: 'shapes', label: 'צורות', icon: 'shapes', advanced: true },
  { id: 'frames', label: 'מסגרות', icon: 'frame' },
  { id: 'layers', label: 'שכבות', icon: 'layers', advanced: true },
  { id: 'ai', label: 'עיצוב עם AI', icon: 'sparkles' },
  { id: 'settings', label: 'הגדרות', icon: 'settings' },
  { id: 'elements', label: 'אלמנטים', icon: 'shapes', advanced: true },
];

const MOBILE_TABS: { id: PanelId; label: string; icon: string }[] = [
  { id: 'templates', label: 'תבניות', icon: 'template' },
  { id: 'text', label: 'טקסט', icon: 'text' },
  { id: 'logo', label: 'לוגו', icon: 'image' },
  { id: 'elements', label: 'אלמנטים', icon: 'star' },
  { id: 'settings', label: 'עוד', icon: 'menu' },
];
const MORE_LINKS: PanelId[] = ['ai', 'layers', 'shapes'];

/** Viewport height that follows the on-screen keyboard (visualViewport). */
function useViewport() {
  const [vp, setVp] = useState({
    h: 0,
    top: 0,
    keyboard: false,
    mobile: false,
  });
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const vv = window.visualViewport;
    const update = () => {
      const h = vv?.height ?? window.innerHeight;
      setVp({
        h: Math.round(h),
        top: Math.round(vv?.offsetTop ?? 0),
        keyboard: window.innerHeight - h > 140,
        mobile: mq.matches,
      });
    };
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    mq.addEventListener('change', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      mq.removeEventListener('change', update);
    };
  }, []);
  return vp;
}

let clipboard: DesignElement[] = [];

function PanelBody({ id, readyFile }: { id: PanelId; readyFile: boolean }) {
  switch (id) {
    case 'templates':
      return <TemplatesPanel />;
    case 'text':
      return <TextPanel />;
    case 'logo':
      return <LogoPanel readyFile={readyFile} />;
    case 'icons':
      return <IconsPanel />;
    case 'elements':
      return <ElementsPanel />;
    case 'shapes':
      return <ShapesPanel />;
    case 'frames':
      return <FramesPanel />;
    case 'layers':
      return <LayersPanel />;
    case 'ai':
      return <AiPanel />;
    case 'settings':
      return <SettingsPanel />;
  }
}

export interface EditorProps {
  product: DesignerProduct;
  products: DesignerProduct[];
  initialDesign?: Design | null;
  designId: string;
  templateId?: string | null;
  initialInk?: InkColor;
  initialQty?: number;
  bodyColor?: string;
  startWithUpload?: boolean;
  /** One-time message on open (e.g. design carried over to another product). */
  notice?: string;
  /** Opened by continuing the customer's draft in progress. */
  resumed?: boolean;
}

export function Editor({ product, products, initialDesign, designId, templateId, initialInk, initialQty = 1, bodyColor, startWithUpload, notice, resumed }: EditorProps) {
  const router = useRouter();
  const model = product.model;
  const profile = useMemo(() => profileForModel(model), [model]);

  const initial = useMemo<Design>(() => {
    if (initialDesign) return initialDesign;
    const t = templateId ? TEMPLATES.find((x) => x.id === templateId) : null;
    const d = t ? composeLayout(model, t.content, t.style) : newDesign(model);
    return { ...d, inkColor: initialInk ?? 'black' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { state, actions, selected, canUndo, canRedo } = useEditorStore(initial);
  const design = state.design;
  const templateFitted = useRef(false);
  const [panel, setPanel] = useState<PanelId | null>(initialDesign || templateId ? 'text' : startWithUpload ? 'logo' : 'templates');
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheet, setSheet] = useState<'closed' | 'half' | 'full'>('closed');
  const [advanced, setAdvanced] = useState(false);
  const [view, setView] = useState<ViewSettings>({
    zoom: 3,
    grid: false,
    safeArea: true,
    snap: true,
  });
  const [fitSignal, setFitSignal] = useState(0);
  const [preview, setPreview] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [qty, setQty] = useState(initialQty);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [resumeBar, setResumeBar] = useState(!!resumed);
  useEffect(() => {
    if (!resumeBar) return;
    const t = window.setTimeout(() => setResumeBar(false), 12_000);
    return () => window.clearTimeout(t);
  }, [resumeBar]);
  const [showEmpty, setShowEmpty] = useState(!initialDesign && !templateId && !startWithUpload);
  const [readyFile, setReadyFile] = useState(!!startWithUpload);
  const [exitAsk, setExitAsk] = useState(false);
  const [firstDragDone, setFirstDragDone] = useState(true);
  const [focusTextId, setFocusTextId] = useState<string | null>(null);
  const [autoFit, setAutoFit] = useState(true);
  const [dragH, setDragH] = useState<number | null>(null);
  const vp = useViewport();
  const isMobile = vp.mobile;
  const lastVersion = useRef(0);
  const sheetDrag = useRef<{ y: number; h: number; moved: boolean } | null>(null);

  const { resolve, ready, version } = useFaces([design]);
  const render = useMemo(() => (ready ? renderDesign(design, resolve) : null), [design, resolve, ready, version]);
  const issues = useMemo(() => (render ? validateDesign(design, render, profile) : []), [design, render, profile]);
  const productionReady = isProductionReady(issues);

  // A template opened from a link is composed before fonts load; once they
  // are ready, adapt it to this stamp size so it starts production-ready.
  useEffect(() => {
    if (!ready || templateFitted.current || initialDesign || !templateId || state.revision) return;
    templateFitted.current = true;
    const t = TEMPLATES.find((x) => x.id === templateId);
    if (!t || isProductionReady(issues)) return;
    actions.set({ ...composeForProduction(model, t.content, t.style, resolve, profile).design, inkColor: design.inkColor }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const issuesById = useMemo(() => {
    const m: Record<string, 'error' | 'warning'> = {};
    for (const i of issues) if (i.elementId && i.severity !== 'info') m[i.elementId] = m[i.elementId] === 'error' ? 'error' : (i.severity as 'error' | 'warning');
    return m;
  }, [issues]);

  const hasLogo = design.elements.some((e) => e.type === 'image');
  const quote = quoteLine({
    basePrice: product.price,
    quantity: qty,
    ink: design.inkColor,
    body: bodyColor,
    hasLogo,
  });

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2600);
  }, []);

  // ---------------------------------------------------------------- autosave (local draft + versions)
  const persist = (snapshot: boolean) => {
    setActiveDraft(designId);
    const firstText = design.elements.find((e): e is TextElement => e.type === 'text')?.text.split('\n')[0];
    saveDesign(
        {
          id: designId,
          name: firstText || product.title,
          productSlug: product.slug,
          productName: product.title,
          size: formatSize(model),
          design,
          previewSvg: render ? toProductionSvg(render) : '',
          price: product.price,
        },
        snapshot,
      );
  };
  useEffect(() => {
    if (!state.revision) return;
    setSaveState('saving');
    const t = window.setTimeout(() => {
      const snapshot = Date.now() - lastVersion.current > 60_000;
      if (snapshot) lastVersion.current = Date.now();
      persist(snapshot);
      setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saved');
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.revision]);

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      const mod = e.metaKey || e.ctrlKey;
      const sel = state.selection;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) actions.redo();
        else actions.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        actions.redo();
      } else if (mod && e.key.toLowerCase() === 'c' && sel.length) {
        clipboard = design.elements.filter((x) => sel.includes(x.id));
      } else if (mod && e.key.toLowerCase() === 'v' && clipboard.length) {
        e.preventDefault();
        actions.add(
          ...clipboard.map((c) => ({
            ...c,
            id: `${c.type}-${Math.random().toString(36).slice(2, 9)}`,
            x: c.x + 1.5,
            y: c.y + 1.5,
            locked: false,
          })),
        );
      } else if (mod && e.key.toLowerCase() === 'd' && sel.length) {
        e.preventDefault();
        actions.duplicate(sel);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length) {
        e.preventDefault();
        actions.remove(sel);
      } else if (e.key === 'Escape') {
        actions.select([]);
      } else if (e.key === 'Tab' && design.elements.length) {
        e.preventDefault();
        const idx = design.elements.findIndex((x) => x.id === sel[0]);
        const next = design.elements[(idx + (e.shiftKey ? -1 : 1) + design.elements.length) % design.elements.length];
        actions.select([next.id]);
      } else if (e.key.startsWith('Arrow') && sel.length) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 0.1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        actions.patch(
          sel.filter((id) => !design.elements.find((x) => x.id === id)?.locked),
          (el) => ({
            x: Math.round((el.x + dx) * 100) / 100,
            y: Math.round((el.y + dy) * 100) / 100,
          }),
        );
      } else if (e.key === '+' || e.key === '=') {
        setView((v) => ({ ...v, zoom: Math.min(20, v.zoom * 1.2) }));
      } else if (e.key === '-') {
        setView((v) => ({ ...v, zoom: Math.max(0.3, v.zoom / 1.2) }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, design.elements, state.selection]);

  // Open the relevant panel when selecting an element.
  useEffect(() => {
    if (selected.length !== 1) return;
    const t = selected[0].type;
    setPanel((p) => {
      if (t === 'text') return 'text';
      if (t === 'image') return 'logo';
      if (t === 'shape') return isMobile ? 'elements' : (selected[0] as { kind: string }).kind === 'icon' ? 'icons' : 'shapes';
      return p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selection.join(',')]);

  useEffect(() => {
    try {
      setFirstDragDone(!!localStorage.getItem('s2g-drag-tip'));
    } catch {
      /* ignore */
    }
  }, []);

  const dismissDragTip = useCallback(() => {
    setFirstDragDone(true);
    try {
      localStorage.setItem('s2g-drag-tip', '1');
    } catch {
      /* ignore */
    }
  }, []);
  // The hint is a one-time nudge – fade it out on its own after a few seconds.
  const hasElements = design.elements.length > 0;
  useEffect(() => {
    if (firstDragDone || !hasElements) return;
    const t = window.setTimeout(dismissDragTip, 7000);
    return () => window.clearTimeout(t);
  }, [firstDragDone, hasElements, dismissDragTip]);

  useEffect(() => {
    if (notice && !resumed) toast(notice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // A design carried over from another product is saved under this product right away.
  const movedSaved = useRef(false);
  useEffect(() => {
    if (!notice || !ready || !render || movedSaved.current) return;
    movedSaved.current = true;
    persist(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, render]);

  const openPanel = useCallback((p: PanelId) => {
    setPanel(p);
    setPanelOpen(true);
    setSheet('half');
  }, []);

  const fixAll = () => {
    actions.set(autoFix(design, resolve, profile));
    toast('תיקנו את מה שאפשר אוטומטית');
  };

  const changeProduct = (slug: string) => {
    // Keep the work: save now and carry this design over to the new product.
    const hasWork = design.elements.length > 0;
    if (hasWork) persist(true);
    router.push(`/designer/${slug}/?${hasWork ? `design=${designId}&` : ''}ink=${design.inkColor}&qty=${qty}`);
  };

  const ctx: EditorContextValue = {
    design,
    render,
    selection: state.selection,
    selected,
    actions,
    model,
    profile,
    advanced,
    resolveFace: resolve,
    issues,
    openPanel,
    toast,
    view,
    setView,
    setAdvanced,
    designId,
    focusTextId,
    setFocusTextId,
    isMobile,
    addVariants: (list) => {
      for (const d of list) {
        const r = renderDesign(d, resolve);
        addToCart({
          productSlug: product.slug,
          productName: product.title,
          modelId: model.id,
          size: formatSize(model),
          design: d,
          previewSvg: toProductionSvg(r),
          ink: d.inkColor,
          bodyColor,
          quantity: 1,
          unitPrice: product.price,
        });
      }
      clearActiveDraft();
      router.push('/cart/?added=' + list.length);
    },
    improve: (style) => {
      actions.set(improveLayout(design, model, style));
      toast('הסידור שופר · אפשר לבטל עם Undo');
    },
  };

  const confirmAdd = () => {
    if (!render) return;
    addToCart({
      productSlug: product.slug,
      productName: product.title,
      modelId: model.id,
      size: formatSize(model),
      design,
      previewSvg: toProductionSvg(render),
      ink: design.inkColor,
      bodyColor,
      quantity: qty,
      unitPrice: product.price,
      designId,
    });
    clearActiveDraft(); // done – the next stamp starts fresh
    router.push('/cart/?added=1');
  };

  const visiblePanels = PANELS.filter((p) => advanced || !p.advanced);
  const activePanel = PANELS.find((p) => p.id === panel);
  const elementsCount = design.elements.filter((e) => !e.hidden).length;
  const isEmpty = issues.some((i) => i.code === 'empty');
  // Sheet heights follow the visible viewport; with the keyboard open the
  // sheet takes what is left while keeping a strip of the stamp visible.
  const avail = Math.max(0, vp.h - 56);
  const halfH = Math.round(vp.keyboard ? Math.max(avail - 150, 140) : vp.h * 0.42);
  const fullH = Math.round(vp.keyboard ? halfH : Math.min(vp.h * 0.72, avail - 120));
  const sheetHeight = dragH ?? (sheet === 'full' ? fullH : halfH);

  return (
    <EditorContext.Provider value={ctx}>
      <div
        className="fixed inset-x-0 top-0 bottom-0 z-40 flex flex-col overflow-hidden bg-white text-ink"
        style={isMobile && vp.h ? { height: vp.h, top: vp.top, bottom: 'auto' } : undefined}
        dir="rtl"
      >
        {/* ------------------------------------------------ header */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-2 sm:px-3">
          <button type="button" onClick={() => setExitAsk(true)} className="hidden items-center sm:flex" aria-label="יציאה מהעורך">
            <Logo size="sm" />
          </button>
          <IconButton icon="arrowRight" label="חזרה" onClick={() => setExitAsk(true)} className="sm:hidden" />
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{product.title}</p>
            <p className="text-xs text-muted">{formatSize(model)}</p>
          </div>
          <span className="ms-2 hidden items-center gap-1 text-xs text-muted md:flex" aria-live="polite">
            {saveState === 'saving' ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-warn" /> שומר…
              </>
            ) : saveState === 'offline' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-warn" /> השינויים נשמרו מקומית
              </>
            ) : (
              <>
                <Icon name="check" size={14} className="text-ok" /> נשמר
              </>
            )}
          </span>
          <div className="ms-auto flex items-center gap-0.5">
            <IconButton icon="undo" label="בטל (Ctrl+Z)" onClick={actions.undo} disabled={!canUndo} />
            <IconButton icon="redo" label="בצע שוב (Ctrl+Shift+Z)" onClick={actions.redo} disabled={!canRedo} />
            <span className="mx-1 hidden h-6 w-px bg-line md:block" />
            <div className="hidden items-center md:flex">
              <IconButton icon="zoomOut" label="הקטן" onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.3, v.zoom / 1.25) }))} />
              <button type="button" className="w-14 rounded-md py-1 text-center text-xs tabular-nums hover:bg-surface" onClick={() => setView((v) => ({ ...v, zoom: 1 }))} title="100% = גודל אמיתי">
                {Math.round(view.zoom * 100)}%
              </button>
              <IconButton icon="zoomIn" label="הגדל" onClick={() => setView((v) => ({ ...v, zoom: Math.min(20, v.zoom * 1.25) }))} />
              <IconButton
                icon="fit"
                label="התאם למסך"
                onClick={() => {
                  setAutoFit(true);
                  setFitSignal((s) => s + 1);
                }}
              />
            </div>
            <span className="mx-1 hidden h-6 w-px bg-line md:block" />
            <button type="button" className="btn-ghost btn-sm" onClick={() => setPreview(true)}>
              <Icon name="eye" size={17} /> <span className="hidden sm:inline">תצוגה מקדימה</span>
            </button>
            <Link href="/faq/#design" target="_blank" className="hidden md:block" aria-label="עזרה">
              <IconButton icon="help" label="עזרה" />
            </Link>
            <IconButton icon="close" label="יציאה מהעורך" onClick={() => setExitAsk(true)} className="hidden sm:grid" />
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1">
          {/* ------------------------------------------------ desktop rail + panel (right side in RTL) */}
          <nav className="hidden w-[76px] shrink-0 flex-col items-stretch gap-1 border-l border-line bg-white py-2 lg:flex" aria-label="כלים">
            {visiblePanels.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (panel === p.id && panelOpen) setPanelOpen(false);
                  else {
                    setPanel(p.id);
                    setPanelOpen(true);
                  }
                }}
                aria-pressed={panel === p.id && panelOpen}
                className={`mx-1.5 flex flex-col items-center gap-1 rounded-xl py-2.5 text-[11px] transition ${panel === p.id && panelOpen ? 'bg-blue-50 text-blue' : 'text-ink-2 hover:bg-surface'}`}
              >
                <Icon name={p.icon} size={21} />
                {p.label}
              </button>
            ))}
            <div className="mt-auto px-2 pb-1">
              <button
                type="button"
                onClick={() => setAdvanced((a) => !a)}
                className="w-full rounded-lg border border-line py-1.5 text-[10px] font-medium text-ink-2 hover:border-ink/30"
                aria-pressed={advanced}
                title="מצב מתקדם: מיקום, שכבות, צורות, רשת"
              >
                {advanced ? 'מתקדם' : 'פשוט'}
              </button>
            </div>
          </nav>

          {panelOpen && panel && (
            <aside className="hidden w-[320px] shrink-0 flex-col border-l border-line bg-white lg:flex" aria-label={activePanel?.label}>
              <div className="flex h-12 items-center justify-between border-b border-line px-4">
                <h2 className="text-sm font-semibold">{activePanel?.label}</h2>
                <IconButton icon="chevronLeft" label="סגירת הפאנל" onClick={() => setPanelOpen(false)} />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PanelBody id={panel} readyFile={readyFile} />
              </div>
            </aside>
          )}

          {/* ------------------------------------------------ canvas */}
          <div className="relative min-w-0 flex-1">
            {!ready && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-[#F5F7FA]">
                <p className="animate-pulse text-sm text-muted">טוען גופנים…</p>
              </div>
            )}
            {/* Mobile: a fixed strip under the stamp for the editing bar, so it never covers the design (and nothing jumps on select). */}
            <div className={`h-full bg-[#F5F7FA] ${isMobile && sheet === 'closed' ? 'pb-14' : ''}`}>
              <Canvas
                design={design}
                render={render}
                selection={state.selection}
                actions={actions}
                view={view}
                onZoom={(z, source) => {
                  if (source === 'user') setAutoFit(false);
                  setView((v) => ({ ...v, zoom: z }));
                }}
                autoFit={autoFit}
                onTap={(id) => {
                  if (!isMobile) return;
                  dismissDragTip();
                  const el = design.elements.find((e) => e.id === id);
                  if (!el) return;
                  const p: PanelId = el.type === 'text' ? 'text' : el.type === 'image' ? 'logo' : 'elements';
                  setPanel(p);
                  if (sheet === 'closed') setSheet('half');
                  if (el.type === 'text') setFocusTextId(id);
                }}
                ink={design.inkColor}
                safeMargin={profile.safeMargin}
                issuesById={issuesById}
                fitSignal={fitSignal}
                onFirstDrag={dismissDragTip}
              />
            </div>
            {/* Mobile: the open panel already holds every action – the bar only appears with the panel closed. */}
            {selected.length > 0 && (isMobile ? sheet === 'closed' && <MobileEditBar /> : <FloatingToolbar />)}
            {resumeBar && (
              <div role="status" className="absolute inset-x-3 top-16 z-30 mx-auto flex w-fit max-w-full animate-fade-up items-center gap-2 rounded-2xl border border-blue/20 bg-white/95 py-1.5 ps-3 pe-1.5 text-sm shadow-lift backdrop-blur lg:top-3">
                <Icon name="history" size={16} className="shrink-0 text-blue" />
                <span className="min-w-0">
                  <span className="font-semibold">המשכנו מהעיצוב שלכם</span>
                  {notice && <span className="text-muted"> · הותאם ל{product.title}</span>}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold text-blue hover:bg-blue-50"
                  onClick={() => {
                    clearActiveDraft();
                    router.push(`/designer/${product.slug}/?new=1&ink=${design.inkColor}&qty=${qty}`);
                  }}
                >
                  התחלה מחדש
                </button>
                <IconButton icon="close" label="סגירה" onClick={() => setResumeBar(false)} className="!h-7 !w-7" size={14} />
              </div>
            )}
            <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-2">
              <div className="pointer-events-auto">
                <PreflightBadge issues={issues} onFix={fixAll} onSelect={(id) => actions.select([id])} />
              </div>
            </div>
            {toastMsg && isMobile && (
              <div role="status" className={`pointer-events-none absolute inset-x-3 z-20 mx-auto w-fit max-w-full animate-fade-up rounded-full bg-ink/90 px-4 py-2 text-center text-[13px] text-white shadow-lift ${selected.length && sheet === 'closed' ? 'bottom-16' : 'bottom-3'}`}>
                {toastMsg}
              </div>
            )}
            {isMobile && !autoFit && !selected.length && (
              <button
                type="button"
                onClick={() => {
                  setAutoFit(true);
                  setFitSignal((s) => s + 1);
                }}
                className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full border border-line bg-white/95 px-3 py-1.5 text-xs font-medium shadow-soft"
              >
                <Icon name="fit" size={15} /> התאמה למסך
              </button>
            )}
            {!firstDragDone && design.elements.length > 0 && (
              <div className="pointer-events-none absolute bottom-5 left-1/2 w-max max-w-[90%] -translate-x-1/2 animate-fade-up rounded-full bg-ink px-4 py-2 text-center text-sm text-white shadow-lift">
                {isMobile ? 'הקישו על אלמנט כדי לבחור · אחר כך גררו אותו או השתמשו בחיצים' : 'גררו אלמנטים כדי למקם אותם · לחיצה כפולה לעריכת טקסט'}
              </div>
            )}
            {showEmpty && design.elements.length === 0 && (
              <EmptyState
                currentId={designId}
                onTemplates={() => {
                  setShowEmpty(false);
                  openPanel('templates');
                }}
                onBlank={() => {
                  setShowEmpty(false);
                  openPanel('text');
                }}
                onUpload={() => {
                  setShowEmpty(false);
                  setReadyFile(true);
                  openPanel('logo');
                }}
              />
            )}
            {product.image && (
              <div className="pointer-events-none absolute right-3 bottom-3 hidden w-44 rounded-xl border border-line bg-white/90 p-2 shadow-soft backdrop-blur 2xl:block">
                <img src={encodeURI(product.image)} alt="" className="mx-auto h-24 object-contain mix-blend-multiply" />
                <p className="mt-1 truncate text-center text-[11px] text-muted">{product.title}</p>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------ desktop status bar */}
        <footer className="hidden h-14 shrink-0 items-center gap-4 border-t border-line bg-white px-4 lg:flex">
          <span className="text-xs text-muted tabular-nums">
            {formatSize(model)} · {elementsCount} אלמנטים · {Math.round(view.zoom * 100)}%
          </span>
          <span className={`flex items-center gap-1.5 text-xs font-medium ${productionReady ? 'text-ok' : 'text-bad'}`}>
            <span className={`h-2 w-2 rounded-full ${productionReady ? 'bg-ok' : 'bg-bad'}`} />
            {productionReady ? 'הקובץ תקין' : 'נדרשים תיקונים'}
          </span>
          <div className="ms-auto flex items-center gap-4">
            <div className="flex items-center rounded-full border border-line">
              <IconButton icon="minus" label="הפחת כמות" onClick={() => setQty((q) => Math.max(1, q - 1))} className="!h-8 !w-8 rounded-full" size={15} />
              <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-label="כמות">
                {qty}
              </span>
              <IconButton icon="plus" label="הוסף כמות" onClick={() => setQty((q) => q + 1)} className="!h-8 !w-8 rounded-full" size={15} />
            </div>
            <div className="text-left leading-tight">
              <p className="text-lg font-bold tabular-nums">{quote.onRequest ? 'לפי הצעה' : formatPrice(quote.total)}</p>
              <p className="text-[11px] text-muted">
                {qty > 1 && !quote.onRequest ? `${formatPrice(quote.unitPrice)} ליח׳ · ` : ''}
                כולל החותמת והעיצוב · משלוח בקופה
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={() => setCartOpen(true)} disabled={!render}>
              המשך להזמנה <Icon name="arrowLeft" size={17} />
            </button>
          </div>
        </footer>

        {/* ------------------------------------------------ mobile: in-flow bottom sheet + toolbar */}
        {isMobile && sheet !== 'closed' && panel && (
          <section
            className="relative flex shrink-0 flex-col rounded-t-3xl border-t border-line bg-white shadow-[0_-8px_30px_-12px_rgba(11,20,38,.18)] lg:hidden"
            style={{
              height: sheetHeight,
              transition: dragH == null ? 'height .28s cubic-bezier(.2,.8,.2,1)' : 'none',
            }}
            aria-label={activePanel?.label}
          >
            <div
              className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2 pb-1 select-none"
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                sheetDrag.current = {
                  y: e.clientY,
                  h: sheetHeight,
                  moved: false,
                };
              }}
              onPointerMove={(e) => {
                const d = sheetDrag.current;
                if (!d) return;
                const dy = d.y - e.clientY;
                if (Math.abs(dy) > 4) d.moved = true;
                if (d.moved) setDragH(Math.max(60, Math.min(fullH, d.h + dy)));
              }}
              onPointerUp={() => {
                const d = sheetDrag.current;
                sheetDrag.current = null;
                if (!d) return;
                if (!d.moved) {
                  setSheet((s) => (s === 'full' ? 'half' : 'full'));
                  setDragH(null);
                  return;
                }
                const h = dragH ?? d.h;
                setDragH(null);
                if (h < halfH * 0.6) setSheet('closed');
                else setSheet(Math.abs(h - halfH) < Math.abs(h - fullH) ? 'half' : 'full');
              }}
              onPointerCancel={() => {
                sheetDrag.current = null;
                setDragH(null);
              }}
            >
              <span className="h-1.5 w-11 rounded-full bg-line" aria-hidden />
              <div className="flex w-full items-center justify-between px-4 pt-1">
                <h2 className="text-[15px] font-semibold">{activePanel?.label ?? 'עוד'}</h2>
                <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
                  <IconButton icon={sheet === 'full' ? 'chevronDown' : 'chevronUp'} label={sheet === 'full' ? 'הקטנה' : 'הרחבה'} onClick={() => setSheet((s) => (s === 'full' ? 'half' : 'full'))} />
                  <IconButton icon="close" label="סגירת הפאנל" onClick={() => setSheet('closed')} />
                </div>
              </div>
            </div>
            {panel === 'settings' && (
              <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-2">
                {MORE_LINKS.map((id) => {
                  const p = PANELS.find((x) => x.id === id)!;
                  return (
                    <button key={id} type="button" className="chip shrink-0 gap-1.5" onClick={() => setPanel(id)}>
                      <Icon name={p.icon} size={15} /> {p.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div key={panel} className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line/60 pb-3">
              <PanelBody id={panel} readyFile={readyFile} />
            </div>
          </section>
        )}

        <div className={`shrink-0 border-t border-line bg-white lg:hidden ${vp.keyboard ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0 leading-tight">
              <p className="font-bold tabular-nums">{quote.onRequest ? 'לפי הצעה' : formatPrice(quote.total)}</p>
              <p className={`truncate text-[11px] ${isEmpty ? 'text-muted' : productionReady ? 'text-ok' : 'text-bad'}`}>
                {isEmpty ? 'התחילו מתבנית או מטקסט' : productionReady ? '✓ מוכן לייצור' : 'נדרשים תיקונים'}
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={() => setCartOpen(true)} disabled={!render || isEmpty}>
              המשך להזמנה <Icon name="arrowLeft" size={16} />
            </button>
          </div>
          <nav className="grid grid-cols-5 border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="כלים">
            {MOBILE_TABS.map((p) => {
              const on = sheet !== 'closed' && (panel === p.id || (p.id === 'settings' && !!panel && MORE_LINKS.includes(panel)));
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (on) setSheet('closed');
                    else {
                      setPanel(p.id);
                      setSheet('half');
                    }
                  }}
                  className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] transition ${on ? 'font-semibold text-blue' : 'text-ink-2'}`}
                >
                  {on && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-blue" />}
                  <Icon name={p.icon} size={21} />
                  {p.label}
                </button>
              );
            })}
          </nav>
        </div>

        {toastMsg && (
          <div
            role="status"
            className="fixed bottom-20 left-1/2 z-[60] hidden w-max max-w-[90vw] -translate-x-1/2 animate-fade-up rounded-full bg-ink px-4 py-2 text-center text-sm text-white shadow-lift lg:block"
          >
            {toastMsg}
          </div>
        )}

        {preview && render && (
          <PreviewMode render={render} ink={design.inkColor} onInk={(ink) => actions.set({ ...design, inkColor: ink })} productImage={product.image} onClose={() => setPreview(false)} />
        )}
        {cartOpen && render && (
          <AddToCartModal
            render={render}
            product={product}
            issues={issues}
            qty={qty}
            onQty={setQty}
            ink={design.inkColor}
            onInk={(ink) => actions.set({ ...design, inkColor: ink })}
            total={quote.total}
            onRequest={quote.onRequest}
            onFix={fixAll}
            onConfirm={confirmAdd}
            onClose={() => setCartOpen(false)}
          />
        )}
        {exitAsk && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/30 p-4" role="dialog" aria-modal="true" aria-labelledby="exit-title">
            <div className="card w-full max-w-sm animate-pop p-6 shadow-lift">
              <h2 id="exit-title" className="text-lg font-bold">
                לצאת מהעורך?
              </h2>
              <p className="mt-2 text-sm text-muted">העיצוב נשמר אוטומטית ב״העיצובים שלי״ במכשיר הזה, ותוכלו לחזור אליו בכל רגע.</p>
              <div className="mt-5 grid gap-2">
                <Link href="/account/#designs" className="btn-primary">
                  שמירה ומעבר לעיצובים שלי
                </Link>
                <button type="button" className="btn-outline" onClick={() => router.push(`/stamp/${product.slug}/`)}>
                  יציאה
                </button>
                <button type="button" className="btn-ghost" onClick={() => setExitAsk(false)}>
                  להמשיך לעצב
                </button>
              </div>
            </div>
          </div>
        )}
        <Onboarding paused={showEmpty && design.elements.length === 0} />
        <ProductSwitcherHost products={products} current={product.slug} onChange={changeProduct} />
      </div>
    </EditorContext.Provider>
  );
}

/** Registers the product list for the settings panel (kept out of context to avoid re-renders). */
function ProductSwitcherHost({ products, current, onChange }: { products: DesignerProduct[]; current: string; onChange: (slug: string) => void }) {
  useEffect(() => {
    productSwitcher.products = products;
    productSwitcher.current = current;
    productSwitcher.onChange = onChange;
  }, [products, current, onChange]);
  return null;
}

export const productSwitcher: {
  products: DesignerProduct[];
  current: string;
  onChange: (slug: string) => void;
} = {
  products: [],
  current: '',
  onChange: () => undefined,
};
