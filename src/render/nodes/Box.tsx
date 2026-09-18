import type { BoxBlock } from '../../codec/types'
import { STROKE_DEFAULT } from '../tokens'
import { d } from '../units'

export function Box({ block, width, height }: { block: BoxBlock; width: number; height?: number }) {
  const th = block.th ?? STROKE_DEFAULT
  const h = height !== undefined ? d(height) : '100%'
  if (block.fill) {
    return <div className="lp-box filled" style={{ width: d(width), height: h }} />
  }
  return <div className="lp-box" style={{ width: d(width), height: h, borderWidth: d(th) }} />
}
