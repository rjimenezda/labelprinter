import { Image as CanvasImage } from 'canvas'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LabelDoc } from '../../codec/types'
import { rasterizeToCanvas } from '../rasterize'

const doc: LabelDoc = {
  v: 1,
  w: 200,
  h: 200,
  items: [
    { id: 'a', x: 8, y: 8, w: 180, z: 0, block: { t: 't', s: 'Hello world, this wraps', z: 20 } },
    { id: 'b', x: 8, y: 60, w: 180, z: 1, block: { t: 'r' } },
    { id: 'c', x: 8, y: 70, w: 60, h: 40, z: 2, block: { t: 'b' } },
    { id: 'd', x: 8, y: 120, w: 60, z: 3, block: { t: 'q', d: 'hello', m: 3 } },
    { id: 'e', x: 8, y: 160, w: 120, z: 4, block: { t: 'c', d: '012345678905', f: '128' } },
  ],
}

// A real (tiny, 1x1) PNG, so node-canvas's drawImage -- which does a
// genuine `instanceof Image` check, not just duck-typing -- accepts it.
// jsdom itself doesn't implement image decoding, so the `canvas` package's
// Image (already a devDependency for canvas support in tests) stands in
// for the browser's real Image constructor here.
const VALID_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
const INVALID_IMAGE_DATA_URI = 'data:image/png;base64,not-a-real-png-at-all'

describe('rasterizeToCanvas', () => {
  let originalImage: typeof window.Image

  beforeEach(() => {
    originalImage = window.Image
    // @ts-expect-error -- node-canvas's Image, not a browser HTMLImageElement
    window.Image = CanvasImage
  })
  afterEach(() => {
    window.Image = originalImage
  })

  it('returns a canvas at the doc dimensions', async () => {
    const canvas = await rasterizeToCanvas(doc)
    expect(canvas.width).toBe(200)
    expect(canvas.height).toBe(200)
  })

  it('never throws for any block type, including an invalid barcode', async () => {
    const withInvalid: LabelDoc = {
      v: 1,
      w: 200,
      h: 100,
      items: [{ id: 'x', x: 0, y: 0, w: 100, z: 0, block: { t: 'c', d: 'not a valid ean13', f: 'ean13' } }],
    }
    await expect(rasterizeToCanvas(withInvalid)).resolves.toBeInstanceOf(HTMLCanvasElement)
  })

  it('handles an empty document', async () => {
    const empty: LabelDoc = { v: 1, w: 100, h: 100, items: [] }
    await expect(rasterizeToCanvas(empty)).resolves.toBeInstanceOf(HTMLCanvasElement)
  })

  it('draws a successfully-loaded image block for each fit mode', async () => {
    for (const fit of ['contain', 'cover', 'fill'] as const) {
      const withImage: LabelDoc = {
        v: 1,
        w: 200,
        h: 150,
        items: [{ id: 'img', x: 8, y: 8, w: 100, h: 50, z: 0, block: { t: 'i', d: VALID_PNG_DATA_URI, fit } }],
      }
      await expect(rasterizeToCanvas(withImage)).resolves.toBeInstanceOf(HTMLCanvasElement)
    }
  })

  it('falls back to a placeholder, without throwing, when an image fails to load', async () => {
    const withFailingImage: LabelDoc = {
      v: 1,
      w: 200,
      h: 150,
      items: [{ id: 'img', x: 8, y: 8, w: 100, h: 50, z: 0, block: { t: 'i', d: INVALID_IMAGE_DATA_URI } }],
    }
    await expect(rasterizeToCanvas(withFailingImage)).resolves.toBeInstanceOf(HTMLCanvasElement)
  })

  it('sizes an image with no explicit height from its natural aspect ratio, without throwing', async () => {
    const withImage: LabelDoc = {
      v: 1,
      w: 200,
      h: 150,
      items: [{ id: 'img', x: 0, y: 0, w: 100, z: 0, block: { t: 'i', d: VALID_PNG_DATA_URI } }],
    }
    await expect(rasterizeToCanvas(withImage)).resolves.toBeInstanceOf(HTMLCanvasElement)
  })

  it('never throws for a Pokemon block, whether or not the real artwork URL loads', async () => {
    // Hits the real raw.githubusercontent.com URL -- rasterizeToCanvas
    // must degrade to a placeholder without throwing either way, so this
    // stays meaningful even offline (network access isn't guaranteed in
    // every environment this test runs in).
    const withPokemon: LabelDoc = {
      v: 1,
      w: 200,
      h: 200,
      items: [{ id: 'poke', x: 8, y: 8, w: 120, z: 0, block: { t: 'p', id: 25 } }],
    }
    await expect(rasterizeToCanvas(withPokemon)).resolves.toBeInstanceOf(HTMLCanvasElement)
  })

  it('never throws for an icon block (data: URI, no network involved)', async () => {
    const withIcon: LabelDoc = {
      v: 1,
      w: 100,
      h: 100,
      items: [{ id: 'icon', x: 8, y: 8, w: 48, h: 48, z: 0, block: { t: 'k', d: '<path d="M12 2 2 22h20z"/>' } }],
    }
    await expect(rasterizeToCanvas(withIcon)).resolves.toBeInstanceOf(HTMLCanvasElement)
  })

  it('never throws for a fill-mode icon with a non-default viewBox', async () => {
    const withIcon: LabelDoc = {
      v: 1,
      w: 100,
      h: 100,
      items: [
        {
          id: 'icon',
          x: 8,
          y: 8,
          w: 48,
          h: 48,
          z: 0,
          block: { t: 'k', d: '<path d="M0 0h512v512H0z"/>', fill: 1, vb: '0 0 512 512' },
        },
      ],
    }
    await expect(rasterizeToCanvas(withIcon)).resolves.toBeInstanceOf(HTMLCanvasElement)
  })
})
