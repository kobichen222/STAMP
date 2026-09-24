'use client';

import { createContext, useContext } from 'react';
import type { ProductionProfile } from '../profiles';
import type { FaceResolver, RenderResult } from '../render';
import type { Design, DesignElement, StampModel } from '../types';
import type { Issue } from '../validate';
import type { EditorActions } from './store';
import type { ViewSettings } from './Canvas';

export interface EditorContextValue {
  design: Design;
  render: RenderResult | null;
  selection: string[];
  selected: DesignElement[];
  actions: EditorActions;
  model: StampModel;
  profile: ProductionProfile;
  advanced: boolean;
  resolveFace: FaceResolver;
  issues: Issue[];
  openPanel: (p: PanelId) => void;
  view: ViewSettings;
  setView: (fn: (v: ViewSettings) => ViewSettings) => void;
  setAdvanced: (v: boolean) => void;
  improve: (style: 'classic' | 'modern' | 'minimal') => void;
  toast: (msg: string) => void;
  designId: string;
  addVariants: (designs: import('../types').Design[]) => void;
}

export type PanelId = 'templates' | 'text' | 'logo' | 'icons' | 'shapes' | 'frames' | 'layers' | 'ai' | 'settings';

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor outside EditorContext');
  return ctx;
}
