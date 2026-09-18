import type { IconBlock } from '../../codec/types'
import { STROKE_DEFAULT } from '../tokens'

/**
 * `block.d` was already sanitized to an allowlist of shape elements/
 * colors at decode time (see codec/sanitizeSvg.ts) -- that's what makes
 * trusting it here safe.
 *
 * Two render modes, matching how each bundled library authors its icons:
 *   - stroke (default, e.g. Lucide): wrapper forces fill=none,
 *     stroke=#000/{th} so pure-outline paths (which carry no color of
 *     their own) become visible black lines.
 *   - fill (block.fill === 1, e.g. Phosphor's fill weight, Game Icons,
 *     OpenMoji): wrapper defaults to fill=#000/stroke=none, matching
 *     SVG's own initial values -- letting solid-shape icons render
 *     correctly, while OpenMoji's occasional per-element fill="none"
 *     stroke="#000" override still takes precedence where authored.
 */
export function Icon({ block, height }: { block: IconBlock; height: number | undefined }) {
  const th = block.th ?? STROKE_DEFAULT
  const vb = block.vb ?? '0 0 24 24'
  const wrapperProps = block.fill === 1 ? { fill: '#000000', stroke: 'none' } : { fill: 'none', stroke: '#000000' }

  return (
    <svg
      viewBox={vb}
      style={{ display: 'block', width: '100%', height: height !== undefined ? '100%' : 'auto' }}
      {...wrapperProps}
      strokeWidth={th}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: block.d }}
    />
  )
}
