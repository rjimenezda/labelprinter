import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
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
  const cropItemLive = useEditorStore((s) => s.cropItemLive)
  const removeItem = useEditorStore((s) => s.removeItem)
  const bringToFront = useEditorStore((s) => s.bringToFront)
  const sendToBack = useEditorStore((s) => s.sendToBack)

  // In-place image crop: dragging the item pans the photo instead of
  // moving it, and a zoom slider replaces the usual toolbar (see
  // enterCrop below). Only ever "live" while the cropped item is also
  // the selection -- deselecting or picking another item falls straight
  // back out of crop mode without a separate effect to reset it.
  const [cropId, setCropId] = useState<string | null>(null)
  const croppingItemId = cropId && cropId === selectedId ? cropId : null

  const surfaceRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null)
  const resize = useRef<{ id: string; startX: number; startY: number; itemW: number; itemH: number } | null>(null)
  const rotate = useRef<{ id: string } | null>(null)
  const cropDrag = useRef<{ id: string; startX: number; startY: number; startOx: number; startOy: number; s: number } | null>(
    null,
  )

  useEffect(() => {
    if (!croppingItemId) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setCropId(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [croppingItemId])

  function enterCrop(item: Item) {
    if (item.block.t !== 'i') return
    beginGesture()
    if (item.h === undefined) {
      // Crop needs a fixed frame to pan/zoom within -- lock in whatever
      // height the image currently renders at (its natural aspect at the
      // item's width) rather than an arbitrary default.
      const imgEl = surfaceRef.current?.querySelector<HTMLElement>(`[data-item-id="${item.id}"] img`)
      const rectH = imgEl?.getBoundingClientRect().height
      const h = rectH ? Math.max(GRID_DOTS, snapToGrid(rectH / zoom)) : item.w
      resizeItemLive(item.id, item.w, h)
    }
    if (!item.block.crop) cropItemLive(item.id, { s: 1, ox: 0, oy: 0 })
    select(item.id)
    setCropId(item.id)
  }

  function onItemPointerDown(e: ReactPointerEvent, item: Item) {
    e.stopPropagation()
    select(item.id)
    if (croppingItemId === item.id && item.block.t === 'i') {
      beginGesture()
      const crop = item.block.crop ?? { s: 1, ox: 0, oy: 0 }
      cropDrag.current = { id: item.id, startX: e.clientX, startY: e.clientY, startOx: crop.ox, startOy: crop.oy, s: crop.s }
      ;(e.target as Element).setPointerCapture(e.pointerId)
      return
    }
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
    } else if (cropDrag.current) {
      const item = doc.items.find((it) => it.id === cropDrag.current!.id)
      if (item && item.block.t === 'i') {
        const { s, startX, startY, startOx, startOy } = cropDrag.current
        const boxW = item.w * zoom
        const boxH = (item.h ?? 40) * zoom
        // The zoomed-in slack on each side is (s-1)/2 of the frame -- pan
        // is clamped there so the frame stays fully covered (see
        // codec/types.ts's `crop` doc and render/nodes/Image.tsx).
        const maxOff = (s - 1) / 2
        const ox = clamp(startOx + (e.clientX - startX) / boxW, -maxOff, maxOff)
        const oy = clamp(startOy + (e.clientY - startY) / boxH, -maxOff, maxOff)
        cropItemLive(item.id, { s, ox, oy })
      }
    }
  }

  function onPointerUp() {
    drag.current = null
    resize.current = null
    rotate.current = null
    cropDrag.current = null
  }

  // Also clear on cancel: touch browsers fire pointercancel (rather than
  // pointerup) when they decide to hand the gesture to something else
  // (e.g. a system back-swipe or an interrupting UI), which would
  // otherwise leave drag/resize/rotate "stuck" for the next touch.
  function onPointerCancel() {
    drag.current = null
    resize.current = null
    rotate.current = null
    cropDrag.current = null
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
        {doc.items.map((item) => {
          const isCropping = croppingItemId === item.id
          return (
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
                  cursor: isCropping ? 'grab' : 'move',
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
                {item.id === selectedId && !isCropping && (
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

                {item.id === selectedId && !isCropping && (
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

              {item.id === selectedId && !isCropping && (
                <ItemToolbar
                  item={item}
                  zoom={zoom}
                  onDuplicate={() => duplicateItem(item.id)}
                  onCrop={item.block.t === 'i' ? () => enterCrop(item) : undefined}
                  onFront={() => bringToFront(item.id)}
                  onBack={() => sendToBack(item.id)}
                  onDelete={() => removeItem(item.id)}
                />
              )}

              {isCropping && item.block.t === 'i' && (
                <CropToolbar
                  item={item}
                  zoom={zoom}
                  scale={item.block.crop?.s ?? 1}
                  onZoom={(s) => {
                    const crop = item.block.t === 'i' ? item.block.crop : undefined
                    const maxOff = (s - 1) / 2
                    cropItemLive(item.id, {
                      s,
                      ox: clamp(crop?.ox ?? 0, -maxOff, maxOff),
                      oy: clamp(crop?.oy ?? 0, -maxOff, maxOff),
                    })
                  }}
                  onZoomStart={beginGesture}
                  onDone={() => setCropId(null)}
                />
              )}
            </div>
          )
        })}
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
function toolbarTop(item: Item, zoom: number, reserveAbove: number): number {
  const above = item.y * zoom - reserveAbove
  if (above >= 0) return above
  return (item.y + (item.h ?? 40)) * zoom + TOOLBAR_GAP
}

function ItemToolbar({
  item,
  zoom,
  onDuplicate,
  onCrop,
  onFront,
  onBack,
  onDelete,
}: {
  item: Item
  zoom: number
  onDuplicate: () => void
  onCrop?: () => void
  onFront: () => void
  onBack: () => void
  onDelete: () => void
}) {
  const top = toolbarTop(item, zoom, ROTATE_HANDLE_OFFSET + TOOLBAR_GAP + TOOLBAR_HEIGHT)
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
        top,
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
      {onCrop && (
        <ToolbarButton title="Crop" onClick={onCrop}>
          ⛶
        </ToolbarButton>
      )}
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

/** Replaces ItemToolbar while an image is being cropped: a zoom slider
 *  plus Done, anchored the same way (flips below when it doesn't fit
 *  above) but without the rotate handle's clearance, since the rotate
 *  handle itself is hidden during crop. */
function CropToolbar({
  item,
  zoom,
  scale,
  onZoom,
  onZoomStart,
  onDone,
}: {
  item: Item
  zoom: number
  scale: number
  onZoom: (s: number) => void
  onZoomStart: () => void
  onDone: () => void
}) {
  const top = toolbarTop(item, zoom, TOOLBAR_GAP + TOOLBAR_HEIGHT)
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: item.x * zoom,
        top,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#222',
        borderRadius: 6,
        padding: '4px 8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        touchAction: 'none',
        zIndex: 10,
      }}
    >
      <span style={{ fontSize: 11, color: '#fff' }} title="Zoom">
        🔍
      </span>
      <input
        type="range"
        min={1}
        max={3}
        step={0.02}
        value={scale}
        onPointerDown={onZoomStart}
        onChange={(e) => onZoom(Number(e.target.value))}
        style={{ width: 100 }}
      />
      <button
        onClick={onDone}
        style={{
          border: 'none',
          borderRadius: 4,
          background: ACCENT,
          color: '#fff',
          fontSize: 12,
          padding: '4px 10px',
          cursor: 'pointer',
        }}
      >
        Done
      </button>
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
