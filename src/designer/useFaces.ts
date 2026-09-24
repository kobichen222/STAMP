'use client';

import { useEffect, useMemo, useState } from 'react';
import { faceKey, loadFace, type FontFace } from './fonts';
import type { FaceResolver } from './render';
import type { Design } from './types';

/** Loads every font face a design needs (plus the Heebo fallback) and returns a resolver. */
export function useFaces(designs: (Design | null | undefined)[]) {
  const [faces, setFaces] = useState<Map<string, FontFace>>(() => new Map());
  const needed = useMemo(() => {
    const set = new Set<string>(['heebo|0']);
    for (const d of designs) for (const e of d?.elements ?? []) if (e.type === 'text') set.add(`${e.font}|${e.bold ? 1 : 0}`);
    return [...set].sort().join(',');
  }, [designs]);

  useEffect(() => {
    let alive = true;
    const pairs = needed.split(',').map((s) => s.split('|') as [string, string]);
    Promise.all(
      pairs.map(([f, b]) =>
        loadFace(f, b === '1')
          .then((face) => [faceKey(f, b === '1'), face] as const)
          .catch(() => null),
      ),
    ).then((list) => {
      if (!alive) return;
      setFaces((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const it of list) if (it && !next.has(it[0])) {
          next.set(it[0], it[1]);
          changed = true;
        }
        return changed ? next : prev;
      });
    });
    return () => {
      alive = false;
    };
  }, [needed]);

  const resolve: FaceResolver = useMemo(() => (font, bold) => faces.get(faceKey(font, bold)), [faces]);
  const ready = needed.split(',').every((p) => {
    const [f, b] = p.split('|');
    return faces.has(faceKey(f, b === '1'));
  });
  return { resolve, ready, version: faces.size };
}
