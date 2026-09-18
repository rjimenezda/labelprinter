import { describe, expect, it } from 'vitest'
import { buildQr, qrModuleCount } from '../qr'

describe('QR codegen', () => {
  it('derives width as an exact multiple of the module size, across payload lengths and EC levels', () => {
    const payloads = [
      'a',
      'https://example.com',
      'https://example.com/i/abc123def456ghi789',
      'x'.repeat(200),
      'x'.repeat(800),
    ]
    const ecLevels = ['L', 'M', 'Q', 'H'] as const
    const moduleSizes = [3, 4, 5, 8]

    for (const data of payloads) {
      for (const ec of ecLevels) {
        for (const m of moduleSizes) {
          const result = buildQr(data, ec, m)
          expect(result.widthDots % result.moduleDots).toBe(0)
          expect(result.moduleDots).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('never emits a module size below QR_MODULE_MIN even if asked for less', () => {
    const result = buildQr('hello', 'M', 1)
    expect(result.moduleDots).toBeGreaterThanOrEqual(3)
  })

  it('qrModuleCount matches the module count used inside buildQr (minus quiet zone)', () => {
    const data = 'https://example.com/some/path?x=1'
    const count = qrModuleCount(data, 'M')
    const result = buildQr(data, 'M', 4)
    expect(result.moduleCount).toBe(count + 4 * 2)
  })

  it('produces well-formed SVG markup', () => {
    const result = buildQr('hello world', 'M', 4)
    expect(result.svg).toMatch(/^<svg /)
    expect(result.svg).toContain('<path d="M')
    expect(result.svg.trim().endsWith('</svg>')).toBe(true)
  })
})
