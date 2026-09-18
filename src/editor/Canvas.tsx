import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Item } from '../codec/types'
import { LabelRoot } from '../render/LabelRoot'
import { useEditorStore } from './store'

const GRID_DOTS = 4

function snapToGrid(v: number): number {
  return Math.round(v / GRID_DOTS) * GRID_DOTS
}

/**
 * Free canvas: renders the doc through the exact same LabelRoot the
 * viewer uses (so what you see here is what prints), then overlays
 * transparent hit-test/handle boxes per item for drag and resize.
 */
export function Canvas({ zoom }: { zoom: number }) {
  const doc = useEditorStore((s) => s.doc)
  const selectedId = useEditorStore((s) => s.selectedId)
  const select = useEditorStore((s) => s.select)
  const beginGesture = useEditorStore((s) => s.beginGesture)
  const moveItemLive = useEditorStore((s) => s.moveItemLive)
  const resizeItemLive = useEditorStore((s) => s.resizeItemLive)

  const surfaceRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null)
  const resize = useRef<{ id: string; startX: number; startY: number; itemW: number; itemH: number } | null>(null)

  function onItemPointerDown(e: ReactPointerEvent, item: Item) {
    e.stopPropagation()
    select(item.id)
    beginGesture()
    drag.current = { id: item.id, startX: e.clientX, startY: e.clientY, itemX: item.x, itemY: item.y }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function onHandlePointerDown(e: ReactPointerEvent, item: Item) {
    e.stopPropagation()
    select(item.id)
    beginGesture()
    resize.current = { id: item.id, startX: e.clientX, startY: e.clientY, itemW: item.w, itemH: item.h ?? 40 }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (drag.current) {
      const dx = (e.clientX - drag.current.startX) / zoom
      const dy = (e.clientY - drag.current.startY) / zoom
      const x = Math.max(0, snapToGrid(drag.current.itemX + dx))
      const y = Math.max(0, snapToGrid(drag.current.itemY + dy))
      moveItemLive(drag.current.id, x, y)
    } else if (resize.current) {
      const dx = (e.clientX - resize.current.startX) / zoom
      const dy = (e.clientY - resize.current.startY) / zoom
      const w = Math.max(GRID_DOTS, snapToGrid(resize.current.itemW + dx))
      const h = Math.max(GRID_DOTS, snapToGrid(resize.current.itemH + dy))
      resizeItemLive(resize.current.id, w, h)
    }
  }

  function onPointerUp() {
    drag.current = null
    resize.current = null
  }

  // Also clear on cancel: touch browsers fire pointercancel (rather than
  // pointerup) when they decide to hand the gesture to something else
  // (e.g. a system back-swipe or an interrupting UI), which would
  // otherwise leave drag/resize "stuck" for the next touch.
  function onPointerCancel() {
    drag.current = null
    resize.current = null
  }

  return (
    <div
      style={{
        overflow: 'auto',
        background: '#e8e8e8',
        padding: 24,
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
      onPointerDown={() => select(null)}
    >
      <div
        style={{
          position: 'relative',
          width: doc.w * zoom,
          height: doc.h * zoom,
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          ref={surfaceRef}
          style={{ width: doc.w, height: doc.h, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
          <LabelRoot doc={doc} />
        </div>

        {/* Selection/drag/resize overlay -- kept entirely separate from
            LabelRoot's own DOM so the print-path markup never carries
            editor-only elements. */}
        {doc.items.map((item) => (
          <div
            key={item.id}
            onPointerDown={(e) => onItemPointerDown(e, item)}
            style={{
              position: 'absolute',
              left: item.x * zoom,
              top: item.y * zoom,
              width: item.w * zoom,
              height: (item.h ?? 40) * zoom,
              border: item.id === selectedId ? '2px solid #2266ff' : '2px solid transparent',
              cursor: 'move',
              boxSizing: 'border-box',
              // Without this, touch browsers treat a finger-down-and-move
              // on the item as a scroll/pan gesture and steal it before our
              // pointermove handler sees a usable stream of events -- drags
              // stutter or never start on touch devices.
              touchAction: 'none',
            }}
          >
            {item.id === selectedId && (
              <div
                onPointerDown={(e) => onHandlePointerDown(e, item)}
                style={{
                  position: 'absolute',
                  right: -14,
                  bottom: -14,
                  // Larger than the visual handle so it's actually hittable
                  // with a fingertip; the visual square stays centered in it.
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'nwse-resize',
                  touchAction: 'none',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    background: '#2266ff',
                    borderRadius: 3,
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
