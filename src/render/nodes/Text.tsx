import type { TextBlock } from '../../codec/types'
import { FONT_BODY, FONT_STACK_MONO, FONT_STACK_SANS } from '../tokens'
import { d } from '../units'

export function Text({ block }: { block: TextBlock }) {
  const fontSize = block.z ?? FONT_BODY
  return (
    <p
      className={block.i ? 'lp-text inverted' : 'lp-text'}
      style={{
        fontSize: d(fontSize),
        fontWeight: block.bd ? 700 : 400,
        textAlign: block.a === 'c' ? 'center' : block.a === 'r' ? 'right' : 'left',
        fontFamily: block.f === 'm' ? FONT_STACK_MONO : FONT_STACK_SANS,
        lineHeight: block.lh !== undefined ? d(block.lh) : undefined,
      }}
    >
      {block.s}
    </p>
  )
}
