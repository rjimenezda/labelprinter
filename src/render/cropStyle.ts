import type { CSSProperties } from 'react'
import type { ImageCrop } from '../codec/types'

/**
 * Shared by every raster-photo block that supports the editor's in-place
 * crop tool (Image, Pokemon) -- cover-fits the frame, then pans/zooms on
 * top via a CSS transform. Listed as translate-then-scale so the pan
 * offset (a % of the element's own, pre-transform box) lands in screen
 * space *after* the zoom -- see codec/types.ts's `crop` doc for the
 * clamp math this assumes.
 */
export function cropImgStyle(crop: ImageCrop | undefined): CSSProperties {
  if (!crop) return {}
  return {
    objectFit: 'cover',
    transform: `translate(${crop.ox * 100}%, ${crop.oy * 100}%) scale(${crop.s})`,
  }
}
