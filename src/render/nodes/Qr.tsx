import { useMemo } from 'react'
import type { QrBlock } from '../../codec/types'
import { buildQr } from '../../codegen/qr'
import { QR_MODULE_DEFAULT } from '../tokens'

/**
 * Renders at its own natural size (derived from module count x module
 * dots) rather than whatever the item's box says -- a QR must never be
 * CSS-scaled to fit an arbitrary width, that's exactly what breaks
 * integer module alignment. The editor is responsible for keeping the
 * item's w/h in sync with this size when the block changes.
 */
export function Qr({ block }: { block: QrBlock }) {
  const ec = block.e ?? 'M'
  const moduleDots = block.m ?? QR_MODULE_DEFAULT
  const { svg } = useMemo(() => buildQr(block.d, ec, moduleDots), [block.d, ec, moduleDots])
  return <div style={{ display: 'inline-block' }} dangerouslySetInnerHTML={{ __html: svg }} />
}
