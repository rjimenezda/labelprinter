import { DOTS_PER_CSS_PX, DOTS_PER_MM } from './tokens'

/** Converts an integer number of printer dots to a CSS length. This is the
 *  ONLY function allowed to emit a raw `px` string in the render path --
 *  everything else works in dots. Confirmed 1:1 (DOTS_PER_CSS_PX = 1) by
 *  probe P1, but kept as a real division rather than hardcoded so a future
 *  re-probe (different printer, different viewport strategy) is a one-line
 *  change here, not a find-and-replace across every component. */
export function d(dots: number): string {
  return `${dots / DOTS_PER_CSS_PX}px`
}

export function dotsToMm(dots: number): number {
  return dots / DOTS_PER_MM
}

export function mmToDots(mm: number): number {
  return Math.round(mm * DOTS_PER_MM)
}

/** Snap a value to the nearest integer dot -- every length in a LabelDoc
 *  must pass through this before being stored. Fractional dots are a lie
 *  the 1-bit rasterizer resolves arbitrarily. */
export function snap(dots: number): number {
  return Math.round(dots)
}
