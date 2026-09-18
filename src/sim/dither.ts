/**
 * Threshold-only for Phase 1 (per the plan's phasing) -- once P3's dither
 * mode is conclusively identified from a real print, this is where an
 * ordered/error-diffusion mode gets added and becomes the default,
 * matching what TinyPrint actually does.
 */
export function toOneBit(imageData: ImageData, threshold = 128): ImageData {
  const out = new ImageData(imageData.width, imageData.height)
  const src = imageData.data
  const dst = out.data
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i]!
    const g = src[i + 1]!
    const b = src[i + 2]!
    const a = src[i + 3]!
    // Composite against white first (alpha-aware luminance), since our
    // source canvas is always filled white before drawing.
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255) + 255 * (1 - a / 255)
    const v = lum < threshold ? 0 : 255
    dst[i] = v
    dst[i + 1] = v
    dst[i + 2] = v
    dst[i + 3] = 255
  }
  return out
}
