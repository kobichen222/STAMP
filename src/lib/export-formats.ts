/**
 * Production file formats offered to the studio (shared by the admin UI and
 * the server-side exporters in src/server/formats.ts).
 */
export type ExportFormat = 'pdf' | 'svg' | 'eps' | 'ai' | 'dxf' | 'plt' | 'emf' | 'wmf' | 'png' | 'bmp';

export const EXPORT_FORMATS: { id: ExportFormat; label: string; ext: string; mime: string; note: string; vectorOnly?: boolean }[] = [
  { id: 'pdf', label: 'PDF', ext: 'pdf', mime: 'application/pdf', note: 'וקטורי · CorelDRAW / Illustrator / כל תוכנה' },
  { id: 'ai', label: 'AI – Adobe Illustrator', ext: 'ai', mime: 'application/postscript', note: 'וקטורי · Import ישיר בכל גרסת CorelDRAW', vectorOnly: true },
  { id: 'eps', label: 'EPS', ext: 'eps', mime: 'application/postscript', note: 'וקטורי · גרסאות CorelDRAW ישנות' },
  { id: 'svg', label: 'SVG', ext: 'svg', mime: 'image/svg+xml', note: 'וקטורי · CorelDRAW X4 ומעלה, Inkscape' },
  { id: 'emf', label: 'EMF – Enhanced Metafile', ext: 'emf', mime: 'image/emf', note: 'וקטורי · Windows / CorelDRAW', vectorOnly: true },
  { id: 'wmf', label: 'WMF – Windows Metafile', ext: 'wmf', mime: 'image/wmf', note: 'וקטורי · תוכנות ישנות', vectorOnly: true },
  { id: 'dxf', label: 'DXF – AutoCAD', ext: 'dxf', mime: 'application/dxf', note: 'קווי מתאר · תוכנות לייזר / CAD', vectorOnly: true },
  { id: 'plt', label: 'PLT – HPGL', ext: 'plt', mime: 'application/vnd.hp-hpgl', note: 'קווי מתאר · פלוטר / חותך / לייזר', vectorOnly: true },
  { id: 'png', label: 'PNG 1200dpi', ext: 'png', mime: 'image/png', note: 'תמונה שחור-לבן · חריטה רסטרית', vectorOnly: true },
  { id: 'bmp', label: 'BMP 1200dpi', ext: 'bmp', mime: 'image/bmp', note: 'תמונה 1-bit · תוכנות לייזר ישנות', vectorOnly: true },
];

export const isExportFormat = (f: string): f is ExportFormat => EXPORT_FORMATS.some((x) => x.id === f);

