'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Msg } from '@/stamp-bot/form';

/** One stamp under the home page box: its own conversation with the bot, its own image. */
export type StampCardData = {
  id: string;
  msgs: Msg[];
  svg: string;
  form?: string;
  reply: string;
  err: string;
  busy: boolean; // waiting in the queue or running
  fixOpen: boolean;
};

export function StampCard({
  card,
  inputId,
  onToggleFix,
  onFix,
  onRemove,
}: {
  card: StampCardData;
  inputId: string;
  onToggleFix: () => void;
  onFix: (text: string) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  // Focus only when the customer opened the row, not when it opened by itself after a question.
  const wantFocus = useRef(false);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (wantFocus.current) {
      wantFocus.current = false;
      el.focus();
    }
  }, [text, card.fixOpen]);

  function send() {
    const t = text.trim();
    if (!t || card.busy) return;
    setText('');
    onFix(t);
  }

  return (
    <li className="card flex flex-col p-4">
      {(card.svg || card.busy) && (
        <div className="grid aspect-[3/2] place-items-center rounded-xl bg-[#fdfcf8] p-4">
          {card.svg ? (
            <img
              src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(card.svg)}
              alt="החותמת שלכם"
              className={`h-full w-full object-contain transition ${card.busy ? 'opacity-40' : ''}`}
            />
          ) : (
            <div className="h-full w-full animate-pulse rounded-lg bg-line/40" />
          )}
        </div>
      )}

      {card.busy ? (
        <p className="mt-3 text-sm text-muted">מכינים את החותמת…</p>
      ) : card.err ? (
        <p className="mt-3 text-sm font-medium text-bad">{card.err}</p>
      ) : (
        card.reply && <p className="mt-3 text-sm text-muted">{card.reply}</p>
      )}

      {card.fixOpen && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
            מה לשנות בחותמת הזו?
          </label>
          <div className="flex items-end gap-2 rounded-xl border border-line bg-white p-1.5 ps-3 transition focus-within:border-blue focus-within:ring-4 focus-within:ring-blue/10">
            <textarea
              ref={area}
              id={inputId}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              className="max-h-28 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent py-1 text-[15px] leading-6 outline-none focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={card.busy}
              aria-label="שליחת התיקון"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue text-white transition hover:bg-blue-600 active:scale-[0.96] disabled:opacity-60"
            >
              <Icon name="arrowLeft" size={16} strokeWidth={2.25} />
            </button>
          </div>
        </form>
      )}

      <div className="mt-auto flex gap-4 pt-3 text-sm font-medium">
        <button
          type="button"
          aria-expanded={card.fixOpen}
          aria-controls={card.fixOpen ? inputId : undefined}
          onClick={() => {
            wantFocus.current = !card.fixOpen;
            onToggleFix();
          }}
          className="text-blue hover:underline"
        >
          תיקון
        </button>
        <button type="button" onClick={onRemove} className="text-muted hover:text-ink hover:underline">
          הסרה
        </button>
      </div>
    </li>
  );
}
