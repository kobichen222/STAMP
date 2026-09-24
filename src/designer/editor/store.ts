'use client';

import { useCallback, useMemo, useReducer } from 'react';
import { uid } from '../compose';
import type { Design, DesignElement } from '../types';

const MAX_HISTORY = 100;

export interface EditorState {
  design: Design;
  selection: string[];
  past: Design[];
  future: Design[];
  /** Snapshot taken when a continuous gesture (drag, slider) started. */
  txn: Design | null;
  /** Bumped on every change – drives autosave. */
  revision: number;
}

type Action =
  | { type: 'set'; design: Design; history: boolean }
  | { type: 'patch'; ids: string[]; patch: Partial<DesignElement> | ((el: DesignElement) => Partial<DesignElement>); history: boolean }
  | { type: 'add'; elements: DesignElement[] }
  | { type: 'remove'; ids: string[] }
  | { type: 'duplicate'; ids: string[] }
  | { type: 'reorder'; id: string; to: number }
  | { type: 'select'; ids: string[] }
  | { type: 'begin' }
  | { type: 'commit' }
  | { type: 'undo' }
  | { type: 'redo' };

function pushPast(state: EditorState, prev: Design): Pick<EditorState, 'past' | 'future'> {
  return { past: [...state.past, prev].slice(-MAX_HISTORY), future: [] };
}

function withDesign(state: EditorState, design: Design, history: boolean): EditorState {
  if (design === state.design) return state;
  const hist = history && !state.txn ? pushPast(state, state.design) : {};
  return { ...state, ...hist, design, revision: state.revision + 1 };
}

function reducer(state: EditorState, a: Action): EditorState {
  switch (a.type) {
    case 'set':
      return { ...withDesign(state, a.design, a.history), selection: state.selection.filter((id) => a.design.elements.some((e) => e.id === id)) };
    case 'patch': {
      const elements = state.design.elements.map((el) =>
        a.ids.includes(el.id) ? ({ ...el, ...(typeof a.patch === 'function' ? a.patch(el) : a.patch) } as DesignElement) : el,
      );
      return withDesign(state, { ...state.design, elements }, a.history);
    }
    case 'add':
      return { ...withDesign(state, { ...state.design, elements: [...state.design.elements, ...a.elements] }, true), selection: a.elements.map((e) => e.id) };
    case 'remove': {
      const elements = state.design.elements.filter((e) => !a.ids.includes(e.id) || e.locked);
      return { ...withDesign(state, { ...state.design, elements }, true), selection: [] };
    }
    case 'duplicate': {
      const copies = state.design.elements
        .filter((e) => a.ids.includes(e.id))
        .map((e) => ({ ...e, id: uid(e.type), x: e.x + 1.5, y: e.y + 1.5, locked: false }) as DesignElement);
      return { ...withDesign(state, { ...state.design, elements: [...state.design.elements, ...copies] }, true), selection: copies.map((c) => c.id) };
    }
    case 'reorder': {
      const list = [...state.design.elements];
      const from = list.findIndex((e) => e.id === a.id);
      if (from < 0) return state;
      const [el] = list.splice(from, 1);
      list.splice(Math.max(0, Math.min(list.length, a.to)), 0, el);
      return withDesign(state, { ...state.design, elements: list }, true);
    }
    case 'select':
      return { ...state, selection: a.ids };
    case 'begin':
      return state.txn ? state : { ...state, txn: state.design };
    case 'commit': {
      if (!state.txn) return state;
      const changed = state.txn !== state.design;
      return { ...state, txn: null, ...(changed ? pushPast(state, state.txn) : {}) };
    }
    case 'undo': {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return { ...state, design: prev, past: state.past.slice(0, -1), future: [state.design, ...state.future], txn: null, revision: state.revision + 1, selection: state.selection.filter((id) => prev.elements.some((e) => e.id === id)) };
    }
    case 'redo': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return { ...state, design: next, past: [...state.past, state.design], future: state.future.slice(1), txn: null, revision: state.revision + 1 };
    }
  }
}

export function useEditorStore(initial: Design) {
  const [state, dispatch] = useReducer(reducer, { design: initial, selection: [], past: [], future: [], txn: null, revision: 0 });

  const set = useCallback((design: Design, history = true) => dispatch({ type: 'set', design, history }), []);
  const patch = useCallback(
    (ids: string | string[], p: Partial<DesignElement> | ((el: DesignElement) => Partial<DesignElement>), history = true) =>
      dispatch({ type: 'patch', ids: Array.isArray(ids) ? ids : [ids], patch: p, history }),
    [],
  );
  const actions = useMemo(
    () => ({
      set,
      patch,
      add: (...elements: DesignElement[]) => dispatch({ type: 'add', elements }),
      remove: (ids: string[]) => dispatch({ type: 'remove', ids }),
      duplicate: (ids: string[]) => dispatch({ type: 'duplicate', ids }),
      reorder: (id: string, to: number) => dispatch({ type: 'reorder', id, to }),
      select: (ids: string[]) => dispatch({ type: 'select', ids }),
      begin: () => dispatch({ type: 'begin' }),
      commit: () => dispatch({ type: 'commit' }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
    }),
    [set, patch],
  );

  const selected = state.design.elements.filter((e) => state.selection.includes(e.id));
  return { state, actions, selected, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

export type EditorActions = ReturnType<typeof useEditorStore>['actions'];
