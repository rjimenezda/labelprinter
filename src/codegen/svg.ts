/**
 * Pure data -> geometry helpers. No React, no DOM reads -- these run
 * identically in the editor (building a live preview), the canvas
 * simulator, and could run server-side if the escape-hatch middleware is
 * ever built.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Merges a boolean module grid into a list of rects, one per horizontal
 *  run of "dark" cells per row (rather than one rect per module) --
 *  adjacent separate rects can show hairline seams at fractional device
 *  scale, and a few thousand DOM nodes cost real time on an old WebView.
 *  Deliberately rects, not a path string: every shape codegen/ produces
 *  is an axis-aligned rectangle, so there's no need for a general path
 *  representation (or the Path2D API, which isn't universally available
 *  -- notably absent from Node's `canvas` package used in tests, and not
 *  guaranteed on an unknown WebView either). The canvas simulator draws
 *  these directly via fillRect; rectsToPath below derives the SVG string
 *  for the DOM renderer from the same list. */
export function moduleGridToRects(
  isDark: (row: number, col: number) => boolean,
  moduleCount: number,
  moduleDots: number,
  offsetX: number,
  offsetY: number,
): Rect[] {
  const rects: Rect[] = []
  for (let r = 0; r < moduleCount; r++) {
    let c = 0
    while (c < moduleCount) {
      if (!isDark(r, c)) {
        c++
        continue
      }
      const start = c
      while (c < moduleCount && isDark(r, c)) c++
      const runLen = c - start
      rects.push({
        x: offsetX + start * moduleDots,
        y: offsetY + r * moduleDots,
        w: runLen * moduleDots,
        h: moduleDots,
      })
    }
  }
  return rects
}

export function rectsToPath(rects: Rect[]): string {
  let d = ''
  for (const r of rects) {
    d += `M${r.x} ${r.y}h${r.w}v${r.h}h${-r.w}Z`
  }
  return d
}

export function svgWrap(widthDots: number, heightDots: number, innerMarkup: string): string {
  return `<svg viewBox="0 0 ${widthDots} ${heightDots}" width="${widthDots}" height="${heightDots}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${innerMarkup}</svg>`
}
