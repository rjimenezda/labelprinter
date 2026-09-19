import { create } from 'zustand'
import type { Block, ImageCrop, Item, LabelDoc } from '../codec/types'
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

/** Normalizes a rotation to a whole degree in [0, 360); 0 collapses to
 *  undefined, matching every other "unset means default" optional field. */
function normalizeRotation(deg: number): Item['rot'] {
  return (((Math.round(deg) % 360) + 360) % 360) || undefined
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
  /** Clones an item (new id, nudged position, brought to front) and
   *  selects the clone. Returns the new item's id, or null if `id` no
   *  longer exists. */
  duplicateItem: (id: string) => string | null
  select: (id: string | null) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void

  /** Call once at the start of a drag/resize/rotate gesture -- snapshots
   *  the current doc as a single undo step, so a continuous pointer drag
   *  collapses to one history entry instead of one per frame. */
  beginGesture: () => void
  moveItemLive: (id: string, x: number, y: number) => void
  resizeItemLive: (id: string, w: number, h?: number) => void
  /** Continuous rotation, in degrees -- any value, normalized to [0, 360).
   *  Follows the same beginGesture()-then-many-calls pattern as
   *  moveItemLive/resizeItemLive. */
  rotateItemLive: (id: string, deg: number) => void
  /** Continuous pan/zoom crop update -- same beginGesture()-then-many-calls
   *  pattern. Works on any block with a `crop` field (ImageBlock,
   *  PokemonBlock); no-op on a block that doesn't have one. The caller is
   *  responsible for the right shape per block type (PokemonBlock's also
   *  carries `h`, see codec/types.ts's `crop` doc). */
  cropItemLive: (id: string, crop: ImageCrop | (ImageCrop & { h: number })) => void

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

  duplicateItem: (id) => {
    const s = get()
    const source = s.doc.items.find((it) => it.id === id)
    if (!source) return null
    const newItemId = newId()
    const maxZ = s.doc.items.reduce((m, it) => Math.max(m, it.z), -1)
    const clone: Item = { ...source, id: newItemId, x: source.x + PAD_DEFAULT, y: source.y + PAD_DEFAULT, z: maxZ + 1 }
    set((state) => {
      const doc = { ...state.doc, items: [...state.doc.items, clone] }
      doc.h = recomputeHeight(doc)
      return { doc, selectedId: newItemId, past: withHistory(state), future: [] }
    })
    return newItemId
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

  rotateItemLive: (id, deg) => {
    set((state) => {
      const items = state.doc.items.map((it) => (it.id === id ? { ...it, rot: normalizeRotation(deg) } : it))
      return { doc: { ...state.doc, items } }
    })
  },

  cropItemLive: (id, crop) => {
    set((state) => {
      const items = state.doc.items.map((it) => {
        if (it.id !== id) return it
        if (it.block.t !== 'i' && it.block.t !== 'p') return it
        return { ...it, block: { ...it.block, crop } as Block }
      })
      return { doc: { ...state.doc, items } }
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
