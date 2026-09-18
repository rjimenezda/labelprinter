import { useEffect, useRef, useState } from 'react'
import type { LabelDoc } from '../codec/types'
import { DOTS_PER_MM } from '../render/tokens'
import { toOneBit } from './dither'
import { rasterizeToCanvas } from './rasterize'

/**
 * Threshold-only 1-bit preview (per the Phase 1 plan -- full dither modes
 * land once P3 conclusively identifies which algorithm TinyPrint uses).
 * This exists to make the probe findings actionable on the laptop instead
 * of only interpretable after wasting paper: it's a prediction to diff
 * against the next real print, not a guarantee of what TinyPrint does.
 *
 * Rendered as a single canvas at native (doc.w x doc.h) resolution, then
 * CSS-scaled to a chosen zoom with `image-rendering: pixelated` -- one
 * source of truth rather than separate "1x" and "3x" canvases, so it
 * fits a narrow side panel and scales to whatever the label's actual
 * width is.
 */
// Enough side padding/border/scrollbar allowance that a full-width label
// fits at 1x zoom without needing to scroll -- that's the whole point of
// a "preview," so the panel is sized to the doc rather than a fixed
// narrow column that immediately clips it.
const PANEL_CHROME = 56

export function SimPanel({ doc }: { doc: LabelDoc }) {
  const [threshold, setThreshold] = useState(128)
  const [simZoom, setSimZoom] = useState(1)
  const [error, setError] = useState<string | null>(null)
  // Distinct from `error`: the render itself succeeded, but reading pixels
  // back (needed for the 1-bit threshold) failed -- almost always an
  // image block loaded from a URL without permissive CORS headers, which
  // taints the canvas for readback. Not fatal: real prints don't go
  // through a browser canvas at all, so this only affects the preview.
  const [readbackWarning, setReadbackWarning] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    rasterizeToCanvas(doc)
      .then((source) => {
        if (cancelled) return
        const out = canvasRef.current
        if (!out) return
        out.width = source.width
        out.height = source.height
        const outCtx = out.getContext('2d')!

        try {
          const raw = source.getContext('2d')!.getImageData(0, 0, source.width, source.height)
          outCtx.putImageData(toOneBit(raw, threshold), 0, 0)
          setReadbackWarning(null)
        } catch {
          // Tainted canvas (almost certainly a cross-origin image without
          // CORS headers) -- drawImage compositing still works even
          // though pixel readback doesn't, so show the untresholded
          // render rather than nothing.
          outCtx.drawImage(source, 0, 0)
          setReadbackWarning(
            '1-bit preview unavailable for this label (likely a cross-origin image without CORS headers) -- showing an unthresholded render instead. This only affects the preview, not the real print.',
          )
        }
        setError(null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [doc, threshold])

  const paperLengthMm = (doc.h / DOTS_PER_MM).toFixed(1)
  const panelWidth = Math.max(320, doc.w + PANEL_CHROME)

  return (
    <div
      style={{
        width: panelWidth,
        flexShrink: 0,
        borderLeft: '1px solid #ddd',
        background: '#fafafa',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 12px 0' }}>
        <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>
          Print simulator
        </h3>
        <p style={{ fontSize: 11, color: '#999', margin: '0 0 8px' }}>
          1-bit threshold preview -- a prediction, not a guarantee of the real print.
        </p>
      </div>

      {error ? (
        <p style={{ color: '#c00', fontSize: 12, padding: '0 12px' }}>Could not render preview: {error}</p>
      ) : (
        <>
          {readbackWarning && (
            <p style={{ color: '#a06a00', fontSize: 11, padding: '0 12px 8px' }}>{readbackWarning}</p>
          )}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 12px', background: '#e8e8e8' }}>
            <canvas
              ref={canvasRef}
              style={{
                width: doc.w * simZoom,
                height: doc.h * simZoom,
                imageRendering: 'pixelated',
                display: 'block',
                border: '1px solid #ccc',
                background: '#fff',
              }}
            />
          </div>

          <div style={{ padding: 12, borderTop: '1px solid #ddd' }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
              Zoom: {simZoom}&times;
              <input
                type="range"
                min={1}
                max={6}
                step={0.5}
                value={simZoom}
                onChange={(e) => setSimZoom(Number(e.target.value))}
                style={{ display: 'block', width: '100%' }}
              />
            </label>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
              Threshold: {threshold}
              <input
                type="range"
                min={1}
                max={254}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                style={{ display: 'block', width: '100%' }}
              />
            </label>
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
              {doc.w}&times;{doc.h} dots &middot; paper length {paperLengthMm}mm
            </p>
          </div>
        </>
      )}
    </div>
  )
}
