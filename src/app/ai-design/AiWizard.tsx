'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { composeForProduction } from '@/designer/autofix';
import { LOOK_IDS, LOOKS } from '@/designer/compose';
import type { DesignerProduct } from '@/designer/editor/Editor';
import { formatSize } from '@/designer/models';
import { profileForModel } from '@/designer/profiles';
import { renderDesign } from '@/designer/render';
import { StampSvg } from '@/designer/StampSvg';
import type { Suggestion } from '@/designer/suggest';
import { INK_COLORS, type Design, type InkColor } from '@/designer/types';
import { useFaces } from '@/designer/useFaces';
import { isProductionReady, validateDesign } from '@/designer/validate';
import { setActiveDraft } from '@/lib/active-draft';
import { saveDesign } from '@/lib/designs-store';
import { formatPrice } from '@/lib/format';
import { lineInputFor, quoteLine } from '@/lib/pricing';
import { toProductionSvg } from '@/designer/production';

/** The studio's default stamps – offered first. */
const DEFAULTS = ['חותמת-פרינט-20', 'print-r-540'];

const STEPS = ['תוכן', 'מוצר', 'עיצוב', 'המחשה והזמנה'] as const;
const EXAMPLES = [
  { label: 'עורך דין', text: 'עו״ד ישראל ישראלי\nמ.ר. 12345\nטל׳ 050-1234567' },
  { label: 'רופא', text: 'ד״ר דנה לוי\nרופאת משפחה\nמ.ר. 1-23456' },
  { label: 'חברה', text: 'חברת דוגמה בע״מ\nח.פ. 512345678\nרח׳ הרצל 1, תל אביב\nטל׳ 03-1234567' },
  { label: 'פרטית', text: 'משפחת כהן\nהגפן 5, רמת גן' },
];

const linesOf = (t: string) =>
  t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

function compose(p: DesignerProduct, s: Suggestion, resolve: Parameters<typeof renderDesign>[1]): Design {
  return composeForProduction(p.model, s.content, s.style, resolve, profileForModel(p.model), { strict: true }).design;
}

export function AiWizard({ products }: { products: DesignerProduct[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [text, setText] = useState('');
  const [shape, setShape] = useState<'rect' | 'round'>('rect');
  const [slug, setSlug] = useState(DEFAULTS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [pick, setPick] = useState(0);
  const [ink, setInk] = useState<InkColor>('black');

  const lines = linesOf(text);
  const card = useRef<HTMLDivElement>(null);
  const goBtn = useRef<HTMLButtonElement>(null);
  // Every step starts at the top of the card (under the fixed header).
  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }, [step]);
  const product = products.find((p) => p.slug === slug) ?? null;

  // Sizes that fit the text: enough rows, cheapest first – the top three are recommended.
  const list = useMemo(() => {
    const n = Math.max(1, lines.length);
    const byShape = products.filter((p) => (shape === 'round' ? p.model.shape === 'round' : p.model.shape !== 'round'));
    const fits = byShape.filter((p) => shape === 'round' || !p.model.maxLines || p.model.maxLines >= n);
    const rank = (p: DesignerProduct) => (DEFAULTS.includes(p.slug) ? 0 : 1);
    return (fits.length ? fits : byShape).sort((a, b) => rank(a) - rank(b) || (a.price ?? 999) - (b.price ?? 999) || a.model.width * a.model.height - b.model.width * b.model.height);
  }, [products, shape, lines.length]);

  // Keep a valid choice: the recommended (first) size when the current one does not fit.
  useEffect(() => {
    if (list.length && !list.some((p) => p.slug === slug)) setSlug(list[0].slug);
  }, [list, slug]);

  // Designs of every suggestion on the chosen product (fonts load, then they are measured again).
  const [designs, setDesigns] = useState<Design[]>([]);
  const { resolve, ready, version } = useFaces(designs);
  const composed = useMemo(() => {
    if (!product || !suggestions || !ready) return [];
    return suggestions.map((s) => {
      const d = compose(product, s, resolve);
      const r = renderDesign(d, resolve);
      const issues = validateDesign(d, r, profileForModel(product.model));
      // Ready = no production errors and nothing running into anything else.
      return { d, r, ok: isProductionReady(issues) && !issues.some((i) => i.code === 'overlap') };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, suggestions, ready, version]);
  useEffect(() => {
    if (composed.length && designs.length !== composed.length) setDesigns(composed.map((c) => c.d));
  }, [composed, designs.length]);

  const generate = async (p: DesignerProduct) => {
    setBusy(true);
    setError('');
    setSuggestions(null);
    setDesigns([]);
    try {
      const res = await fetch('/api/ai-design/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, shape: p.model.shape, width: p.model.width, height: p.model.height }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // The 3 base styles, then 10 popular looks with exactly the same lines.
      const base: Suggestion[] = data.suggestions ?? [];
      const seed = base[0];
      const looks: Suggestion[] = seed ? LOOK_IDS.map((id) => ({ style: LOOKS[id].style, title: LOOKS[id].label, content: { ...seed.content, look: id } })) : [];
      setSuggestions([...base, ...looks]);
      setPick(0);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'משהו השתבש, נסו שוב');
    } finally {
      setBusy(false);
    }
  };

  const finish = (order: boolean) => {
    const c = composed[pick];
    if (!product || !c) return;
    const id = `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const design = { ...c.d, inkColor: ink };
    saveDesign({
      id,
      name: lines[0] || product.title,
      productSlug: product.slug,
      productName: product.title,
      size: formatSize(product.model),
      design,
      previewSvg: toProductionSvg(c.r),
      price: product.price,
    });
    setActiveDraft(id);
    router.push(`/designer/${product.slug}/?design=${id}&ink=${ink}${order ? '&order=1' : ''}`);
  };

  const chosen = composed[pick];
  // Same price the order dialog shows (frame, logo, online-design discount…).
  const quote = product && chosen ? quoteLine(lineInputFor({ basePrice: product.price, quantity: 1, design: chosen.d, ink })) : null;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-blue-50/60 via-white to-surface pt-24 pb-16 sm:pt-28">
      <div className="container-x max-w-3xl">
        <div className="text-center">
          <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl">
            כותבים את התוכן – <span className="grad-text">מקבלים חותמת מעוצבת</span>
          </h1>
          <p className="mt-3 text-muted sm:text-lg">4 צעדים קצרים, המחשה מלאה לפני שמזמינים.</p>
        </div>

        {/* Stepper */}
        <ol className="mx-auto mt-8 flex max-w-xl items-center justify-between" aria-label="שלבים">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={i > step}
                onClick={() => i < step && setStep(i)}
                className="flex flex-col items-center gap-1.5 disabled:cursor-default"
                aria-current={i === step ? 'step' : undefined}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold transition ${
                    i < step ? 'bg-ok text-white' : i === step ? 'bg-blue text-white shadow-[0_8px_20px_-8px_rgba(36,87,255,.9)]' : 'bg-white text-muted ring-1 ring-line'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </span>
                <span className={`text-[11px] font-semibold whitespace-nowrap sm:text-xs ${i === step ? 'text-ink' : 'text-muted'}`}>{s}</span>
              </button>
              {i < STEPS.length - 1 && <span className={`mx-1 mb-5 h-0.5 flex-1 rounded ${i < step ? 'bg-ok' : 'bg-line'}`} />}
            </li>
          ))}
        </ol>

        <div ref={card} className="mt-8 rounded-3xl border border-line/70 bg-white p-5 shadow-[0_30px_70px_-35px_rgba(11,20,38,.35)] sm:p-8">
          {step === 0 && (
            <>
              <h2 className="text-xl font-bold">מה יהיה כתוב על החותמת?</h2>
              <p className="mt-1 text-sm text-muted">כתבו כל שורה בשורה נפרדת – בדיוק כמו שתרצו שיופיע. כל מילה וכל ספרה נשמרות.</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                autoFocus
                className="input mt-4 !text-lg leading-relaxed"
                placeholder={'לדוגמה:\nעו״ד ישראל ישראלי\nמ.ר. 12345\nטל׳ 050-1234567'}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">דוגמאות:</span>
                {EXAMPLES.map((e) => (
                  <button key={e.label} type="button" className="chip !py-1" onClick={() => setText(e.text)}>
                    {e.label}
                  </button>
                ))}
              </div>
              <button type="button" className="btn-primary mt-6 !h-13 w-full !text-base font-bold" disabled={lines.length === 0} onClick={() => setStep(1)}>
                המשך לבחירת מוצר <Icon name="arrowLeft" size={18} />
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-xl font-bold">בחרו מוצר ומידה</h2>
              <p className="mt-1 text-sm text-muted">{lines.length} שורות – הצגנו רק מידות שהטקסט נכנס בהן. הראשון ברשימה הוא הדגם המומלץ שלנו.</p>
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 text-sm font-semibold">
                {(['rect', 'round'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setShape(s);
                      setSlug(DEFAULTS[s === 'round' ? 1 : 0]);
                    }}
                    className={`rounded-lg py-2 transition ${shape === s ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
                  >
                    {s === 'rect' ? 'מלבניות' : 'עגולות'}
                  </button>
                ))}
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {list.map((p, i) => (
                  <li key={p.slug} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSlug(p.slug);
                        // Straight on to the next action.
                        setTimeout(() => goBtn.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                      }}
                      className={`flex w-full min-w-0 items-center gap-3 rounded-xl border p-2.5 text-start transition ${slug === p.slug ? 'border-blue bg-blue-50/60 ring-2 ring-blue/15' : 'border-line hover:border-ink/25'}`}
                    >
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain" />
                      ) : (
                        <span className="h-14 w-14 shrink-0 rounded-lg bg-surface" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-sm font-bold">{p.title}</span>
                          {i === 0 && <span className="shrink-0 rounded-full bg-ok/10 px-1.5 py-0.5 text-[10px] font-bold text-ok">מומלץ</span>}
                        </span>
                        <span className="block text-xs text-muted">
                          {formatSize(p.model)}
                          {p.model.maxLines ? ` · עד ${p.model.maxLines} שורות` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-extrabold">{p.price != null ? formatPrice(p.price) : '—'}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {error && <p className="mt-3 text-sm text-bad">{error}</p>}
              <button ref={goBtn} type="button" className="btn-primary mt-6 !h-13 w-full !text-base font-bold" disabled={!product || busy} onClick={() => product && generate(product)}>
                {busy ? 'מעצבים… (כמה שניות)' : 'צרו לי עיצובים'}
              </button>
            </>
          )}

          {step === 2 && product && (
            <>
              <h2 className="text-xl font-bold">בחרו עיצוב</h2>
              <p className="mt-1 text-sm text-muted">
                {suggestions?.length ?? 0} עיצובים על {product.title} ({formatSize(product.model)}) – כל השורות שלכם בכל אחד מהם.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {suggestions?.map((s, i) => (
                  <button
                    key={s.title + i}
                    type="button"
                    onClick={() => setPick(i)}
                    className={`rounded-2xl border p-2 text-start transition sm:p-3 ${pick === i ? 'border-blue bg-blue-50/50 ring-2 ring-blue/15' : 'border-line hover:border-ink/25'}`}
                  >
                    <div className="grid h-24 place-items-center rounded-xl bg-white p-1.5 shadow-sm sm:h-32 sm:p-2">
                      {composed[i] ? <StampSvg render={composed[i].r} ink={ink} className="max-h-20 w-full sm:max-h-28" pad={0.8} /> : <span className="h-full w-full animate-pulse rounded-lg bg-line/50" />}
                    </div>
                    <span className="mt-2 flex flex-wrap items-center justify-between gap-x-2 text-[13px] font-bold sm:text-sm">
                      {s.content.look ? LOOKS[s.content.look].label : ({ classic: 'קלאסי', modern: 'מודרני', minimal: 'מינימלי' }[s.style] ?? s.title)}
                      {composed[i] && <span className={`text-[11px] font-semibold ${composed[i].ok ? 'text-ok' : 'text-warn'}`}>{composed[i].ok ? '✓ מוכן לייצור' : 'צפוף – מומלץ גדול יותר'}</span>}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button type="button" className="btn-primary !h-13 flex-1 !text-base font-bold" disabled={!composed[pick]} onClick={() => setStep(3)}>
                  להמחשה ולהזמנה <Icon name="arrowLeft" size={18} />
                </button>
                <button type="button" className="btn-outline !h-13" disabled={busy} onClick={() => generate(product)}>
                  {busy ? 'מעצב…' : 'עיצובים חדשים'}
                </button>
              </div>
            </>
          )}

          {step === 3 && product && chosen && (
            <>
              <h2 className="text-xl font-bold">ככה החותמת שלכם תיראה</h2>
              <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto]">
                <div className="grid min-h-48 place-items-center rounded-2xl bg-[repeating-linear-gradient(0deg,#fff,#fff_23px,#eef1f6_24px)] p-6 shadow-inner ring-1 ring-line">
                  <StampSvg render={chosen.r} ink={ink} className="max-h-56 w-full max-w-md" pad={1} />
                </div>
                {product.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt={product.title} className="mx-auto h-36 w-36 rounded-2xl border border-line bg-white object-contain p-2 sm:h-48 sm:w-48" />
                )}
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-xl bg-surface p-3">
                  <dt className="text-muted">מוצר</dt>
                  <dd className="mt-0.5 font-bold">{product.title}</dd>
                </div>
                <div className="rounded-xl bg-surface p-3">
                  <dt className="text-muted">מידה</dt>
                  <dd className="mt-0.5 font-bold">{formatSize(product.model)}</dd>
                </div>
                <div className="rounded-xl bg-surface p-3">
                  <dt className="text-muted">בדיקת ייצור</dt>
                  <dd className={`mt-0.5 font-bold ${chosen.ok ? 'text-ok' : 'text-warn'}`}>{chosen.ok ? '✓ מוכן' : 'צפוף'}</dd>
                </div>
                <div className="rounded-xl bg-blue-50 p-3">
                  <dt className="text-muted">מחיר</dt>
                  <dd className="mt-0.5 text-lg font-extrabold text-blue">{quote && !quote.onRequest ? formatPrice(quote.total) : 'לפי הצעה'}</dd>
                </div>
              </dl>
              <div className="mt-5">
                <p className="text-sm font-semibold">צבע דיו</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(INK_COLORS) as InkColor[]).map((k) => (
                    <button key={k} type="button" onClick={() => setInk(k)} aria-pressed={ink === k} className={`chip ${ink === k ? '!border-ink' : ''}`}>
                      <span className="h-3.5 w-3.5 rounded-full" style={{ background: INK_COLORS[k].hex }} />
                      {INK_COLORS[k].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button type="button" className="btn-primary cta-glow !h-14 flex-1 !text-lg font-bold" onClick={() => finish(true)}>
                  להזמנה <Icon name="arrowLeft" size={18} />
                </button>
                <button type="button" className="btn-outline !h-14" onClick={() => finish(false)}>
                  <Icon name="edit" size={17} /> עריכה במעצב
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-muted">לפני התשלום אפשר עוד לשנות כמות, להוסיף מוצרים ולבדוק את הסיכום.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
