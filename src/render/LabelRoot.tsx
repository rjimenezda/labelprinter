import type { LabelDoc } from '../codec/types'
import { d } from './units'
import { renderBlock } from './renderBlock'
import './label.css'

export interface LabelRootProps {
  doc: LabelDoc
}

/**
 * (doc) => ReactElement. The renderer contract:
 *   - pure and total: same doc -> byte-identical DOM, never throws;
 *     unrecognized content already became a placeholder during decode
 *     (see codec/normalize.ts), so this never has to guess.
 *   - no effects, no DOM measurement, no ambient nondeterminism (no
 *     Date.now(), no Math.random()) -- the label is complete on first
 *     paint, which is what makes it immune to whatever capture timing
 *     TinyPrint uses.
 *   - no async, no network -- QR/barcodes are synchronous inline SVG (see
 *     src/codegen/), fonts are system fonts. ImageBlock is the one
 *     deliberate exception: a plain <img src={url}>, best-effort only.
 *     It's an accepted trade-off (no proxy/hosting, so CORS or slow/failed
 *     loads just mean the image doesn't show up), not an oversight -- see
 *     codec/types.ts's ImageBlock doc.
 *   - every length on the page is either a literal dot value from the
 *     doc, or comes from render/tokens.ts -- never a raw px guess.
 *
 * Used identically by the viewer, the editor's live preview (via an
 * iframe so it exercises the real codec+viewport path), and eventually
 * the print simulator.
 */
export function LabelRoot({ doc }: LabelRootProps) {
  return (
    <div className="lp-root" style={{ width: d(doc.w), height: d(doc.h) }}>
      {[...doc.items]
        .sort((a, b) => a.z - b.z)
        .map((item) => (
          <div
            key={item.id}
            className="lp-item"
            style={{
              left: d(item.x),
              top: d(item.y),
              width: d(item.w),
              height: item.h !== undefined ? d(item.h) : undefined,
              zIndex: item.z,
              transform: item.rot ? `rotate(${item.rot}deg)` : undefined,
              transformOrigin: item.rot ? 'top left' : undefined,
            }}
          >
            {renderBlock(item.block, item.w, item.h)}
          </div>
        ))}
    </div>
  )
}
