import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { LabelDoc } from '../../codec/types'
import { LabelRoot } from '../LabelRoot'

const doc: LabelDoc = {
  v: 1,
  w: 384,
  h: 300,
  items: [
    { id: 'title', x: 8, y: 8, w: 368, z: 0, block: { t: 't', s: 'Cable: USB-C 100W', z: 28, bd: 1 } },
    { id: 'body', x: 8, y: 44, w: 368, z: 1, block: { t: 't', s: 'Length: 2m\nOwner: Roman', z: 18 } },
    { id: 'rule', x: 8, y: 100, w: 368, z: 2, block: { t: 'r' } },
    { id: 'box', x: 8, y: 112, w: 100, h: 40, z: 3, block: { t: 'b' } },
    { id: 'qr', x: 200, y: 100, w: 100, z: 4, block: { t: 'q', d: 'https://example.com/i/abc', m: 4 } },
    { id: 'bc', x: 8, y: 180, w: 200, z: 5, block: { t: 'c', d: '012345678905', f: '128' } },
    { id: 'inv', x: 8, y: 260, w: 368, z: 6, block: { t: 't', s: 'INVERTED', z: 18, i: 1, bd: 1, a: 'c' } },
    { id: 'img', x: 8, y: 290, w: 100, h: 60, z: 7, block: { t: 'i', d: 'https://example.com/photo.jpg', fit: 'cover' } },
  ],
}

describe('LabelRoot', () => {
  it('renders deterministically for the same doc', () => {
    const a = renderToStaticMarkup(<LabelRoot doc={doc} />)
    const b = renderToStaticMarkup(<LabelRoot doc={doc} />)
    expect(a).toBe(b)
    expect(a).toContain('Cable: USB-C 100W')
    expect(a).toContain('INVERTED')
    expect(a).toContain('<svg') // QR + barcode both render inline SVG
    expect(a).toContain('https://example.com/photo.jpg')
  })

  it('renders an image block as a plain <img>, best-effort', () => {
    const withImage: LabelDoc = {
      v: 1,
      w: 200,
      h: 100,
      items: [{ id: 'img', x: 0, y: 0, w: 100, h: 60, z: 0, block: { t: 'i', d: 'https://example.com/x.png' } }],
    }
    const html = renderToStaticMarkup(<LabelRoot doc={withImage} />)
    expect(html).toContain('<img')
    expect(html).toContain('src="https://example.com/x.png"')
  })

  it('renders a Pokemon block from its id alone -- no network call in the render path', () => {
    const withPokemon: LabelDoc = {
      v: 1,
      w: 200,
      h: 200,
      items: [{ id: 'poke', x: 0, y: 0, w: 120, z: 0, block: { t: 'p', id: 25 } }],
    }
    const html = renderToStaticMarkup(<LabelRoot doc={withPokemon} />)
    expect(html).toContain('src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"')
    expect(html).toContain('Pikachu')
    expect(html).toContain('#0025')
  })

  it('hides the Pokemon name/number when explicitly turned off', () => {
    const withPokemon: LabelDoc = {
      v: 1,
      w: 200,
      h: 200,
      items: [{ id: 'poke', x: 0, y: 0, w: 120, z: 0, block: { t: 'p', id: 25, showName: 0, showNumber: 0 } }],
    }
    const html = renderToStaticMarkup(<LabelRoot doc={withPokemon} />)
    expect(html).not.toContain('Pikachu')
    expect(html).not.toContain('#0025')
  })

  it('applies a pan/zoom crop to Pokemon artwork within its own fixed-height frame, separate from the caption', () => {
    const withCrop: LabelDoc = {
      v: 1,
      w: 200,
      h: 200,
      items: [
        { id: 'poke', x: 0, y: 0, w: 120, z: 0, block: { t: 'p', id: 25, crop: { s: 1.5, ox: 0.1, oy: -0.2, h: 90 } } },
      ],
    }
    const html = renderToStaticMarkup(<LabelRoot doc={withCrop} />)
    expect(html).toContain('translate(10%, -20%) scale(1.5)')
    // The image sits in its own fixed-height, clipped sub-box (the
    // caption's height isn't part of the crop frame).
    expect(html).toMatch(/height:90px[^>]*overflow:hidden/)
  })

  it('renders an icon block as inline SVG with our own stroke/color, not the source markup', () => {
    const withIcon: LabelDoc = {
      v: 1,
      w: 100,
      h: 100,
      items: [{ id: 'icon', x: 0, y: 0, w: 48, h: 48, z: 0, block: { t: 'k', d: '<path d="M12 2 2 22h20z"/>', th: 3 } }],
    }
    const html = renderToStaticMarkup(<LabelRoot doc={withIcon} />)
    expect(html).toContain('viewBox="0 0 24 24"')
    expect(html).toContain('d="M12 2 2 22h20z"')
    expect(html).toContain('stroke="#000000"')
    expect(html).toContain('stroke-width="3"')
  })

  it('renders a fill-mode icon (e.g. Game Icons/Phosphor/OpenMoji) with its own viewBox and black fill, not stroke', () => {
    const withIcon: LabelDoc = {
      v: 1,
      w: 100,
      h: 100,
      items: [
        {
          id: 'icon',
          x: 0,
          y: 0,
          w: 48,
          h: 48,
          z: 0,
          block: { t: 'k', d: '<path d="M0 0h512v512H0z"/>', fill: 1, vb: '0 0 512 512' },
        },
      ],
    }
    const html = renderToStaticMarkup(<LabelRoot doc={withIcon} />)
    expect(html).toContain('viewBox="0 0 512 512"')
    expect(html).toContain('fill="#000000"')
    expect(html).toContain('stroke="none"')
  })

  it('never crashes on an empty document', () => {
    const empty: LabelDoc = { v: 1, w: 384, h: 40, items: [] }
    expect(() => renderToStaticMarkup(<LabelRoot doc={empty} />)).not.toThrow()
  })

  it('renders an unsupported-block placeholder as visible text, not nothing', () => {
    const withPlaceholder: LabelDoc = {
      v: 1,
      w: 384,
      h: 100,
      items: [{ id: 'x', x: 0, y: 0, w: 200, z: 0, block: { t: 't', s: '[unsupported: "img"]', i: 1, bd: 1 } }],
    }
    const html = renderToStaticMarkup(<LabelRoot doc={withPlaceholder} />)
    expect(html).toContain('unsupported')
  })

  it('sorts items by z regardless of array order', () => {
    const reordered: LabelDoc = {
      ...doc,
      items: [...doc.items].reverse(),
    }
    const a = renderToStaticMarkup(<LabelRoot doc={doc} />)
    const b = renderToStaticMarkup(<LabelRoot doc={reordered} />)
    expect(a).toBe(b)
  })
})
