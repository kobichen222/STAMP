'use client';

import { useState } from 'react';
import type { SiteSettings } from '@/lib/admin-settings';
import { saveSite } from '../settings-actions';
import { Panel, SaveBar, same } from '../ui';

const FIELDS: { key: keyof SiteSettings; label: string; dir?: 'ltr'; hint?: string; long?: boolean }[] = [
  { key: 'phone', label: 'טלפון', dir: 'ltr' },
  { key: 'whatsappNumber', label: 'מספר וואטסאפ', dir: 'ltr', hint: 'בפורמט בינלאומי, בלי 0 בהתחלה: 972501234567' },
  { key: 'email', label: 'אימייל ליצירת קשר', dir: 'ltr' },
  { key: 'ordersEmail', label: 'מיילים להתראות על הזמנות', dir: 'ltr', hint: 'אפשר כמה כתובות מופרדות בפסיק' },
  { key: 'address', label: 'כתובת לאיסוף' },
  { key: 'hours', label: 'שעות פעילות' },
  { key: 'announcement', label: 'הודעה בראש האתר', hint: 'למשל: "סגורים בחג – הזמנות ייוצרו ביום ראשון". השאירו ריק כדי להסתיר', long: true },
];

export function SiteEditor({ initial }: { initial: SiteSettings }) {
  const [saved, setSaved] = useState(initial);
  const [v, setV] = useState(initial);
  return (
    <>
      <Panel title="פרטי העסק">
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className={`block ${f.long ? 'sm:col-span-2' : ''}`}>
              <span className="mb-1 block text-sm font-medium">{f.label}</span>
              <input value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className="input" dir={f.dir} />
              {f.hint && <span className="mt-1 block text-xs text-muted">{f.hint}</span>}
            </label>
          ))}
        </div>
      </Panel>
      <SaveBar
        dirty={!same(v, saved)}
        onReset={() => setV(saved)}
        onSave={async () => {
          const r = await saveSite(v);
          if (r.ok) setSaved(v);
          return r;
        }}
      />
    </>
  );
}
