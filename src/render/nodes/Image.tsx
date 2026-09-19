import type { ImageBlock } from '../../codec/types'

/**
 * Best-effort image -- see codec/types.ts's ImageBlock doc for the
 * accepted trade-off (no proxy/hosting; CORS or a slow/failed load just
 * means it doesn't show up). onError hides the element instead of
 * leaving a broken-image glyph on the label.
 */
export function Image({ block, height }: { block: ImageBlock; height: number | undefined }) {
  const crop = block.crop
  const fit = crop ? 'cover' : block.fit ?? 'contain'
  return (
    <img
      src={block.d}
      alt=""
      style={{
        display: 'block',
        width: '100%',
        height: height !== undefined ? '100%' : 'auto',
        objectFit: fit,
        // Listed as translate-then-scale so the pan offset (a % of the
        // element's own, pre-transform box) lands in screen space *after*
        // the zoom -- see codec/types.ts's `crop` doc for the clamp math
        // this assumes.
        transform: crop ? `translate(${crop.ox * 100}%, ${crop.oy * 100}%) scale(${crop.s})` : undefined,
      }}
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden'
      }}
    />
  )
}
