'use client';

import { useEffect, useState } from 'react';
import { EXPORT_FORMATS, type ExportFormat } from '@/lib/export-formats';

const PREF_KEY = 's2g-export-format';

/**
 * Production download in any format: the station picks the format its
 * CorelDRAW / laser software imports (remembered on this computer) and
 * whether to mirror; files are generated on demand from the locked design.
 */
export function ExportMenu({ orderId, index, mirror, hasRasterLogo, compact = false }: { orderId: string; index: number; mirror: boolean; hasRasterLogo?: boolean; compact?: boolean }) {
  const [format, setFormat] = useState<ExportFormat | 'zip'>('pdf');
  const [mir, setMir] = useState(mirror);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved && (saved === 'zip' || EXPORT_FORMATS.some((f) => f.id === saved))) setFormat(saved as ExportFormat | 'zip');
    } catch {
      /* ignore */
    }
  }, []);

  const choose = (f: ExportFormat | 'zip') => {
    setFormat(f);
    try {
      localStorage.setItem(PREF_KEY, f);
    } catch {
      /* ignore */
    }
  };

  const href = (f: string) => `/api/admin/export/?order=${encodeURIComponent(orderId)}&item=${index}&format=${f}&mirror=${mir ? 1 : 0}`;
  const current = EXPORT_FORMATS.find((f) => f.id === format);
  const lossy = hasRasterLogo && (format === 'zip' || current?.vectorOnly);

  return (
    <div className={`rounded-xl border border-line bg-white ${compact ? 'p-2' : 'p-3'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`fmt-${orderId}-${index}`}>
          פורמט קובץ
        </label>
        <select id={`fmt-${orderId}-${index}`} value={format} onChange={(e) => choose(e.target.value as ExportFormat | 'zip')} className="input !h-9 !w-auto min-w-0 flex-1 !py-1 text-sm" dir="ltr">
          {EXPORT_FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
          <option value="zip">ZIP – כל הפורמטים</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={mir} onChange={(e) => setMir(e.target.checked)} className="h-4 w-4 accent-[#2457ff]" />
          מראה
        </label>
        <a href={href(format)} className="btn-primary btn-sm">
          הורדה
        </a>
      </div>
      {!compact && <p className="mt-1.5 text-xs text-muted">{format === 'zip' ? 'כל הפורמטים בקובץ אחד + הוראות ייבוא ל-CorelDRAW' : current?.note}</p>}
      {lossy && <p className="mt-1 text-xs text-warn">יש בעיצוב לוגו כתמונה (לא וקטורי) – הוא נכלל רק ב-PDF / SVG.</p>}
    </div>
  );
}
