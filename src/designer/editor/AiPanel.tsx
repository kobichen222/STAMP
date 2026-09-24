'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { composeForProduction } from '../autofix';
import { renderDesign } from '../render';
import { StampSvg } from '../StampSvg';
import { missingRequired, requiredLine, type RequiredItem, type Suggestion } from '../suggest';
import { isProductionReady, validateDesign } from '../validate';
import { Section } from './controls';
import { useEditor } from './context';

const KIND_LABEL: Record<RequiredItem['kind'], string> = { name: 'שם', phone: 'טלפון', email: 'מייל', url: 'אתר', number: 'מספר', address: 'כתובת', quote: 'טקסט' };

function SuggestionCard({ s, required, onApply }: { s: Suggestion; required: RequiredItem[]; onApply: () => void }) {
  const { model, resolveFace, design, profile } = useEditor();
  // Preview exactly what applying produces – strict: never drops customer text.
  const r = useMemo(() => renderDesign(composeForProduction(model, s.content, s.style, resolveFace, profile, { strict: true }).design, resolveFace), [model, s, resolveFace, profile]);
  const missing = missingRequired(s.content, required);
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-sm font-semibold">
          {s.title}
          {required.length > 0 && (
            <span className={`ms-2 text-[11px] font-medium ${missing.length ? 'text-bad' : 'text-ok'}`}>
              {missing.length ? `חסר: ${missing.map((m) => m.value).join(', ')}` : `✓ כל ${required.length} הפרטים`}
            </span>
          )}
        </span>
        <button type="button" className="btn-primary btn-sm" onClick={onApply}>
          החל את העיצוב
        </button>
      </div>
      <div className="mt-2 grid place-items-center rounded-lg bg-surface p-2">
        <StampSvg render={r} ink={design.inkColor} className="max-h-36 w-full" pad={0.8} />
      </div>
    </div>
  );
}

export function AiPanel() {
  const { model, actions, design, toast, improve, resolveFace, profile } = useEditor();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [required, setRequired] = useState<RequiredItem[]>([]);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/ai-design/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, shape: model.shape, width: model.width, height: model.height }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.suggestions);
      setRequired(data.required ?? []);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'משהו השתבש, נסו שוב');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section>
        <label className="block">
          <span className="label">תארו את החותמת שאתם צריכים</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="input text-sm"
            placeholder={"לדוגמה: חותמת לעורך דין בשם יעקב כהן, מ.ר. 54321, טלפון 052-1234567\n\nאו כתבו כל שורה בשורה נפרדת – והיא תופיע בדיוק כך."}
          />
        </label>
        <button type="button" className="btn-primary mt-3 w-full" disabled={busy || prompt.trim().length < 4} onClick={run}>
          <Icon name="sparkles" size={18} /> {busy ? 'מעצב…' : 'צור 3 הצעות'}
        </button>
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      </Section>
      {items && (
        <div className="space-y-3 p-4 pt-0">
          {required.length > 0 && (
            <div className="rounded-xl bg-surface p-3">
              <p className="text-xs font-semibold text-ink-2">הפרטים שביקשתם – יופיעו בדיוק כך:</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {required.map((r) => (
                  <li key={r.value} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-line">
                    <Icon name="check" size={12} className="text-ok" />
                    <span className="text-muted">{KIND_LABEL[r.kind]}:</span>
                    <bdi className="font-medium">{requiredLine(r)}</bdi>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {items.map((s) => (
            <SuggestionCard
              key={s.title}
              s={s}
              required={required}
              onApply={() => {
                const logo = design.elements.find((e) => e.type === 'image');
                // Strict: every word the customer asked for stays on the stamp.
                const next = composeForProduction(model, { ...s.content, logo: logo && logo.type === 'image' ? logo : null }, s.style, resolveFace, profile, { strict: true }).design;
                actions.set({ ...next, inkColor: design.inkColor, modelId: design.modelId });
                const ready = isProductionReady(validateDesign(next, renderDesign(next, resolveFace), profile));
                toast(ready ? 'ההצעה הוחלה – כל הפרטים על החותמת' : 'כל הפרטים על החותמת, אבל הטקסט צפוף – מומלץ דגם גדול יותר');
              }}
            />
          ))}
        </div>
      )}
      <Section title="שפר את הסידור">
        <p className="mb-3 text-xs text-muted">כבר עיצבתם? נסדר מחדש יישור, ריווח, היררכיה ושוליים.</p>
        <div className="grid grid-cols-3 gap-2">
          {(['classic', 'modern', 'minimal'] as const).map((s) => (
            <button key={s} type="button" className="btn-outline btn-sm" onClick={() => improve(s)}>
              {{ classic: 'קלאסי', modern: 'מודרני', minimal: 'מינימלי' }[s]}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}
