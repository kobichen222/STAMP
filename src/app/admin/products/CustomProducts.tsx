'use client';

import { useRef, useState, useTransition } from 'react';
import { customStampArea, type CustomProduct } from '@/lib/admin-settings';
import { saveCustomProducts } from '../settings-actions';
import { Switch } from '../ui';
import { shrink } from './ProductsEditor';

type Cat = { id: number; name: string };

const slugOf = (title: string) =>
  title
    .trim()
    .replace(/["'״׳.,/\\()]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

const blank = (): CustomProduct => ({
  id: 900000 + Math.floor(Date.now() / 1000) % 9000000,
  slug: '',
  title: '',
  price: null,
  categoryIds: [],
  shape: 'rect',
  width: null,
  height: null,
  rowsCount: '',
  shortDescription: '',
  description: '',
  hidden: false,
  createdAt: new Date().toISOString(),
});

const sizeText = (p: CustomProduct) => {
  const a = customStampArea(p);
  if (!a) return 'לא לעיצוב אונליין';
  return p.shape === 'round' ? `עגולה ⌀${p.width} מ"מ` : `${p.width}×${p.height || p.width} מ"מ`;
};

/** Upload of the product photo (same route as replacing a catalogue photo). */
function PhotoField({ value, onChange }: { value?: string; onChange: (url: string | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const blob = await shrink(file);
      const body = new FormData();
      body.set('custom', '1');
      body.set('file', new File([blob], 'photo.webp', { type: 'image/webp' }));
      const r = await fetch('/api/admin/product-image/', { method: 'POST', body });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'ההעלאה נכשלה');
      onChange(j.url);
    } catch (e) {
      setError(e instanceof Error && e.message !== 'convert' ? e.message : 'לא הצלחנו לקרוא את התמונה');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-white text-xs text-muted transition hover:border-blue hover:text-blue"
      >
        {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : busy ? 'מעלה…' : '+ תמונת מוצר'}
      </button>
      <div className="space-y-1 text-xs text-muted">
        <p>JPG, PNG או WebP – התמונה מוקטנת אוטומטית.</p>
        {value && (
          <div className="flex gap-3">
            <button type="button" className="font-semibold text-blue" onClick={() => input.current?.click()}>
              החלפה
            </button>
            <button type="button" className="text-bad" onClick={() => onChange(undefined)}>
              הסרה
            </button>
          </div>
        )}
        {error && <p className="text-bad">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void upload(f);
        }}
      />
    </div>
  );
}

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block min-w-0">
    <span className="mb-1 block text-sm font-medium">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
  </label>
);

const num = (v: string) => (v.trim() === '' ? null : Number(v));

function ProductForm({ initial, categories, isNew, onCancel, onSave }: { initial: CustomProduct; categories: Cat[]; isNew: boolean; onCancel: () => void; onSave: (p: CustomProduct) => Promise<string | null> }) {
  const [p, setP] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const set = (patch: Partial<CustomProduct>) => setP((x) => ({ ...x, ...patch }));
  const submit = () => {
    setError('');
    if (p.title.trim().length < 2) return setError('חסר שם מוצר');
    if (!p.slug) return setError('חסרה כתובת לדף המוצר');
    if (p.width && p.shape === 'rect' && !p.height) return setError('חסר גובה שטח ההחתמה');
    start(async () => {
      const err = await onSave({ ...p, title: p.title.trim() });
      if (err) setError(err);
    });
  };
  return (
    <section className="card space-y-5 border-blue/40 p-4 sm:p-5">
      <h3 className="text-lg font-bold">{isNew ? 'מוצר חדש' : `עריכת ${initial.title}`}</h3>
      <PhotoField value={p.image} onChange={(image) => set({ image })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="שם המוצר">
          <input
            className="input"
            value={p.title}
            placeholder="למשל: חותמת פרינט 60"
            onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugOf(e.target.value) }) })}
          />
        </Field>
        <Field label="כתובת הדף" hint={p.slug ? `stamp2go.co.il/stamp/${p.slug}/` : 'נוצרת מהשם'}>
          <input
            className="input"
            value={p.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set({ slug: slugOf(e.target.value) });
            }}
          />
        </Field>
        <Field label="מחיר (₪)" hint="ריק = מחיר לפי הצעה">
          <input className="input tabular-nums" dir="ltr" type="number" min={0} value={p.price ?? ''} onChange={(e) => set({ price: num(e.target.value) })} />
        </Field>
      </div>

      <fieldset className="min-w-0 space-y-3 rounded-xl bg-surface p-3">
        <legend className="sr-only">שטח החתמה</legend>
        <p className="text-sm font-semibold">שטח ההחתמה (לעיצוב אונליין)</p>
        <div className="flex flex-wrap gap-2">
          {(['rect', 'round'] as const).map((s) => (
            <button key={s} type="button" onClick={() => set({ shape: s })} className={`rounded-full border px-4 py-1.5 text-sm ${p.shape === s ? 'border-blue bg-blue text-white' : 'border-line bg-white'}`}>
              {s === 'rect' ? 'מלבנית / מרובעת' : 'עגולה'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label={p.shape === 'round' ? 'קוטר (מ"מ)' : 'רוחב (מ"מ)'}>
            <input className="input tabular-nums" dir="ltr" type="number" min={5} max={200} step={0.5} value={p.width ?? ''} onChange={(e) => set({ width: num(e.target.value) })} />
          </Field>
          {p.shape === 'rect' && (
            <Field label='גובה (מ"מ)'>
              <input className="input tabular-nums" dir="ltr" type="number" min={5} max={200} step={0.5} value={p.height ?? ''} onChange={(e) => set({ height: num(e.target.value) })} />
            </Field>
          )}
          <Field label="שורות מומלצות">
            <input className="input" value={p.rowsCount} placeholder="למשל: 4 עד 5 שורות" onChange={(e) => set({ rowsCount: e.target.value })} />
          </Field>
        </div>
        <p className="text-xs text-muted">בלי מידות – המוצר מוצג באתר אבל לא נפתח בעורך העיצוב.</p>
      </fieldset>

      <Field label="קטגוריות" hint="קובעות באילו דפי קטגוריה המוצר יופיע">
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((c) => {
            const on = p.categoryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => set({ categoryIds: on ? p.categoryIds.filter((x) => x !== c.id) : [...p.categoryIds, c.id] })}
                className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-blue bg-blue-50 font-semibold text-blue' : 'border-line bg-white text-ink-2'}`}
              >
                {on ? '✓ ' : ''}
                {c.name}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="תיאור קצר" hint="שורה או שתיים מתחת לשם המוצר">
        <textarea className="input min-h-[70px]" value={p.shortDescription} onChange={(e) => set({ shortDescription: e.target.value })} />
      </Field>
      <Field label="תיאור מלא" hint="שורה ריקה בין פסקאות">
        <textarea className="input min-h-[140px]" value={p.description} onChange={(e) => set({ description: e.target.value })} />
      </Field>

      <div className="flex items-center gap-3">
        <Switch on={!p.hidden} onChange={(on) => set({ hidden: !on })} label="הצגה באתר" />
        <span className="text-sm">{p.hidden ? 'מוסתר – לא מוצג באתר' : 'מוצג באתר'}</span>
      </div>

      {error && <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={pending} onClick={submit}>
          {pending ? 'שומר…' : isNew ? 'הוספת המוצר לאתר' : 'שמירת השינויים'}
        </button>
        <button type="button" className="btn-ghost" disabled={pending} onClick={onCancel}>
          ביטול
        </button>
      </div>
    </section>
  );
}

/** Products added from the admin: a full product (photo, price, size, categories, text) without code. */
export function CustomProducts({ initial, categories }: { initial: CustomProduct[]; categories: Cat[] }) {
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<{ p: CustomProduct; isNew: boolean } | null>(null);
  const [msg, setMsg] = useState('');

  const persist = async (next: CustomProduct[]) => {
    const r = await saveCustomProducts(next);
    if (!r.ok) return r.error;
    setList(next);
    return null;
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">מוצרים שנוספו בניהול</h2>
        <span className="text-sm text-muted">{list.length ? `${list.length} מוצרים` : 'עוד אין'}</span>
        {!editing && (
          <button
            type="button"
            className="btn-primary btn-sm ms-auto"
            onClick={() => {
              setMsg('');
              setEditing({ p: blank(), isNew: true });
            }}
          >
            + הוספת מוצר חדש
          </button>
        )}
      </div>
      {msg && <p className="text-sm text-ok">{msg}</p>}
      {editing && (
        <ProductForm
          key={editing.p.id}
          initial={editing.p}
          isNew={editing.isNew}
          categories={categories}
          onCancel={() => setEditing(null)}
          onSave={async (p) => {
            const next = editing.isNew ? [...list, p] : list.map((x) => (x.id === p.id ? p : x));
            const err = await persist(next);
            if (!err) {
              setEditing(null);
              setMsg(`${p.title} נשמר – הדף באתר: /stamp/${p.slug}/`);
            }
            return err;
          }}
        />
      )}
      {list.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((p) => (
            <li key={p.id} className={`card flex items-center gap-3 p-3 ${p.hidden ? 'opacity-60' : ''}`}>
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                {p.image ? <img src={p.image} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] text-muted">אין תמונה</span>}
              </span>
              <div className="min-w-0 flex-1">
                <a href={`/stamp/${p.slug}/`} target="_blank" className="block truncate text-sm font-bold hover:text-blue hover:underline">
                  {p.title}
                </a>
                <p className="truncate text-xs text-muted">
                  {sizeText(p)} · {p.price != null ? `₪${p.price}` : 'לפי הצעה'}
                  {p.hidden ? ' · מוסתר' : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing({ p, isNew: false })}>
                  עריכה
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm text-bad"
                  onClick={async () => {
                    if (!confirm(`למחוק את ${p.title} מהאתר?`)) return;
                    const err = await persist(list.filter((x) => x.id !== p.id));
                    setMsg(err ?? `${p.title} נמחק`);
                  }}
                >
                  מחיקה
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
