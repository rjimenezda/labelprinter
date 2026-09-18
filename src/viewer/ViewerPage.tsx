import { useMemo } from 'react'
import { decodePayload } from '../codec/decode'
import { getIconAttributions } from '../render/iconAttribution'
import { LabelRoot } from '../render/LabelRoot'
import { d } from '../render/units'

/**
 * The whole point of the project: decode + render happen synchronously,
 * in the first render pass, with no effects and no async work in
 * between -- the label must be complete on first paint, immune to
 * whatever instant TinyPrint's capture actually happens at.
 */
export function ViewerPage({ payload }: { payload: string }) {
  const result = useMemo(() => decodePayload(payload), [payload])
  const attributions = useMemo(() => (result.ok ? getIconAttributions(result.doc) : []), [result])

  if (!result.ok) {
    return (
      <div
        style={{
          width: 384,
          background: '#fff',
          color: '#000',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
          padding: 16,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ background: '#000', color: '#fff', fontWeight: 700, padding: '4px 8px', marginBottom: 8 }}>
          CANNOT RENDER
        </div>
        <p style={{ margin: 0, fontSize: 16 }}>{result.message}</p>
        <p style={{ margin: '8px 0 0', fontSize: 11, fontFamily: 'monospace', color: '#555' }}>
          code: {result.code}
        </p>
      </div>
    )
  }

  return (
    <>
      <LabelRoot doc={result.doc} />
      {attributions.length > 0 && (
        <p
          style={{
            width: d(result.doc.w),
            margin: 0,
            padding: '2px 4px',
            fontSize: 9,
            lineHeight: 1.3,
            color: '#000',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
            boxSizing: 'border-box',
          }}
        >
          {attributions.join(' -- ')}
        </p>
      )}
    </>
  )
}
