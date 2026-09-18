import type { RuleBlock } from '../../codec/types'
import { STROKE_DEFAULT } from '../tokens'
import { d } from '../units'

const DASH_LEN = 8
const DASH_GAP = 6

export function Rule({ block, width }: { block: RuleBlock; width: number }) {
  const th = block.th ?? STROKE_DEFAULT

  if (block.s === 'dashed') {
    const segments = Math.max(1, Math.floor(width / (DASH_LEN + DASH_GAP)))
    return (
      <div style={{ width: d(width), height: d(th), whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className="lp-rule-dash"
            style={{ width: d(DASH_LEN), height: d(th), marginRight: i < segments - 1 ? d(DASH_GAP) : 0 }}
          />
        ))}
      </div>
    )
  }

  return <div className="lp-rule" style={{ width: d(width), height: d(th) }} />
}
