import { buildBarcode } from '../codegen/barcode'
import { buildQr } from '../codegen/qr'
import type { Block } from '../codec/types'
import { QR_MODULE_DEFAULT } from '../render/tokens'

/**
 * QR and barcode items self-size from their encoded content (see
 * render/nodes/Qr.tsx and Barcode.tsx -- module size drives width, never
 * the reverse). The editor has to keep item.w/h in sync with that
 * computed size whenever the block's data/module/format changes, so
 * selection boxes and drag/resize hit-testing stay correct.
 */
export function computeItemSize(block: Block): { w?: number; h?: number } {
  switch (block.t) {
    case 'q': {
      try {
        const { widthDots } = buildQr(block.d || ' ', block.e ?? 'M', block.m ?? QR_MODULE_DEFAULT)
        return { w: widthDots, h: widthDots }
      } catch {
        return { w: 100, h: 100 }
      }
    }
    case 'c': {
      try {
        const { widthDots, heightDots } = buildBarcode(block.d || '0', block.f ?? '128', block.m ?? 2, block.h ?? 80)
        return { w: widthDots, h: heightDots + (block.n ? 24 : 0) }
      } catch {
        return { w: 200, h: block.h ?? 80 }
      }
    }
    case 'p':
      // Just a sensible default on add -- unlike QR/barcode this isn't
      // re-locked on every edit (see store.ts's updateBlock), so the
      // user can freely resize it afterward like a Text or Image item.
      return { w: 120 }
    case 'k':
      return { w: 48, h: 48 }
    default:
      return {}
  }
}
