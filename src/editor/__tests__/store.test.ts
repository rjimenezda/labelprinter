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

  it('duplicateItem clones the item with a new id, offset, and selects the clone', () => {
    const id = useEditorStore.getState().addBlock({ t: 't', s: 'orig' }, { x: 8, y: 8 })
    const newId = useEditorStore.getState().duplicateItem(id)
    const state = useEditorStore.getState()
    expect(newId).not.toBeNull()
    expect(newId).not.toBe(id)
    expect(state.doc.items).toHaveLength(2)
    expect(state.selectedId).toBe(newId)
    const clone = state.doc.items.find((it) => it.id === newId)!
    expect(clone.x).toBeGreaterThan(8)
    expect(clone.y).toBeGreaterThan(8)
    expect((clone.block as { s: string }).s).toBe('orig')
  })

  it('duplicateItem returns null for an id that does not exist', () => {
    expect(useEditorStore.getState().duplicateItem('nope')).toBeNull()
  })

  it('duplicateItem is a single undo step', () => {
    const id = useEditorStore.getState().addBlock({ t: 't', s: 'orig' })
    const pastAfterAdd = useEditorStore.getState().past.length
    useEditorStore.getState().duplicateItem(id)
    expect(useEditorStore.getState().past.length).toBe(pastAfterAdd + 1)
    expect(useEditorStore.getState().doc.items).toHaveLength(2)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().doc.items).toHaveLength(1)
  })

  it('rotateItem cycles rotation clockwise through 0/90/180/270 and back to 0', () => {
    const id = useEditorStore.getState().addBlock({ t: 't', s: 'a' })
    expect(useEditorStore.getState().doc.items[0]!.rot).toBeUndefined()
    useEditorStore.getState().rotateItem(id)
    expect(useEditorStore.getState().doc.items[0]!.rot).toBe(90)
    useEditorStore.getState().rotateItem(id)
    expect(useEditorStore.getState().doc.items[0]!.rot).toBe(180)
    useEditorStore.getState().rotateItem(id)
    expect(useEditorStore.getState().doc.items[0]!.rot).toBe(270)
    useEditorStore.getState().rotateItem(id)
    expect(useEditorStore.getState().doc.items[0]!.rot).toBe(0)
  })

  it('rotateItem is undoable', () => {
    const id = useEditorStore.getState().addBlock({ t: 't', s: 'a' })
    useEditorStore.getState().rotateItem(id)
    expect(useEditorStore.getState().doc.items[0]!.rot).toBe(90)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().doc.items[0]!.rot).toBeUndefined()
  })
})
