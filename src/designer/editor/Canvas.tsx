'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toSvgD, type BBox } from '../geometry';
import type { RenderResult } from '../render';
import { INK_COLORS, type Design, type DesignElement, type InkColor, type TextElement } from '../types';
import { dateBandRect } from '../validate';
import type { EditorActions } from './store';

export const MM_PX = 96 / 25.4; // CSS px per mm at 100%
const MARGIN = 7; // mm around the stamp inside the SVG (room for handles)

export interface ViewSettings {
  zoom: number; // 1 = real size
  grid: false | 0.5 | 1 | 2;
  safeArea: boolean;
  snap: boolean;
}

interface Guide {
  axis: 'x' | 'y';
  pos: number;
}

type Gesture =
  | { kind: 'move'; start: [number, number]; origin: Record<string, [number, number]>; bbox: BBox }
  | { kind: 'scale'; center: [number, number]; startDist: number; el: DesignElement }
  | { kind: 'rotate'; center: [number, number]; el: DesignElement }
  | { kind: 'pan'; start: [number, number]; pan: [number, number] };

interface Props {
  design: Design;
  render: RenderResult | null;
  selection: string[];
  actions: EditorActions;
  view: ViewSettings;
  onZoom: (z: number) => void;
  ink: InkColor;
  safeMargin: number;
  issuesById: Record<string, 'error' | 'warning'>;
  onFirstDrag?: () => void;
  fitSignal: number;
}

const round = (v: number, step = 0.05) => Math.round(v / step) * step;

export function Canvas({ design, render, selection, actions, view, onZoom, ink, safeMargin, issuesById, onFirstDrag, fitSignal }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, [number, number]>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const [editing, setEditing] = useState<string | null>(null);
  const [fitZoom, setFitZoom] = useState(3);
  const W = design.width;
  const H = design.height;
  const pxPerMm = MM_PX * view.zoom;

  // ---------------------------------------------------------------- fit
  const computeFit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return 3;
    const { width, height } = el.getBoundingClientRect();
    return Math.max(0.3, Math.min(12, Math.min((width - 48) / ((W + 2 * MARGIN) * MM_PX), (height - 48) / ((H + 2 * MARGIN) * MM_PX))));
  }, [W, H]);

  useLayoutEffect(() => {
    const z = computeFit();
    setFitZoom(z);
    onZoom(z);
    setPan([0, 0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, fitSignal]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setFitZoom(computeFit()));
    ro.observe(el);
    return () => ro.disconnect();
  }, [computeFit]);

  // ---------------------------------------------------------------- coords
  const toMm = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [p.x, p.y];
  }, []);

  // ---------------------------------------------------------------- wheel zoom
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
        onZoom(Math.max(0.3, Math.min(20, view.zoom * factor)));
      } else {
        setPan(([x, y]) => [x - e.deltaX, y - e.deltaY]);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [view.zoom, onZoom]);

  // ---------------------------------------------------------------- snapping
  const snapTargets = useCallback(
    (movingIds: string[]) => {
      const xs = [W / 2, safeMargin, W - safeMargin];
      const ys = [H / 2, safeMargin, H - safeMargin];
      if (render) {
        for (const [id, info] of Object.entries(render.info)) {
          if (movingIds.includes(id) || id === 'border' || !Number.isFinite(info.bbox.minX)) continue;
          const b = info.bbox;
          xs.push(b.minX, b.maxX, (b.minX + b.maxX) / 2);
          ys.push(b.minY, b.maxY, (b.minY + b.maxY) / 2);
        }
      }
      return { xs, ys };
    },
    [W, H, safeMargin, render],
  );

  // ---------------------------------------------------------------- pointer handlers
  const onPointerDownItem = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const el = design.elements.find((x) => x.id === id);
    if (!el) return;
    const ids = e.shiftKey ? (selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]) : selection.includes(id) ? selection : [id];
    actions.select(ids);
    const movable = design.elements.filter((x) => ids.includes(x.id) && !x.locked);
    if (!movable.length) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const bbox = ids.reduce<BBox>(
      (b, i) => {
        const bb = render?.info[i]?.bbox;
        return bb ? { minX: Math.min(b.minX, bb.minX), minY: Math.min(b.minY, bb.minY), maxX: Math.max(b.maxX, bb.maxX), maxY: Math.max(b.maxY, bb.maxY) } : b;
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    );
    gesture.current = { kind: 'move', start: toMm(e.clientX, e.clientY), origin: Object.fromEntries(movable.map((m) => [m.id, [m.x, m.y]])), bbox };
    actions.begin();
  };

  const onPointerDownHandle = (e: React.PointerEvent, kind: 'scale' | 'rotate') => {
    e.stopPropagation();
    const el = design.elements.find((x) => x.id === selection[0]);
    if (!el || el.locked) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const p = toMm(e.clientX, e.clientY);
    const center: [number, number] = [el.x, el.y];
    gesture.current = kind === 'scale' ? { kind, center, startDist: Math.hypot(p[0] - center[0], p[1] - center[1]) || 1, el } : { kind, center, el };
    actions.begin();
  };

  const onPointerDownBg = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom: view.zoom };
      gesture.current = null;
      return;
    }
    if (e.button === 1 || e.altKey || e.pointerType === 'touch') {
      gesture.current = { kind: 'pan', start: [e.clientX, e.clientY], pan };
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      if (e.pointerType !== 'touch') return;
    }
    if (e.target === e.currentTarget || (e.target as Element).getAttribute?.('data-bg')) {
      actions.select([]);
      setEditing(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      onZoom(Math.max(0.3, Math.min(20, (pinch.current.zoom * d) / pinch.current.dist)));
      return;
    }
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'pan') {
      setPan([g.pan[0] + e.clientX - g.start[0], g.pan[1] + e.clientY - g.start[1]]);
      return;
    }
    const p = toMm(e.clientX, e.clientY);
    if (g.kind === 'move') {
      let dx = p[0] - g.start[0];
      let dy = p[1] - g.start[1];
      const found: Guide[] = [];
      if (view.snap && !e.altKey) {
        const tol = 6 / pxPerMm; // 6 screen px
        const { xs, ys } = snapTargets(Object.keys(g.origin));
        const bx = [g.bbox.minX + dx, (g.bbox.minX + g.bbox.maxX) / 2 + dx, g.bbox.maxX + dx];
        const by = [g.bbox.minY + dy, (g.bbox.minY + g.bbox.maxY) / 2 + dy, g.bbox.maxY + dy];
        let best = { d: tol, v: 0, pos: 0 };
        for (const t of xs) for (const v of bx) if (Math.abs(t - v) < best.d) best = { d: Math.abs(t - v), v: t - v, pos: t };
        if (best.d < tol) {
          dx += best.v;
          found.push({ axis: 'x', pos: best.pos });
        }
        best = { d: tol, v: 0, pos: 0 };
        for (const t of ys) for (const v of by) if (Math.abs(t - v) < best.d) best = { d: Math.abs(t - v), v: t - v, pos: t };
        if (best.d < tol) {
          dy += best.v;
          found.push({ axis: 'y', pos: best.pos });
        }
        if (!found.length && view.grid) {
          dx = round(dx, view.grid);
          dy = round(dy, view.grid);
        }
      }
      setGuides(found);
      const ids = Object.keys(g.origin);
      actions.patch(ids, (el) => ({ x: round(g.origin[el.id][0] + dx, 0.01), y: round(g.origin[el.id][1] + dy, 0.01) }));
      onFirstDrag?.();
    } else if (g.kind === 'scale') {
      const f = Math.max(0.1, Math.hypot(p[0] - g.center[0], p[1] - g.center[1]) / g.startDist);
      const el = g.el;
      if (el.type === 'text') {
        actions.patch(el.id, {
          size: Math.max(3, Math.round(el.size * f * 10) / 10),
          maxWidth: el.maxWidth ? Math.round(el.maxWidth * f * 10) / 10 : 0,
          ...(el.curve ? { curve: { ...el.curve, radius: Math.round(el.curve.radius * f * 10) / 10 } } : {}),
        } as Partial<TextElement>);
      } else actions.patch(el.id, { width: Math.max(0.5, round(el.width * f)), height: Math.max(0, round(el.height * f)) });
    } else if (g.kind === 'rotate') {
      let a = (Math.atan2(p[1] - g.center[1], p[0] - g.center[0]) * 180) / Math.PI + 90;
      a = ((a % 360) + 360) % 360;
      const snapTo = e.shiftKey ? 15 : 45;
      const near = Math.round(a / snapTo) * snapTo;
      if (e.shiftKey || Math.abs(near - a) < 3) a = near % 360;
      actions.patch(g.el.id, { rotation: Math.round(a) });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (gesture.current && gesture.current.kind !== 'pan') actions.commit();
    gesture.current = null;
    setGuides([]);
  };

  // ---------------------------------------------------------------- selection box
  const selBox = (() => {
    if (!render || !selection.length) return null;
    let b: BBox | null = null;
    for (const id of selection) {
      const bb = render.info[id]?.bbox;
      if (!bb || !Number.isFinite(bb.minX)) continue;
      b = b ? { minX: Math.min(b.minX, bb.minX), minY: Math.min(b.minY, bb.minY), maxX: Math.max(b.maxX, bb.maxX), maxY: Math.max(b.maxY, bb.maxY) } : { ...bb };
    }
    return b;
  })();
  const single = selection.length === 1 ? design.elements.find((e) => e.id === selection[0]) : undefined;
  const hs = 9 / pxPerMm; // handle size in mm
  const pad = 0.6;

  const editingEl = editing ? (design.elements.find((e) => e.id === editing) as TextElement | undefined) : undefined;
  const editBox = editingEl && render?.info[editingEl.id]?.bbox;

  const band = design.dateBand ? dateBandRect(design) : null;
  const inkHex = INK_COLORS[ink].hex;
  const gridLines: React.ReactNode[] = [];
  if (view.grid) {
    const step = view.grid;
    for (let x = step; x < W; x += step) gridLines.push(<line key={`gx${x}`} x1={x} y1={0} x2={x} y2={H} />);
    for (let y = step; y < H; y += step) gridLines.push(<line key={`gy${y}`} x1={0} y1={y} x2={W} y2={y} />);
  }
  const clipId = 'stamp-clip';

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden bg-[#F5F7FA] select-none"
      onPointerDown={onPointerDownBg}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-bg="1"
    >
      <div className="absolute inset-0 grid place-items-center" data-bg="1" style={{ transform: `translate(${pan[0]}px, ${pan[1]}px)` }}>
        <svg
          ref={svgRef}
          width={(W + 2 * MARGIN) * pxPerMm}
          height={(H + 2 * MARGIN) * pxPerMm}
          viewBox={`${-MARGIN} ${-MARGIN} ${W + 2 * MARGIN} ${H + 2 * MARGIN}`}
          className="overflow-visible"
          role="application"
          aria-label={`אזור עבודה ${W}×${H} מ״מ`}
          data-bg="1"
        >
          <defs>
            <filter id="paper-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy={0.25} stdDeviation={0.5} floodColor="#0b1426" floodOpacity="0.12" />
            </filter>
            <clipPath id={clipId}>{design.shape === 'round' ? <circle cx={W / 2} cy={H / 2} r={W / 2} /> : <rect width={W} height={H} />}</clipPath>
          </defs>
          {/* Stamp surface */}
          {design.shape === 'round' ? (
            <circle cx={W / 2} cy={H / 2} r={W / 2} fill="#fff" filter="url(#paper-shadow)" data-bg="1" />
          ) : (
            <rect width={W} height={H} rx={0.3} fill="#fff" filter="url(#paper-shadow)" data-bg="1" />
          )}
          {view.grid && (
            <g clipPath={`url(#${clipId})`} stroke="#2457ff" strokeOpacity={0.12} strokeWidth={0.04} pointerEvents="none">
              {gridLines}
            </g>
          )}
          {band && (
            <g pointerEvents="none">
              <rect x={band.x} y={band.y} width={band.w} height={band.h} fill="#f1f3f7" />
              <text x={W / 2} y={band.y + band.h / 2} fontSize={Math.min(3, band.h * 0.5)} textAnchor="middle" dominantBaseline="central" fill="#98a2b3">
                חלון תאריך
              </text>
            </g>
          )}
          {view.safeArea &&
            (design.shape === 'round' ? (
              <circle cx={W / 2} cy={H / 2} r={W / 2 - safeMargin} fill="none" stroke="#2457ff" strokeOpacity={0.35} strokeWidth={0.08} strokeDasharray="0.6 0.5" pointerEvents="none">
                <title>מומלץ להשאיר תוכן בתוך אזור זה</title>
              </circle>
            ) : (
              <rect x={safeMargin} y={safeMargin} width={W - 2 * safeMargin} height={H - 2 * safeMargin} fill="none" stroke="#2457ff" strokeOpacity={0.35} strokeWidth={0.08} strokeDasharray="0.6 0.5" pointerEvents="none">
                <title>מומלץ להשאיר תוכן בתוך אזור זה</title>
              </rect>
            ))}
          {/* Artwork */}
          <g fill={inkHex}>
            {render?.items.map((it) => {
              const el = design.elements.find((e) => e.id === it.id);
              const locked = !el || el.locked;
              const common = {
                key: it.id,
                onPointerDown: el ? (e: React.PointerEvent) => onPointerDownItem(e, it.id) : undefined,
                onDoubleClick: el?.type === 'text' ? () => setEditing(it.id) : undefined,
                style: { cursor: el ? (locked ? 'default' : 'move') : 'default' },
                className: 'animate-pop [transform-box:fill-box] [transform-origin:center]',
              };
              return it.kind === 'path' ? (
                <path {...common} d={toSvgD(it.path)} fillRule={it.fillRule} opacity={editing === it.id ? 0.25 : 1} />
              ) : (
                <image {...common} href={it.href} width={1} height={1} preserveAspectRatio="none" transform={`matrix(${it.matrix.join(' ')})`} />
              );
            })}
            {/* Transparent hit areas for thin/small elements */}
            {render &&
              design.elements
                .filter((el) => !el.hidden && render.info[el.id] && Number.isFinite(render.info[el.id].bbox.minX))
                .map((el) => {
                  const b = render.info[el.id].bbox;
                  return (
                    <rect
                      key={`hit-${el.id}`}
                      x={b.minX - 0.3}
                      y={b.minY - 0.3}
                      width={b.maxX - b.minX + 0.6}
                      height={b.maxY - b.minY + 0.6}
                      fill="transparent"
                      onPointerDown={(e) => onPointerDownItem(e, el.id)}
                      onDoubleClick={el.type === 'text' ? () => setEditing(el.id) : undefined}
                      style={{ cursor: el.locked ? 'default' : 'move' }}
                      aria-label={el.type === 'text' ? el.text : el.type}
                    />
                  );
                })}
          </g>
          {/* Issue markers */}
          {render &&
            Object.entries(issuesById).map(([id, sev]) => {
              const b = render.info[id]?.bbox;
              if (!b || !Number.isFinite(b.minX) || selection.includes(id)) return null;
              return (
                <rect
                  key={`iss-${id}`}
                  x={b.minX - 0.4}
                  y={b.minY - 0.4}
                  width={b.maxX - b.minX + 0.8}
                  height={b.maxY - b.minY + 0.8}
                  fill="none"
                  stroke={sev === 'error' ? '#d6283b' : '#d98a00'}
                  strokeWidth={1.2 / pxPerMm}
                  strokeDasharray={`${3 / pxPerMm} ${2 / pxPerMm}`}
                  pointerEvents="none"
                />
              );
            })}
          {/* Smart guides */}
          {guides.map((g, i) =>
            g.axis === 'x' ? (
              <line key={i} x1={g.pos} x2={g.pos} y1={-MARGIN} y2={H + MARGIN} stroke="#2457ff" strokeOpacity={0.6} strokeWidth={1 / pxPerMm} pointerEvents="none" />
            ) : (
              <line key={i} y1={g.pos} y2={g.pos} x1={-MARGIN} x2={W + MARGIN} stroke="#2457ff" strokeOpacity={0.6} strokeWidth={1 / pxPerMm} pointerEvents="none" />
            ),
          )}
          {/* Selection */}
          {selBox && (
            <g>
              <rect
                x={selBox.minX - pad}
                y={selBox.minY - pad}
                width={selBox.maxX - selBox.minX + 2 * pad}
                height={selBox.maxY - selBox.minY + 2 * pad}
                fill="none"
                stroke="#2457ff"
                strokeWidth={1.2 / pxPerMm}
                pointerEvents="none"
              />
              {single && !single.locked && (
                <>
                  {[
                    [selBox.minX - pad, selBox.minY - pad],
                    [selBox.maxX + pad, selBox.minY - pad],
                    [selBox.maxX + pad, selBox.maxY + pad],
                    [selBox.minX - pad, selBox.maxY + pad],
                  ].map(([x, y], i) => (
                    <rect
                      key={i}
                      x={x - hs / 2}
                      y={y - hs / 2}
                      width={hs}
                      height={hs}
                      rx={hs * 0.2}
                      fill="#fff"
                      stroke="#2457ff"
                      strokeWidth={1.2 / pxPerMm}
                      style={{ cursor: i % 2 ? 'nesw-resize' : 'nwse-resize' }}
                      onPointerDown={(e) => onPointerDownHandle(e, 'scale')}
                      aria-label="שינוי גודל"
                    />
                  ))}
                  <line
                    x1={(selBox.minX + selBox.maxX) / 2}
                    x2={(selBox.minX + selBox.maxX) / 2}
                    y1={selBox.minY - pad}
                    y2={selBox.minY - pad - 14 / pxPerMm}
                    stroke="#2457ff"
                    strokeWidth={1 / pxPerMm}
                  />
                  <circle
                    cx={(selBox.minX + selBox.maxX) / 2}
                    cy={selBox.minY - pad - 14 / pxPerMm}
                    r={hs / 2}
                    fill="#fff"
                    stroke="#2457ff"
                    strokeWidth={1.2 / pxPerMm}
                    style={{ cursor: 'grab' }}
                    onPointerDown={(e) => onPointerDownHandle(e, 'rotate')}
                    aria-label="סיבוב"
                  />
                </>
              )}
            </g>
          )}
          {/* Dimension labels */}
          <text x={W / 2} y={H + 3.2} fontSize={11 / pxPerMm} textAnchor="middle" fill="#5b6678" pointerEvents="none">
            {design.shape === 'round' ? `⌀ ${W} mm` : `${W} mm`}
          </text>
          {design.shape !== 'round' && (
            <text x={-2.2} y={H / 2} fontSize={11 / pxPerMm} textAnchor="middle" fill="#5b6678" transform={`rotate(-90 ${-2.2} ${H / 2})`} pointerEvents="none">
              {H} mm
            </text>
          )}
        </svg>
      </div>

      {editingEl && editBox && svgRef.current && (
        <InlineTextEditor
          el={editingEl}
          box={editBox}
          svg={svgRef.current}
          onChange={(text) => actions.patch(editingEl.id, { text } as Partial<TextElement>)}
          onBegin={actions.begin}
          onDone={() => {
            actions.commit();
            setEditing(null);
          }}
        />
      )}
      <span className="sr-only" aria-live="polite">
        {fitZoom ? '' : ''}
      </span>
    </div>
  );
}

function InlineTextEditor({
  el,
  box,
  svg,
  onChange,
  onBegin,
  onDone,
}: {
  el: TextElement;
  box: BBox;
  svg: SVGSVGElement;
  onChange: (t: string) => void;
  onBegin: () => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const ctm = svg.getScreenCTM();
  const wrap = svg.closest('[data-bg]')?.getBoundingClientRect();
  useEffect(() => {
    onBegin();
    ref.current?.focus();
    ref.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ctm || !wrap) return null;
  const x = ctm.a * box.minX + ctm.e - wrap.left;
  const y = ctm.d * box.maxY + ctm.f - wrap.top + 8;
  return (
    <div className="absolute z-20 animate-pop" style={{ left: Math.max(8, x), top: y }}>
      <textarea
        ref={ref}
        dir="auto"
        defaultValue={el.text}
        rows={Math.max(1, el.text.split('\n').length)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onDone}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) onDone();
          e.stopPropagation();
        }}
        className="input min-w-56 shadow-lift"
        aria-label="עריכת טקסט"
      />
      <p className="mt-1 text-[11px] text-muted">Enter לשורה חדשה · Esc לסיום</p>
    </div>
  );
}
