import qrcodegen from 'qrcode-generator'
import { QR_MODULE_MIN } from '../render/tokens'
import { moduleGridToRects, rectsToPath, svgWrap, type Rect } from './svg'

export interface QrResult {
  svg: string
  /** Dark-module rects -- exposed separately so the canvas simulator can
   *  `ctx.fillRect()` each one directly instead of loading the SVG as an
   *  <img> (which taints the canvas on readback in Safari whenever the
   *  source SVG contains a foreignObject elsewhere in the document) or
   *  depending on Path2D (not universally available -- notably absent
   *  from Node's `canvas` package, and not guaranteed on an unknown
   *  WebView either). */
  rects: Rect[]
  widthDots: number
  moduleDots: number
  moduleCount: number
}

/**
 * A QR's rendered width is DERIVED from an integer module size, never the
 * reverse -- a QR scaled by a fractional factor produces modules of
 * alternating pixel sizes and scan reliability craters. `moduleDots` here
 * is ground truth (it's what the doc's QrBlock.m field stores); this
 * function computes the resulting exact width.
 */
export function buildQr(
  data: string,
  ec: 'L' | 'M' | 'Q' | 'H' = 'M',
  moduleDots: number = QR_MODULE_MIN,
  quiet = 4,
): QrResult {
  const qr = qrcodegen(0, ec)
  qr.addData(data)
  qr.make()
  const moduleCount = qr.getModuleCount()
  const md = Math.max(QR_MODULE_MIN, Math.round(moduleDots))
  const totalModules = moduleCount + quiet * 2
  const widthDots = md * totalModules

  const rects = moduleGridToRects((r, c) => qr.isDark(r, c), moduleCount, md, quiet * md, quiet * md)
  const svg = svgWrap(
    widthDots,
    widthDots,
    `<rect width="${widthDots}" height="${widthDots}" fill="#ffffff"/><path d="${rectsToPath(rects)}" fill="#000000"/>`,
  )
  return { svg, rects, widthDots, moduleDots: md, moduleCount: totalModules }
}

/**
 * Editor-side helper: given a desired on-canvas width, suggest an integer
 * module size that fits it as closely as possible (still floored at
 * QR_MODULE_MIN). Used when the user resizes a QR item -- the codec
 * itself only ever stores `m` (module dots), never a target width.
 */
export function fitQrModuleDots(targetWidthDots: number, moduleCount: number, quiet = 4): number {
  const totalModules = moduleCount + quiet * 2
  return Math.max(QR_MODULE_MIN, Math.floor(targetWidthDots / totalModules))
}

/** Module count for a given payload/EC level without building the SVG --
 *  used by the editor to size a freshly-added QR item before the user has
 *  chosen a module size. */
export function qrModuleCount(data: string, ec: 'L' | 'M' | 'Q' | 'H' = 'M'): number {
  const qr = qrcodegen(0, ec)
  qr.addData(data)
  qr.make()
  return qr.getModuleCount()
}
