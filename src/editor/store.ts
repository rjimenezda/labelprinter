import { create } from 'zustand'
import type { Block, Item, LabelDoc } from '../codec/types'
import { DEFAULT_WIDTH_DOTS } from '../codec/types'
import { PAD_DEFAULT } from '../render/tokens'
import { computeItemSize } from './itemSize'
import { newId } from './ids'

export function emptyDoc(): LabelDoc {
  return { v: 1, w: DEFAULT_WIDTH_DOTS, h: 120, items: [] }
}

function recomputeHeight(doc: LabelDoc): number {
  let maxY = 80
  for (const it of doc.items) {
    maxY = Math.max(maxY, it.y + (it.h ?? 40) + PAD_DEFAULT)
  }
  return maxY
}

interface HistoryEntry {
  doc: LabelDoc
}

const HISTORY_LIMIT = 50

interface EditorState {
  doc: LabelDoc
  selectedId: string | null
  past: HistoryEntry[]
  future: HistoryEntry[]

  addBlock: (block: Block, at?: { x: number; y: number }) => string
  updateBlock: (id: string, patch: Record<string, unknown>) => void
  removeItem: (id: string) => void
  select: (id: string | null) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void

  /** Call once at the start of a drag/resize gesture -- snapshots the
   *  current doc as a single undo step, so a continuous pointer drag
   *  collapses to one history entry instead of one per frame. */
  beginGesture: () => void
  moveItemLive: (id: string, x: number, y: number) => void
  resizeItemLive: (id: string, w: number, h?: number) => void

  undo: () => void
  redo: () => void
  replaceDoc: (doc: LabelDoc) => void
  resetDoc: () => void
}

function withHistory(s: { doc: LabelDoc; past: HistoryEntry[] }): HistoryEntry[] {
  const next = [...s.past, { doc: s.doc }]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}

export const useEditorStore = create<EditorState>((set, get) => ({
  doc: emptyDoc(),
  selectedId: null,
  past: [],
  future: [],

  addBlock: (block, at) => {
    const id = newId()
    const size = computeItemSize(block)
    const s = get()
    const maxZ = s.doc.items.reduce((m, it) => Math.max(m, it.z), -1)
    const item: Item = {
      id,
      x: at?.x ?? PAD_DEFAULT,
      y: at?.y ?? recomputeHeight(s.doc),
      w: size.w ?? 200,
      h: size.h,
      z: maxZ + 1,
      block,
    }
    set((state) => {
      const doc = { ...state.doc, items: [...state.doc.items, item] }
      doc.h = recomputeHeight(doc)
      return { doc, selectedId: id, past: withHistory(state), future: [] }
    })
    return id
  },

  updateBlock: (id, patch) => {
    set((state) => {
      const items = state.doc.items.map((it) => {
        if (it.id !== id) return it
        const block = { ...it.block, ...patch } as Block
        const size = block.t === 'q' || block.t === 'c' ? computeItemSize(block) : {}
        return { ...it, block, ...size }
      })
      const doc = { ...state.doc, items }
      doc.h = recomputeHeight(doc)
      return { doc, past: withHistory(state), future: [] }
    })
  },

  removeItem: (id) => {
    set((state) => {
      const items = state.doc.items.filter((it) => it.id !== id)
      const doc = { ...state.doc, items }
      doc.h = recomputeHeight(doc)
      return {
        doc,
        selectedId: state.selectedId === id ? null : state.selectedId,
        past: withHistory(state),
        future: [],
      }
    })
  },

  select: (id) => set({ selectedId: id }),

  bringToFront: (id) => {
    set((state) => {
      const maxZ = state.doc.items.reduce((m, it) => Math.max(m, it.z), -1)
      const items = state.doc.items.map((it) => (it.id === id ? { ...it, z: maxZ + 1 } : it))
      return { doc: { ...state.doc, items }, past: withHistory(state), future: [] }
    })
  },

  sendToBack: (id) => {
    set((state) => {
      const minZ = state.doc.items.reduce((m, it) => Math.min(m, it.z), 0)
      const items = state.doc.items.map((it) => (it.id === id ? { ...it, z: minZ - 1 } : it))
      return { doc: { ...state.doc, items }, past: withHistory(state), future: [] }
    })
  },

  beginGesture: () => {
    set((state) => ({ past: withHistory(state), future: [] }))
  },

  moveItemLive: (id, x, y) => {
    set((state) => {
      const items = state.doc.items.map((it) => (it.id === id ? { ...it, x, y } : it))
      const doc = { ...state.doc, items }
      doc.h = recomputeHeight(doc)
      return { doc }
    })
  },

  resizeItemLive: (id, w, h) => {
    set((state) => {
      const items = state.doc.items.map((it) => (it.id === id ? { ...it, w, h } : it))
      const doc = { ...state.doc, items }
      doc.h = recomputeHeight(doc)
      return { doc }
    })
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]!
      return { doc: previous.doc, past: state.past.slice(0, -1), future: [{ doc: state.doc }, ...state.future] }
    })
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state
      const next = state.future[0]!
      return { doc: next.doc, past: [...state.past, { doc: state.doc }], future: state.future.slice(1) }
    })
  },

  replaceDoc: (doc) => set({ doc, selectedId: null, past: [], future: [] }),
  resetDoc: () => set({ doc: emptyDoc(), selectedId: null, past: [], future: [] }),
}))
