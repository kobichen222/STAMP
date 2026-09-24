'use client';

import { FONT_FAMILIES } from '../fonts';
import type { TextElement } from '../types';
import { IconButton } from './controls';
import { useEditor } from './context';

/** Quick actions for the current selection, floating above the canvas. */
export function FloatingToolbar() {
  const { selected, actions } = useEditor();
  const el = selected[0];
  if (!el) return null;
  const text = selected.length === 1 && el.type === 'text' ? (el as TextElement) : null;
  const ids = selected.map((s) => s.id);
  return (
    <div className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 animate-pop items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-lift" role="toolbar" aria-label="פעולות מהירות">
      {text && (
        <>
          <select
            value={text.font}
            onChange={(e) => actions.patch(text.id, { font: e.target.value })}
            className="hidden h-9 max-w-36 rounded-lg bg-transparent px-2 text-sm outline-none hover:bg-surface sm:block"
            aria-label="גופן"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label.split(' (')[0]}
              </option>
            ))}
          </select>
          <IconButton icon="minus" label="הקטן גופן" onClick={() => actions.patch(text.id, { size: Math.max(4, text.size - 0.5) })} size={16} />
          <span className="w-9 text-center text-sm tabular-nums">{text.size}</span>
          <IconButton icon="plus" label="הגדל גופן" onClick={() => actions.patch(text.id, { size: text.size + 0.5 })} size={16} />
          <IconButton icon="bold" label="מודגש" onClick={() => actions.patch(text.id, { bold: !text.bold })} className={text.bold ? 'bg-blue-50 !text-blue' : ''} />
          <IconButton
            icon={text.align === 'right' ? 'alignRight' : text.align === 'left' ? 'alignLeft' : 'alignCenter'}
            label="יישור"
            onClick={() => actions.patch(text.id, { align: text.align === 'right' ? 'center' : text.align === 'center' ? 'left' : 'right' })}
          />
          <span className="mx-0.5 h-6 w-px bg-line" />
        </>
      )}
      <IconButton icon={el.locked ? 'lock' : 'unlock'} label={el.locked ? 'שחרר נעילה' : 'נעל'} onClick={() => actions.patch(ids, { locked: !el.locked })} className={el.locked ? '!text-blue' : ''} />
      <IconButton icon="copy" label="שכפל (Ctrl+D)" onClick={() => actions.duplicate(ids)} />
      <IconButton icon="trash" label="מחק (Delete)" onClick={() => actions.remove(ids)} disabled={el.locked} />
    </div>
  );
}
