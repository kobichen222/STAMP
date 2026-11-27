'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const PLACEHOLDER = 'לדוגמה: ישראל ישראלי, עורך דין, מ.ר. 12345, הרצל 1 תל אביב, 050-1234567';

/**
 * The home page's single action, styled like a chat input: one growing line and a round send arrow.
 * Rendered twice (first screen and closing section), so every id is built from `idPrefix`.
 */
export function StampBox({ idPrefix }: { idPrefix: string }) {
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const textId = `${idPrefix}-text`;

  // Grow with the text (the CSS max height caps it at about five lines, then it scrolls).
  // While empty, size to the example placeholder so it is never cut off on narrow screens.
  const grow = useCallback(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    if (el.value) {
      el.style.height = `${el.scrollHeight}px`;
      return;
    }
    el.value = PLACEHOLDER;
    const h = el.scrollHeight;
    el.value = '';
    el.style.height = `${h}px`;
  }, []);

  useEffect(() => {
    grow();
    window.addEventListener('resize', grow);
    return () => window.removeEventListener('resize', grow);
  }, [grow]);
  useEffect(grow, [text, grow]);

  return (
    <form
      data-stamp-box
      onSubmit={(e) => {
        // Not wired yet by the owner's decision: the stamp chat will be connected here in a later stage.
        e.preventDefault();
      }}
    >
      <label htmlFor={textId} className="sr-only">
        מה לכתוב בחותמת?
      </label>
      <div className="flex items-end gap-2 rounded-2xl border border-line bg-white p-2 ps-4 shadow-soft transition focus-within:border-blue focus-within:ring-4 focus-within:ring-blue/10">
        <textarea
          ref={area}
          id={textId}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter starts a new line.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={PLACEHOLDER}
          className="max-h-40 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-[17px] leading-7 outline-none placeholder:text-muted/70 focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label="הכינו לי חותמת"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue text-white transition hover:bg-blue-600 active:scale-[0.96]"
        >
          <Icon name="arrowLeft" size={20} strokeWidth={2.25} />
        </button>
      </div>
    </form>
  );
}
