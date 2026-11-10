'use client';

import { Icon } from '@/components/ui/Icon';
import type { PanelId } from './context';
import { useEditor } from './context';

/** Edit / lock / delete for whatever element was tapped – shown on every selection. */
export function ElementActions({ compact = false }: { compact?: boolean }) {
  const { selected, actions, openPanel, setFocusTextId } = useEditor();
  if (!selected.length) return null;
  const el = selected[0];
  const ids = selected.map((s) => s.id);
  const locked = selected.some((s) => s.locked);
  const panel: PanelId = el.type === 'text' ? 'text' : el.type === 'image' ? 'logo' : 'elements';
  const kind = selected.length > 1 ? `${selected.length} פריטים` : el.type === 'text' ? 'טקסט' : el.type === 'image' ? 'לוגו / תמונה' : 'צורה';

  const chip =
    'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95 disabled:opacity-40 disabled:active:scale-100';
  return (
    <div
      className={`flex animate-pop items-center gap-1 rounded-full border border-line bg-white/95 p-1 shadow-lift backdrop-blur ${compact ? '' : 'ps-3'}`}
      role="toolbar"
      aria-label={`פעולות על ${kind}`}
    >
      {!compact && <span className="me-1 text-xs font-medium text-muted">{kind}</span>}
      {selected.length === 1 && (
        <button
          type="button"
          className={`${chip} bg-blue text-white hover:bg-blue-600`}
          disabled={locked}
          onClick={() => {
            if (el.type === 'text') setFocusTextId(el.id);
            openPanel(panel);
          }}
        >
          <Icon name="edit" size={16} /> עריכה
        </button>
      )}
      <button
        type="button"
        aria-pressed={locked}
        className={`${chip} ${locked ? 'bg-blue-50 text-blue' : 'text-ink-2 hover:bg-surface'}`}
        onClick={() => actions.patch(ids, { locked: !locked })}
      >
        <Icon name={locked ? 'lock' : 'unlock'} size={16} /> {locked ? 'נעול' : 'נעילה'}
      </button>
      <button type="button" className={`${chip} text-bad hover:bg-bad/10`} disabled={locked} onClick={() => actions.remove(ids)}>
        <Icon name="trash" size={16} /> מחיקה
      </button>
    </div>
  );
}
