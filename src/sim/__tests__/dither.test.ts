import { describe, expect, it } from 'vitest'
import { toOneBit } from '../dither'

function makeImageData(pixels: Array<[number, number, number, number]>): ImageData {
  const data = new Uint8ClampedArray(pixels.length * 4)
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  })
  return new ImageData(data, pixels.length, 1)
}

describe('toOneBit', () => {
  it('keeps pure black black and pure white white', () => {
    const input = makeImageData([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ])
    const out = toOneBit(input, 128)
    expect([out.data[0], out.data[1], out.data[2]]).toEqual([0, 0, 0])
    expect([out.data[4], out.data[5], out.data[6]]).toEqual([255, 255, 255])
  })

  it('always outputs fully opaque pixels', () => {
    const input = makeImageData([[100, 100, 100, 255]])
    const out = toOneBit(input, 128)
    expect(out.data[3]).toBe(255)
  })

  it('treats transparent pixels as white (background)', () => {
    const input = makeImageData([[0, 0, 0, 0]])
    const out = toOneBit(input, 128)
    expect([out.data[0], out.data[1], out.data[2]]).toEqual([255, 255, 255])
  })

  it('respects a custom threshold', () => {
    const midGray = makeImageData([[120, 120, 120, 255]])
    expect(toOneBit(midGray, 100).data[0]).toBe(255) // above threshold -> white
    expect(toOneBit(midGray, 150).data[0]).toBe(0) // below threshold -> black
  })

  it('only ever produces pure black or pure white, never grey', () => {
    const input = makeImageData([
      [10, 200, 90, 255],
      [128, 128, 128, 128],
      [255, 0, 0, 255],
    ])
    const out = toOneBit(input, 128)
    for (let i = 0; i < out.data.length; i += 4) {
      const v = out.data[i]!
      expect(v === 0 || v === 255).toBe(true)
      expect(out.data[i]).toBe(out.data[i + 1])
      expect(out.data[i + 1]).toBe(out.data[i + 2])
    }
  })
})
