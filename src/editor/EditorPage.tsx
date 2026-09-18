import { useState } from 'react'
import { SimPanel } from '../sim/SimPanel'
import { Canvas } from './Canvas'
import { Palette } from './Palette'
import { PropertiesPanel } from './PropertiesPanel'
import { ShareUrl } from './ShareUrl'
import { useEditorStore } from './store'

export function EditorPage() {
  const [zoom, setZoom] = useState(2)
  const [showSim, setShowSim] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const doc = useEditorStore((s) => s.doc)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const resetDoc = useEditorStore((s) => s.resetDoc)
  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)

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
          <button
            onClick={() => setShowSim((v) => !v)}
            aria-pressed={showSim}
            style={{ marginLeft: 12, background: showSim ? '#2266ff' : undefined, color: showSim ? '#fff' : undefined }}
          >
            {showSim ? 'Hide simulator' : 'Show simulator'}
          </button>
          <button
            onClick={() => setShowShare((v) => !v)}
            aria-pressed={showShare}
            style={{ background: showShare ? '#2266ff' : undefined, color: showShare ? '#fff' : undefined }}
          >
            {showShare ? 'Hide print panel' : 'Show print panel'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Palette />
        <Canvas zoom={zoom} />
        {showSim && <SimPanel doc={doc} />}
        <PropertiesPanel />
      </div>

      {showShare && <ShareUrl />}
    </div>
  )
}
