import type { ImageBlock } from '../../codec/types'
import { cropImgStyle } from '../cropStyle'

/**
 * Best-effort image -- see codec/types.ts's ImageBlock doc for the
 * accepted trade-off (no proxy/hosting; CORS or a slow/failed load just
 * means it doesn't show up). onError hides the element instead of
 * leaving a broken-image glyph on the label.
 */
export function Image({ block, height }: { block: ImageBlock; height: number | undefined }) {
  return (
    <img
      src={block.d}
      alt=""
      style={{
        display: 'block',
        width: '100%',
        height: height !== undefined ? '100%' : 'auto',
        objectFit: block.fit ?? 'contain',
        ...cropImgStyle(block.crop),
      }}
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden'
      }}
    />
  )
}
