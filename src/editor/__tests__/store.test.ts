import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from '../store'

function reset() {
  useEditorStore.getState().resetDoc()
}

describe('editor store', () => {
  beforeEach(reset)

  it('adds a block and selects it', () => {
    const id = useEditorStore.getState().addBlock({ t: 't', s: 'hello' })
    const state = useEditorStore.getState()
    expect(state.doc.items).toHaveLength(1)
    expect(state.doc.items[0]!.id).toBe(id)
    expect(state.selectedId).toBe(id)
  })

  it('grows doc.h to fit added items', () => {
    useEditorStore.getState().addBlock({ t: 't', s: 'a' })
    const h1 = useEditorStore.getState().doc.h
    useEditorStore.getState().addBlock({ t: 'b' }, { x: 8, y: 500 })
    const h2 = useEditorStore.getState().doc.h
    expect(h2).toBeGreaterThan(h1)
  })

  it('undo/redo restores prior doc state', () => {
    const id = useEditorStore.getState().addBlock({ t: 't', s: 'first' })
    useEditorStore.getState().updateBlock(id, { s: 'second' })
    expect((useEditorStore.getState().doc.items[0]!.block as { s: string }).s).toBe('second')

    useEditorStore.getState().undo()
    expect((useEditorStore.getState().doc.items[0]!.block as { s: string }).s).toBe('first')

    useEditorStore.getState().redo()
    expect((useEditorStore.getState().doc.items[0]!.block as { s: string }).s).toBe('second')
  })

  it('undo of the initial add removes the item entirely', () => {
    useEditorStore.getState().addBlock({ t: 't', s: 'only' })
    expect(useEditorStore.getState().doc.items).toHaveLength(1)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().doc.items).toHaveLength(0)
  })

  it('a drag gesture (beginGesture + many moveItemLive calls) collapses to one undo step', () => {
    const id = useEditorStore.getState().addBlock({ t: 't', s: 'draggable' }, { x: 8, y: 8 })
    const pastAfterAdd = useEditorStore.getState().past.length

    useEditorStore.getState().beginGesture()
    for (let i = 0; i < 20; i++) {
      useEditorStore.getState().moveItemLive(id, 8 + i, 8 + i)
    }
    expect(useEditorStore.getState().past.length).toBe(pastAfterAdd + 1)

    useEditorStore.getState().undo()
    const item = useEditorStore.getState().doc.items.find((it) => it.id === id)!
    expect(item.x).toBe(8)
    expect(item.y).toBe(8)
  })

  it('keeps QR item size in sync with its module size via computeItemSize', () => {
    const id = useEditorStore.getState().addBlock({ t: 'q', d: 'hello', m: 4 })
    const before = useEditorStore.getState().doc.items[0]!.w
    useEditorStore.getState().updateBlock(id, { m: 8 })
    const after = useEditorStore.getState().doc.items[0]!.w
    expect(after).toBeGreaterThan(before)
  })

  it('removeItem clears selection only if the removed item was selected', () => {
    const idA = useEditorStore.getState().addBlock({ t: 't', s: 'a' })
    useEditorStore.getState().addBlock({ t: 't', s: 'b' })
    useEditorStore.getState().select(idA)
    const idB = useEditorStore.getState().doc.items[1]!.id
    useEditorStore.getState().removeItem(idB)
    expect(useEditorStore.getState().selectedId).toBe(idA)
  })
})
