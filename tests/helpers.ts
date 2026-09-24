import fs from 'node:fs';
import path from 'node:path';
import { FONT_FAMILIES, faceKey, loadFace, type FontFace } from '@/designer/fonts';

const nodeLoader = async (url: string) => {
  const buf = fs.readFileSync(path.join(__dirname, '..', 'public', url));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

export async function loadAllFaces() {
  const faces = new Map<string, FontFace>();
  for (const f of FONT_FAMILIES) {
    for (const bold of [false, true]) {
      const face = await loadFace(f.id, bold, nodeLoader);
      faces.set(faceKey(f.id, bold), face);
    }
  }
  return (font: string, bold: boolean) => faces.get(faceKey(font, bold));
}
