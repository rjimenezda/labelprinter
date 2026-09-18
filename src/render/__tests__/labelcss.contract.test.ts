import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const rawCss = readFileSync(join(here, '..', 'label.css'), 'utf-8')
// Strip comments before matching -- the file's own header comment
// documents these banned terms as prose, which would otherwise produce
// false positives against the very patterns meant to catch real usage.
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * label.css is the ONLY stylesheet the viewer loads, and it has to run
 * correctly on an unknown, possibly old WebView -- these are the features
 * that plausibly aren't supported, or (like flex gap) fail silently
 * instead of erroring. Grepping the source text is cheap and, unlike a
 * stylelint config nobody maintains, this one actually runs.
 */
const BANNED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /:has\(/, reason: ':has() is not supported on older WebKit' },
  { pattern: /:is\(/, reason: ':is() is not supported on older WebKit' },
  { pattern: /:where\(/, reason: ':where() is not supported on older WebKit' },
  { pattern: /@container/, reason: 'container queries are not supported on older WebKit' },
  { pattern: /@layer/, reason: 'cascade layers are not supported on older WebKit' },
  { pattern: /oklch\(/, reason: 'oklch() is not supported on older WebKit' },
  { pattern: /color-mix\(/, reason: 'color-mix() is not supported on older WebKit' },
  { pattern: /\bclamp\(/, reason: 'clamp() is unnecessary risk -- sizes should be literal dots' },
  { pattern: /\bmin\(|\bmax\(/, reason: 'min()/max() are unnecessary risk -- sizes should be literal dots' },
  { pattern: /margin-inline|padding-inline|inset-inline|margin-block|padding-block/, reason: 'logical properties are not supported on older WebKit' },
  { pattern: /\d(dvh|svh|lvh)\b/, reason: 'dynamic viewport units are not supported on older WebKit' },
  { pattern: /aspect-ratio/, reason: 'aspect-ratio is unnecessary risk -- dimensions should be explicit' },
  { pattern: /gap\s*:/, reason: 'flex/grid gap fails silently on older WebKit -- use explicit margins' },
  { pattern: /rgba\(|hsla?\(/, reason: 'no alpha/greys -- 1-bit output must be pure #000/#fff' },
  { pattern: /box-shadow/, reason: 'box-shadow becomes dither noise on thermal paper' },
  { pattern: /\bfilter\s*:/, reason: 'filter becomes dither noise on thermal paper' },
  { pattern: /mix-blend-mode/, reason: 'mix-blend-mode becomes dither noise on thermal paper' },
  { pattern: /linear-gradient|radial-gradient|conic-gradient/, reason: 'gradients become dither noise on thermal paper' },
  { pattern: /@font-face/, reason: 'no webfonts in the viewer path -- an async load the capture may not wait for' },
  {
    pattern: /position\s*:\s*fixed/,
    reason:
      'confirmed on real paper (P4, 2026-09-14): TinyPrint has a stitched-capture mode for tall pages, and fixed elements print REPEATED at every stitch boundary',
  },
  {
    pattern: /position\s*:\s*sticky/,
    reason: 'same stitching artifact as position:fixed -- confirmed repeating under TinyPrint’s stitched capture mode',
  },
]

describe('label.css contract', () => {
  for (const { pattern, reason } of BANNED_PATTERNS) {
    it(`does not use a banned feature: ${reason}`, () => {
      expect(css).not.toMatch(pattern)
    })
  }

  it('never sets opacity except 0 or 1', () => {
    const matches = [...css.matchAll(/opacity\s*:\s*([\d.]+)/g)]
    for (const m of matches) {
      expect(['0', '1'].includes(m[1]!)).toBe(true)
    }
  })
})
