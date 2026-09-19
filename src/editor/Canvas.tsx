import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { Item } from '../codec/types'
import { LabelRoot } from '../render/LabelRoot'
import { useEditorStore } from './store'
import { ACCENT } from './theme'

const GRID_DOTS = 4
// Distance from the item's top edge to the rotate handle's circle, in
// screen pixels (not zoom-scaled dots -- this is a fixed-size UI affordance).
const ROTATE_HANDLE_OFFSET = 32

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
  const duplicateItem = useEditorStore((s) => s.duplicateItem)
  const rotateItemLive = useEditorStore((s) => s.rotateItemLive)
  const removeItem = useEditorStore((s) => s.removeItem)
  const bringToFront = useEditorStore((s) => s.bringToFront)
  const sendToBack = useEditorStore((s) => s.sendToBack)

  const surfaceRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null)
  const resize = useRef<{ id: string; startX: number; startY: number; itemW: number; itemH: number } | null>(null)
  const rotate = useRef<{ id: string } | null>(null)

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

  function onRotateHandlePointerDown(e: ReactPointerEvent, item: Item) {
    e.stopPropagation()
    select(item.id)
    beginGesture()
    rotate.current = { id: item.id }
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
    } else if (rotate.current) {
      const item = doc.items.find((it) => it.id === rotate.current!.id)
      const box = boxRef.current
      if (item && box) {
        const rect = box.getBoundingClientRect()
        const centerX = rect.left + (item.x + item.w / 2) * zoom
        const centerY = rect.top + (item.y + (item.h ?? 40) / 2) * zoom
        // atan2's 0deg points along +x (right); the handle sits above the
        // item's center (-y), so add 90 to make "pointer straight up" the
        // zero-rotation position.
        let deg = (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI + 90
        if (e.shiftKey) deg = Math.round(deg / 15) * 15
        rotateItemLive(rotate.current.id, deg)
      }
    }
  }

  function onPointerUp() {
    drag.current = null
    resize.current = null
    rotate.current = null
  }

  // Also clear on cancel: touch browsers fire pointercancel (rather than
  // pointerup) when they decide to hand the gesture to something else
  // (e.g. a system back-swipe or an interrupting UI), which would
  // otherwise leave drag/resize/rotate "stuck" for the next touch.
  function onPointerCancel() {
    drag.current = null
    resize.current = null
    rotate.current = null
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
        ref={boxRef}
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
          <div key={item.id}>
            <div
              onPointerDown={(e) => onItemPointerDown(e, item)}
              style={{
                position: 'absolute',
                left: item.x * zoom,
                top: item.y * zoom,
                width: item.w * zoom,
                height: (item.h ?? 40) * zoom,
                border: item.id === selectedId ? `1.5px dashed ${ACCENT}` : '1.5px solid transparent',
                cursor: 'move',
                boxSizing: 'border-box',
                // Without this, touch browsers treat a finger-down-and-move
                // on the item as a scroll/pan gesture and steal it before our
                // pointermove handler sees a usable stream of events -- drags
                // stutter or never start on touch devices.
                touchAction: 'none',
                // Same transform LabelRoot applies to the item it wraps, so
                // the selection border/resize/rotate handles visually track
                // the rendered (possibly rotated) content instead of
                // framing its unrotated footprint.
                transform: item.rot ? `rotate(${item.rot}deg)` : undefined,
                transformOrigin: item.rot ? 'center' : undefined,
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
                      background: ACCENT,
                      borderRadius: 3,
                    }}
                  />
                </div>
              )}

              {item.id === selectedId && (
                <div
                  role="button"
                  aria-label="Rotate"
                  onPointerDown={(e) => onRotateHandlePointerDown(e, item)}
                  onDoubleClick={() => {
                    beginGesture()
                    rotateItemLive(item.id, 0)
                  }}
                  title="Drag to rotate -- hold Shift to snap to 15deg, double-click to reset"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -ROTATE_HANDLE_OFFSET,
                    width: 32,
                    height: ROTATE_HANDLE_OFFSET,
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'grab',
                    touchAction: 'none',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: ACCENT,
                      border: '2px solid #fff',
                      boxShadow: `0 0 0 1px ${ACCENT}`,
                    }}
                  />
                  <div style={{ width: 2, flex: 1, background: ACCENT }} />
                </div>
              )}
            </div>

            {item.id === selectedId && (
              <ItemToolbar
                item={item}
                zoom={zoom}
                onDuplicate={() => duplicateItem(item.id)}
                onFront={() => bringToFront(item.id)}
                onBack={() => sendToBack(item.id)}
                onDelete={() => removeItem(item.id)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const TOOLBAR_HEIGHT = 32
const TOOLBAR_GAP = 6

/**
 * Anchored above the item by default (clearing the rotate handle), but
 * flips to sit below it when there isn't enough room above -- an item
 * near the top of the label would otherwise render partly above the
 * canvas's own scroll area and get clipped/hidden behind the app's top
 * bar.
 */
function toolbarTop(item: Item, zoom: number): number {
  const above = item.y * zoom - ROTATE_HANDLE_OFFSET - TOOLBAR_GAP - TOOLBAR_HEIGHT
  if (above >= 0) return above
  return (item.y + (item.h ?? 40)) * zoom + TOOLBAR_GAP
}

/**
 * Anchored to the item's unrotated top-left x -- rather than tracking
 * rotated content, simple and correct for the common rot=0 case; for a
 * heavily rotated item the toolbar sits over the item's stored frame
 * rather than hugging its rotated visual footprint, which is an accepted
 * trade-off over the complexity of computing a rotated bounding box.
 */
function ItemToolbar({
  item,
  zoom,
  onDuplicate,
  onFront,
  onBack,
  onDelete,
}: {
  item: Item
  zoom: number
  onDuplicate: () => void
  onFront: () => void
  onBack: () => void
  onDelete: () => void
}) {
  return (
    <div
      // Stop pointerdown from reaching the canvas's own onPointerDown
      // (select(null)) or the item overlay's drag handler underneath --
      // otherwise tapping a button deselects (unmounting the toolbar)
      // before its click ever fires.
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: item.x * zoom,
        top: toolbarTop(item, zoom),
        display: 'flex',
        gap: 4,
        background: '#222',
        borderRadius: 6,
        padding: 4,
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        touchAction: 'none',
        zIndex: 10,
      }}
    >
      <ToolbarButton title="Duplicate" onClick={onDuplicate}>
        ⧉
      </ToolbarButton>
      <ToolbarButton title="Bring to front" onClick={onFront}>
        ⬆
      </ToolbarButton>
      <ToolbarButton title="Send to back" onClick={onBack}>
        ⬇
      </ToolbarButton>
      <ToolbarButton title="Delete" onClick={onDelete} danger>
        🗑
      </ToolbarButton>
    </div>
  )
}

function ToolbarButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      style={{
        width: 28,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 4,
        background: 'transparent',
        color: danger ? '#ff6b6b' : '#fff',
        fontSize: 14,
        lineHeight: 1,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
