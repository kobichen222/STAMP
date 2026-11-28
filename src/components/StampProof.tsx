'use client';

import { useMemo, useRef, useState } from 'react';
import { StampThumb } from '@/components/StampThumb';
import { Icon } from '@/components/ui/Icon';
import type { Design, InkColor } from '@/designer/types';
import { stampProofText } from '@/lib/stamp-proof-text';

/**
 * A cart line's proof: the stamp big enough to read (never mirrored, in its ink), its text as plain selectable lines,
 * and a tap on the picture opens it large in a modal <dialog>. Used by the cart and the checkout summary.
 */
export function StampProof({ svg, ink, design, name }: { svg: string; ink: InkColor; design: Design; name: string }) {
  const lines = useMemo(() => stampProofText(design), [design]);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // the large copy of the picture is in the page only while the dialog is open
  const [big, setBig] = useState(false);

  const open = () => {
    setBig(true);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  return (
    <div className="min-w-0">
      {svg ? (
        <button
          ref={trigger}
          type="button"
          aria-label="הגדלת ההגהה"
          className="relative grid w-full cursor-zoom-in place-items-center rounded-xl bg-[#fdfcf8] p-3 transition hover:ring-2 hover:ring-blue/20"
          onClick={open}
        >
          <StampThumb svg={svg} ink={ink} alt="" className="h-auto w-[200px] max-w-full" />
          <span className="absolute end-2 top-2 rounded-full bg-white/90 p-1 text-muted shadow-sm" aria-hidden>
            <Icon name="fit" size={14} />
          </span>
        </button>
      ) : (
        <div className="h-28 w-full rounded-xl bg-surface" />
      )}

      {lines.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted">הטקסט על החותמת</p>
          <ul className="mt-1 space-y-0.5 text-sm font-medium select-text">
            {lines.map((l, k) => (
              <li key={k} dir="auto" className="break-words">
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}

      {svg && (
        <dialog
          ref={dialog}
          aria-label={name}
          className="m-auto max-h-[92vh] w-[min(92vw,56rem)] overflow-auto rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-ink/70"
          onClose={() => {
            setBig(false);
            trigger.current?.focus();
          }}
          // a click on the backdrop (outside the inner box) closes it
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="p-4 sm:p-6">
            <div className="grid place-items-center rounded-xl bg-[#fdfcf8] p-4 sm:p-8">
              {big && <StampThumb svg={svg} ink={ink} className="h-auto max-h-[70vh] w-full object-contain" />}
            </div>
            <div className="mt-4 flex justify-center">
              <button type="button" className="btn-outline" onClick={close}>
                <Icon name="close" size={16} /> סגירה
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
