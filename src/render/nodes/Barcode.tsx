import { useMemo } from 'react'
import type { BarcodeBlock } from '../../codec/types'
import { buildBarcode } from '../../codegen/barcode'
import { FONT_STACK_MONO } from '../tokens'
import { d } from '../units'

/** Same self-sizing rule as Qr -- width is derived from the encoded
 *  pattern length x module dots, never CSS-scaled to fit a target box. */
export function Barcode({ block }: { block: BarcodeBlock }) {
  const format = block.f ?? '128'
  const moduleDots = block.m ?? 2
  const heightDots = block.h ?? 80

  const result = useMemo(() => {
    try {
      return buildBarcode(block.d, format, moduleDots, heightDots)
    } catch {
      return null
    }
  }, [block.d, format, moduleDots, heightDots])

  if (!result) {
    return (
      <div className="lp-placeholder" style={{ width: d(200), height: d(heightDots) }}>
        invalid barcode data
      </div>
    )
  }

  return (
    <div style={{ display: 'inline-block' }}>
      <div dangerouslySetInnerHTML={{ __html: result.svg }} />
      {block.n ? (
        <p className="lp-text" style={{ fontFamily: FONT_STACK_MONO, fontSize: d(14), textAlign: 'center' }}>
          {block.d}
        </p>
      ) : null}
    </div>
  )
}
