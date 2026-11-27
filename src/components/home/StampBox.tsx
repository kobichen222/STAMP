'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { stampTurn, warmStamps } from '@/stamp-bot/api';
import type { Msg } from '@/stamp-bot/form';

const PLACEHOLDER = 'לדוגמה: ישראל ישראלי, עורך דין, מ.ר. 12345, הרצל 1 תל אביב, 050-1234567';

// The box is rendered twice on the page; the model processes need booting only once per page.
let warmed = false;

/**
 * The home page's single action, styled like a chat input: one growing line and a round send arrow.
 * Rendered twice (first screen and closing section), so every id is built from `idPrefix`.
 */
export function StampBox({ idPrefix, focusOnLoad = false }: { idPrefix: string; focusOnLoad?: boolean }) {
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [reply, setReply] = useState('');
  const [stamp, setStamp] = useState<{ svg: string; form: string } | null>(null);
  // A ref as well as state: two quick Enters can land before the re-render that disables the button.
  const running = useRef(false);
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

  async function send() {
    const t = text.trim();
    if (!t || running.current) return;
    running.current = true;
    // Every customer message carries the form as it is on screen now, so the model continues from it.
    // On an error the customer message stays in the list, as in the reference client.
    const next: Msg[] = [...msgs, { role: 'user', text: t, form: stamp?.form }];
    setMsgs(next);
    setText('');
    setErr('');
    setBusy(true);
    try {
      const res = await stampTurn(next);
      if (res.err) setErr(res.msg);
      else {
        setMsgs([...next, { role: 'ai', text: res.text, form: res.shown?.form }]);
        setReply(res.text);
        if (res.shown) setStamp({ svg: res.shown.svg, form: res.shown.form });
      }
    } catch {
      setErr('הבוט לא זמין כרגע');
    }
    running.current = false;
    setBusy(false);
  }

  const showing = busy || err || reply || stamp;

  return (
    <form
      data-stamp-box
      onSubmit={(e) => {
        e.preventDefault();
        void send();
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
          onChange={(e) => {
            if (!warmed) {
              warmed = true;
              warmStamps().catch(() => {});
            }
            setText(e.target.value);
          }}
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
          disabled={busy}
          aria-label="הכינו לי חותמת"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue text-white transition hover:bg-blue-600 active:scale-[0.96] disabled:opacity-60"
        >
          <Icon name="arrowLeft" size={20} strokeWidth={2.25} />
        </button>
      </div>
      <div aria-live="polite">
        {showing && (
          <div className="mt-4 space-y-3">
            {busy ? (
              <p className="text-center text-sm text-muted">מכינים את החותמת…</p>
            ) : err ? (
              <p className="text-center text-sm font-medium text-ink">{err}</p>
            ) : (
              reply && <p className="text-center text-sm text-muted">{reply}</p>
            )}
            {stamp && (
              <div className="flex justify-center">
                <div className="w-full max-w-xs rounded-2xl bg-white p-4 ring-1 ring-line">
                  <img
                    src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stamp.svg)}
                    alt="החותמת שלכם"
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
