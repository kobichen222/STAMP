/** All geometry is in millimetres, origin at the top-left of the impression area. */

export type StampShape = 'rect' | 'round';

export interface StampModel {
  id: string;
  name: string;
  shape: StampShape;
  width: number;
  height: number;
  maxLines?: number;
  price?: number | null;
  productSlug?: string;
  /** Self-inking daters have a date window that must stay free. */
  dateBand?: boolean;
  image?: string;
}

interface BaseElement {
  id: string;
  /** Centre of the element. */
  x: number;
  y: number;
  /** Degrees, clockwise. */
  rotation: number;
  locked?: boolean;
  hidden?: boolean;
}

export type TextAlign = 'right' | 'center' | 'left';

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  font: string;
  bold: boolean;
  italic?: boolean;
  underline?: boolean;
  /** Font size in points (1pt = 0.3528mm). */
  size: number;
  align: TextAlign;
  /** Extra spacing between letters, in 1/1000 em. */
  letterSpacing: number;
  /** Baseline-to-baseline distance as a multiple of the font size. */
  lineHeight: number;
  /** Text box width in mm; wider text is shrunk to fit. 0 = unlimited. */
  maxWidth: number;
  /** Text set on a circle around (x, y). */
  curve?: { radius: number; position: 'top' | 'bottom' } | null;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  width: number;
  height: number;
  /** Processed bitmap (black on transparent) used when not vectorised. */
  src: string;
  /** Vector trace: path data in a 0..1 × 0..(h/w) box, filled. */
  vector?: string | null;
  source: { name: string; mime: string; pxWidth: number; pxHeight: number; isVector: boolean };
}

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'star' | 'icon';

export interface ShapeElement extends BaseElement {
  type: 'shape';
  kind: ShapeKind;
  width: number;
  height: number;
  /** Outline thickness in mm (ignored when filled). */
  stroke: number;
  filled: boolean;
  radius?: number; // rect corner radius
  icon?: string;
}

export type DesignElement = TextElement | ImageElement | ShapeElement;

export type BorderStyle = 'none' | 'rect' | 'rounded' | 'double' | 'circle' | 'oval' | 'dashed' | 'minimal';

export interface Border {
  style: BorderStyle;
  thickness: number;
  /** Distance from the stamp edge. */
  inset: number;
  /** Gap between the two lines of a double border. */
  gap: number;
}

export interface Design {
  version: 1;
  modelId: string;
  shape: StampShape;
  width: number;
  height: number;
  border: Border;
  elements: DesignElement[];
  inkColor: InkColor;
  dateBand?: boolean;
}

export type InkColor = 'black' | 'blue' | 'red' | 'green' | 'purple';

export const INK_COLORS: Record<InkColor, { label: string; hex: string }> = {
  black: { label: 'שחור', hex: '#1b1b1f' },
  blue: { label: 'כחול', hex: '#1d3fbf' },
  red: { label: 'אדום', hex: '#c21a2b' },
  green: { label: 'ירוק', hex: '#157a3c' },
  purple: { label: 'סגול', hex: '#6b2fb3' },
};

export const PT_TO_MM = 25.4 / 72;
