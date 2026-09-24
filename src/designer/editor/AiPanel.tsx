'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { composeLayout } from '../compose';
import { renderDesign } from '../render';
import { StampSvg } from '../StampSvg';
import type { Suggestion } from '../suggest';
import { Section } from './controls';
import { useEditor } from './context';

function SuggestionCard({ s, onApply }: { s: Suggestion; onApply: () => void }) {
  const { model, resolveFace, design } = useEditor();
  const r = useMemo(() => renderDesign(composeLayout(model, s.content, s.style), resolveFace), [model, s, resolveFace]);
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{s.title}</span>
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
  const { model, actions, design, toast, improve } = useEditor();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Suggestion[] | null>(null);
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
            rows={4}
            className="input text-sm"
            placeholder="לדוגמה: אני צריך חותמת לעורך דין בשם יעקב כהן, עם טלפון ומספר רישיון"
          />
        </label>
        <button type="button" className="btn-primary mt-3 w-full" disabled={busy || prompt.trim().length < 4} onClick={run}>
          <Icon name="sparkles" size={18} /> {busy ? 'מעצב…' : 'צור 3 הצעות'}
        </button>
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      </Section>
      {items && (
        <div className="space-y-3 p-4 pt-0">
          {items.map((s) => (
            <SuggestionCard
              key={s.style}
              s={s}
              onApply={() => {
                const logo = design.elements.find((e) => e.type === 'image');
                actions.set({ ...composeLayout(model, { ...s.content, logo: logo && logo.type === 'image' ? logo : null }, s.style), inkColor: design.inkColor, modelId: design.modelId });
                toast('ההצעה הוחלה – אפשר להמשיך לערוך');
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
