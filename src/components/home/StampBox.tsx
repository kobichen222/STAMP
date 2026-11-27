'use client';

import { useState } from 'react';
import { STAMP_EXAMPLES, type StampExample } from './stamp-examples';

/**
 * The home page's single action: write what should be on the stamp.
 * Rendered twice (first screen and closing section), so every id is built from `idPrefix`.
 */
export function StampBox({ idPrefix, onPick }: { idPrefix: string; onPick?: (example: StampExample) => void }) {
  const [text, setText] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const textId = `${idPrefix}-text`;

  const pick = (ex: StampExample) => {
    setText(ex.lines.join('\n'));
    setActive(ex.id);
    onPick?.(ex);
  };

  return (
    <form
      data-stamp-box
      onSubmit={(e) => {
        // Not wired yet by the owner's decision: the stamp chat will be connected here in a later stage.
        e.preventDefault();
      }}
    >
      <div className="card p-4 shadow-soft sm:p-5">
        <label htmlFor={textId} className="label !text-base !font-bold !text-ink">
          מה לכתוב בחותמת?
        </label>
        <textarea
          id={textId}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="לדוגמה: ישראל ישראלי, עורך דין, מ.ר. 12345, הרצל 1 תל אביב, 050-1234567"
          className="input resize-y !text-[17px] leading-7"
        />
        <div className="mt-3 flex justify-end">
          <button type="submit" className="btn-primary btn-lg w-full font-bold sm:w-auto">
            הכינו לי חותמת
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="דוגמאות לטקסט">
        <span className="text-sm text-muted">דוגמה:</span>
        {STAMP_EXAMPLES.map((ex) => (
          <button key={ex.id} type="button" aria-pressed={active === ex.id} onClick={() => pick(ex)} className={`chip ${active === ex.id ? 'chip-on' : ''}`}>
            {ex.label}
          </button>
        ))}
      </div>
    </form>
  );
}
