import {
  DOTS_PER_CSS_PX,
  INVERT_BOOST_DOTS,
  MIN_FONT_DOTS_NORMAL,
  MIN_STROKE_DOTS,
} from '../probe-results'

/** Pure black/white only -- see src/render/label.css for the full 1-bit
 *  design-rule rationale (greys/gradients/shadows all become dither noise
 *  on thermal paper). */
export const INK = '#000000'
export const PAPER = '#ffffff'

/** dots/mm at 203dpi -- see probe-results.ts. */
export const DOTS_PER_MM = 8

/** Confirmed by probe P1 (2026-09-13): meta viewport width=384 gives an
 *  exact 1:1 CSS-px-to-dot mapping. */
export { DOTS_PER_CSS_PX }

export const FONT_MIN = MIN_FONT_DOTS_NORMAL // 16 -- measured legibility floor
export const FONT_SM = 18
export const FONT_BODY = 22
export const FONT_LG = 28
export const FONT_TITLE = 40
export const FONT_HERO = 64

export { INVERT_BOOST_DOTS }

export const STROKE_MIN = MIN_STROKE_DOTS // 1 -- all tested widths survived
export const STROKE_DEFAULT = 2

export const PAD_DEFAULT = 8
export const QR_MODULE_DEFAULT = 4
export const QR_MODULE_MIN = 3

export const FONT_STACK_SANS = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
export const FONT_STACK_MONO = '"Courier New", monospace'
