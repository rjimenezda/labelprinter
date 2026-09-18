import JsBarcode from 'jsbarcode'
import { rectsToPath, svgWrap, type Rect } from './svg'

/**
 * Uses JsBarcode's own encoder (battle-tested Code128/39/EAN13 logic) via
 * its "object" renderer -- passing a plain {} instead of a DOM element
 * makes JsBarcode skip all DOM work entirely and just attach the computed
 * `encodings` (a binary bar/space string, one character per narrow-module
 * unit) to that object. We then draw our own merged-path SVG from that
 * binary string, snapped to integer dots, rather than using JsBarcode's
 * own SVG renderer -- keeping codegen/ pure-data and consistent with the
 * QR renderer.
 *
 * Bundle-size note: this pulls in the whole jsbarcode package (~40kB
 * unminified) rather than a per-symbology deep import (~10-12kB), because
 * jsbarcode's internal encoder classes are undocumented/unstable
 * implementation details -- reaching into them directly is the kind of
 * "reverse-engineer an internal API" risk not worth taking for a single
 * block type. The public ObjectRenderer path is intended, documented
 * usage. Revisit if bundle size becomes a measured problem.
 */

const FORMAT_MAP = { '128': 'CODE128', '39': 'CODE39', ean13: 'EAN13' } as const

export interface BarcodeResult {
  svg: string
  /** Bar rects -- see qr.ts's QrResult.rects for why this is exposed
   *  separately (lets the canvas simulator fillRect directly instead of
   *  loading an <img> or depending on Path2D). */
  rects: Rect[]
  widthDots: number
  heightDots: number
}

interface JsBarcodeEncoding {
  data: string
  text: string
}

export function buildBarcode(
  data: string,
  format: '128' | '39' | 'ean13' = '128',
  moduleDots = 2,
  heightDots = 80,
): BarcodeResult {
  const target: { encodings?: JsBarcodeEncoding[] } = {}
  JsBarcode(target, data, { format: FORMAT_MAP[format], displayValue: false })
  const encoding = target.encodings?.[0]
  if (!encoding) {
    throw new Error(`Barcode encoding failed for format ${format}`)
  }

  const bin = encoding.data
  const md = Math.max(1, Math.round(moduleDots))
  const widthDots = bin.length * md
  const hd = Math.max(1, Math.round(heightDots))

  const rects: Rect[] = []
  let i = 0
  while (i < bin.length) {
    if (bin[i] !== '1') {
      i++
      continue
    }
    const start = i
    while (i < bin.length && bin[i] === '1') i++
    const runLen = i - start
    rects.push({ x: start * md, y: 0, w: runLen * md, h: hd })
  }

  const svg = svgWrap(
    widthDots,
    hd,
    `<rect width="${widthDots}" height="${hd}" fill="#ffffff"/><path d="${rectsToPath(rects)}" fill="#000000"/>`,
  )
  return { svg, rects, widthDots, heightDots: hd }
}
