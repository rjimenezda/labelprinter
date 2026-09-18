import { describe, expect, it } from 'vitest'
import { buildBarcode } from '../barcode'

describe('barcode codegen', () => {
  it('encodes CODE128 into a well-formed, integer-dot-snapped SVG', () => {
    const result = buildBarcode('012345678905', '128', 2, 80)
    expect(result.svg).toMatch(/^<svg /)
    expect(result.svg).toContain('<path d="M')
    expect(result.heightDots).toBe(80)
    expect(result.widthDots).toBeGreaterThan(0)
    // width must be an integer number of module units
    expect(result.widthDots % 2).toBe(0)
  })

  it('encodes CODE39', () => {
    const result = buildBarcode('HELLO123', '39', 3, 60)
    expect(result.svg).toMatch(/^<svg /)
    expect(result.widthDots % 3).toBe(0)
  })

  it('encodes EAN13', () => {
    const result = buildBarcode('5901234123457', 'ean13', 2, 60)
    expect(result.svg).toMatch(/^<svg /)
  })

  it('scales module width without changing the encoded pattern length', () => {
    const a = buildBarcode('012345678905', '128', 1, 80)
    const b = buildBarcode('012345678905', '128', 4, 80)
    expect(b.widthDots).toBe(a.widthDots * 4)
  })

  it('throws on invalid input rather than silently producing garbage', () => {
    expect(() => buildBarcode('not valid ean13 at all', 'ean13', 2, 60)).toThrow()
  })
})
