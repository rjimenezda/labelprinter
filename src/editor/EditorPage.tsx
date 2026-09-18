import { useEffect, useRef, useState } from 'react'
import { decodePayload } from '../codec/decode'
import { encodeDoc } from '../codec/encode'
import { buildEditorHash } from '../router/route'
import { Canvas } from './Canvas'
import { Palette } from './Palette'
import { PropertiesPanel } from './PropertiesPanel'
import { ShareUrl } from './ShareUrl'
import { useEditorStore } from './store'
import { ACCENT } from './theme'

// Doc changes fire on every pointermove during a drag/resize (see
// Canvas.tsx's moveItemLive/resizeItemLive) -- re-encoding (JSON +
// zlib) on each of those would both waste work and thrash the URL bar.
// Settling for a moment after activity stops keeps the URL a faithful
// "reload restores this" snapshot without doing that on every frame.
const URL_SYNC_DEBOUNCE_MS = 400

export function EditorPage({ initialPayload }: { initialPayload?: string }) {
  const [zoom, setZoom] = useState(2)
  const [showShare, setShowShare] = useState(false)
  const shareAnchorRef = useRef<HTMLDivElement>(null)
  const doc = useEditorStore((s) => s.doc)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const resetDoc = useEditorStore((s) => s.resetDoc)
  const replaceDoc = useEditorStore((s) => s.replaceDoc)
  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)

  // Restore from the URL once, on mount -- this is what makes a reload
  // (or a bookmarked/shared editor link) come back to the same label
  // instead of a blank one.
  useEffect(() => {
    if (!initialPayload) return
    const result = decodePayload(initialPayload)
    if (result.ok) replaceDoc(result.doc)
    // Deliberately empty deps: this is a one-time restore for whatever
    // hash the page happened to load with, not a live binding -- the
    // effect below is what keeps the URL in sync going forward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the URL in sync with the doc so a reload never loses work.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const hash = buildEditorHash(encodeDoc(doc))
      if (window.location.hash !== hash) window.history.replaceState(null, '', hash)
    }, URL_SYNC_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [doc])

  // Floating popover, not a modal: dismiss on an outside click or Escape,
  // same as any other transient menu.
  useEffect(() => {
    if (!showShare) return
    function onPointerDown(e: PointerEvent) {
      if (shareAnchorRef.current && !shareAnchorRef.current.contains(e.target as Node)) {
        setShowShare(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowShare(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showShare])

  return (
    <div className="lp-app-shell" style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid #ddd',
          background: '#fff',
        }}
      >
        <strong style={{ fontSize: 14, marginRight: 8 }}>labelprinter</strong>
        <button onClick={undo} disabled={!canUndo}>
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo}>
          Redo
        </button>
        <button
          onClick={() => {
            if (confirm('Start a new, empty label? This clears the current one.')) resetDoc()
          }}
        >
          New label
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#888' }}>Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.5}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <div ref={shareAnchorRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowShare((v) => !v)}
              aria-pressed={showShare}
              style={{ marginLeft: 12, background: showShare ? ACCENT : undefined, color: showShare ? '#fff' : undefined }}
            >
              {showShare ? 'Hide print panel' : 'Show print panel'}
            </button>
            {showShare && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  padding: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  zIndex: 20,
                }}
              >
                <ShareUrl />
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Palette />
        <Canvas zoom={zoom} />
        <PropertiesPanel />
      </div>
    </div>
  )
}
