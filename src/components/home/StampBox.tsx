'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

const PLACEHOLDER = 'לדוגמה: ישראל ישראלי, עורך דין, מ.ר. 12345, הרצל 1 תל אביב, 050-1234567';

/**
 * The home page's single action, styled like a chat input: one growing line and a round send arrow.
 * Rendered twice (first screen and closing section), so every id is built from `idPrefix`.
 */
export function StampBox({ idPrefix, focusOnLoad = false, onBlue = false }: { idPrefix: string; focusOnLoad?: boolean; onBlue?: boolean }) {
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

  // Desktop only (fine pointer + hover), so a phone keyboard never opens by itself; and only when the
  // page was opened at its top without a hash, so a visitor arriving at /#stamps is not pulled away.
  useEffect(() => {
    if (!focusOnLoad || window.location.hash || window.scrollY > 0) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    area.current?.focus({ preventScroll: true });
  }, [focusOnLoad]);

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
      {/* On the blue band a blue ring would vanish: a white outline with a gap shows focus instead. */}
      <div
        className={`flex items-end gap-2 rounded-2xl border bg-white p-2 ps-4 transition ${
          onBlue
            ? 'border-white shadow-lift focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-white'
            : 'border-line shadow-soft focus-within:border-blue focus-within:ring-4 focus-within:ring-blue/10'
        }`}
      >
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
