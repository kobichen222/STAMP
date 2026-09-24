'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { designsStore } from '@/lib/designs-store';
import { formatDate } from '@/lib/format';
import { fillPlaceholders } from '../compose';
import { formatSize } from '../models';
import { renderDesign } from '../render';
import { StampSvg } from '../StampSvg';
import { INK_COLORS, type InkColor, type TextElement } from '../types';
import { isProductionReady, validateDesign } from '../validate';
import { Section, Segmented } from './controls';
import { useEditor } from './context';
import { productSwitcher } from './Editor';

/** Minimal CSV parser (quotes, commas, semicolons, tabs). */
export function parseCsv(text: string): string[][] {
  const delim = [',', ';', '\t'].sort((a, b) => text.split(b).length - text.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function BulkVariations() {
  const { design, resolveFace, profile, addVariants } = useEditor();
  const texts = design.elements.filter((e): e is TextElement => e.type === 'text');
  const [rows, setRows] = useState<string[][] | null>(null);
  const [map, setMap] = useState<Record<string, number>>({});
  const headers = rows?.[0] ?? [];
  const variants = useMemo(() => {
    if (!rows) return [];
    return rows.slice(1).map((r) => {
      const d = {
        ...design,
        elements: design.elements.map((e) => (e.type === 'text' && map[e.id] != null && map[e.id] >= 0 ? { ...e, text: r[map[e.id]] ?? '' } : e)),
      };
      return fillPlaceholders(d, Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
    });
  }, [rows, map, design, headers]);
  const renders = useMemo(() => variants.map((v) => renderDesign(v, resolveFace)), [variants, resolveFace]);
  const readyCount = renders.filter((r, i) => isProductionReady(validateDesign(variants[i], r, profile))).length;

  return (
    <Section title="הזמנה מרובה (CSV)">
      <p className="text-xs leading-5 text-muted">
        לעובדי חברה: העלו קובץ CSV (אפשר לשמור מ־Excel) עם עמודות כמו שם, תפקיד, טלפון. כל שורה הופכת לחותמת נפרדת באותו עיצוב.
      </p>
      <label className="btn-outline btn-sm mt-3 w-full cursor-pointer">
        <Icon name="upload" size={16} /> העלאת CSV
        <input
          type="file"
          accept=".csv,text/csv,.txt"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const parsed = parseCsv(await f.text());
            setRows(parsed);
            setMap(Object.fromEntries(texts.map((t, i) => [t.id, i < (parsed[0]?.length ?? 0) ? i : -1])));
          }}
        />
      </label>
      {rows && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold">מיפוי עמודות → שורות בחותמת</p>
          {texts.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-xs">
              <span className="w-24 truncate text-muted">{t.text.split('\n')[0]}</span>
              <select className="input !py-1 text-xs" value={map[t.id] ?? -1} onChange={(e) => setMap({ ...map, [t.id]: +e.target.value })}>
                <option value={-1}>ללא שינוי</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">
            {renders.map((r, i) => (
              <div key={i} className="rounded-lg border border-line bg-white p-1">
                <StampSvg render={r} className="w-full" pad={0.5} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            {variants.length} וריאציות · {readyCount} מוכנות לייצור
          </p>
          <button type="button" className="btn-primary btn-sm w-full" disabled={!variants.length || readyCount < variants.length} onClick={() => addVariants(variants)}>
            אשר הכול והוסף לסל
          </button>
        </div>
      )}
    </Section>
  );
}

function VersionHistory() {
  const { designId, actions } = useEditor();
  const saved = designsStore.use().find((d) => d.id === designId);
  if (!saved?.versions.length) return null;
  return (
    <Section title="היסטוריית גרסאות">
      <ul className="space-y-1">
        {saved.versions.slice(0, 8).map((v) => (
          <li key={v.at} className="flex items-center justify-between text-sm">
            <span className="tabular-nums text-muted">{formatDate(v.at)}</span>
            <button type="button" className="text-blue hover:underline" onClick={() => actions.set(v.design)}>
              חזור לגרסה זו
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function SettingsPanel() {
  const { design, actions, view, setView, advanced, setAdvanced, improve } = useEditor();
  const products = productSwitcher.products;
  return (
    <>
      <Section title="מוצר ומידה">
        <select className="input !py-2 text-sm" value={productSwitcher.current} onChange={(e) => productSwitcher.onChange(e.target.value)} aria-label="החלפת מוצר">
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title} · {formatSize(p.model)}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">החלפת מוצר פותחת עיצוב חדש במידות המוצר. העיצוב הנוכחי נשמר ב״העיצובים שלי״.</p>
      </Section>
      <Section title="צבע דיו">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(INK_COLORS) as InkColor[]).map((k) => (
            <button key={k} type="button" onClick={() => actions.set({ ...design, inkColor: k })} aria-pressed={design.inkColor === k} className={`chip ${design.inkColor === k ? '!border-ink' : ''}`}>
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: INK_COLORS[k].hex }} />
              {INK_COLORS[k].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">קובץ הייצור תמיד בשחור; צבע הדיו נשמר בהזמנה.</p>
      </Section>
      <Section title="שפר את הסידור">
        <div className="grid grid-cols-3 gap-2">
          {(['classic', 'modern', 'minimal'] as const).map((s) => (
            <button key={s} type="button" className="btn-outline btn-sm" onClick={() => improve(s)}>
              {{ classic: 'קלאסי', modern: 'מודרני', minimal: 'מינימלי' }[s]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">מסדר מחדש יישור, ריווח, היררכיה ושוליים – שומר על הטקסט והלוגו שלכם.</p>
      </Section>
      <Section title="תצוגה">
        <div className="space-y-3 text-[13px]">
          <label className="flex items-center justify-between">
            אזור בטוח (Safe Area)
            <input type="checkbox" className="h-4 w-4 accent-blue" checked={view.safeArea} onChange={(e) => setView((v) => ({ ...v, safeArea: e.target.checked }))} />
          </label>
          <label className="flex items-center justify-between">
            הצמדה חכמה (Snapping)
            <input type="checkbox" className="h-4 w-4 accent-blue" checked={view.snap} onChange={(e) => setView((v) => ({ ...v, snap: e.target.checked }))} />
          </label>
          <div className="flex items-center justify-between">
            רשת (Grid)
            <Segmented
              label="רשת"
              value={String(view.grid)}
              onChange={(v) => setView((s) => ({ ...s, grid: v === 'false' ? false : (Number(v) as 0.5 | 1 | 2) }))}
              options={[
                { value: 'false', label: 'כבוי' },
                { value: '0.5', label: '0.5' },
                { value: '1', label: '1' },
                { value: '2', label: '2 מ״מ' },
              ]}
            />
          </div>
          <label className="flex items-center justify-between">
            מצב מתקדם (מיקום, שכבות, צורות)
            <input type="checkbox" className="h-4 w-4 accent-blue" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />
          </label>
        </div>
      </Section>
      <VersionHistory />
      <BulkVariations />
    </>
  );
}
