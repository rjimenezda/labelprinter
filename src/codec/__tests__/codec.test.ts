import { describe, expect, it } from 'vitest'
import { base64urlDecode, base64urlEncode } from '../base64url'
import { decodePayload } from '../decode'
import { encodeDoc } from '../encode'
import type { LabelDoc } from '../types'
import { utf8Decode, utf8Encode } from '../utf8'

const sampleDoc: LabelDoc = {
  v: 1,
  w: 384,
  h: 200,
  items: [
    { id: 'a', x: 8, y: 8, w: 368, z: 0, block: { t: 't', s: 'Cable: USB-C 100W', z: 24, bd: 1 } },
    { id: 'b', x: 8, y: 40, w: 368, z: 1, block: { t: 't', s: 'Length: 2m\nOwner: Roman', z: 16 } },
    { id: 'c', x: 8, y: 80, w: 120, z: 2, block: { t: 'q', d: 'https://example.com/i/abc123', m: 4 } },
    { id: 'd', x: 8, y: 210, w: 200, z: 3, block: { t: 'c', d: '012345678905', f: '128' } },
  ],
}

describe('base64url', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 254, 255, 128, 63, 64, 65])
    expect(base64urlDecode(base64urlEncode(bytes))).toEqual(bytes)
  })

  it('round-trips all lengths mod 3', () => {
    for (let len = 0; len < 12; len++) {
      const bytes = new Uint8Array(len).map((_, i) => (i * 37) % 256)
      expect(base64urlDecode(base64urlEncode(bytes))).toEqual(bytes)
    }
  })

  it('tolerates whitespace and padding on decode', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5])
    const enc = base64urlEncode(bytes)
    expect(base64urlDecode(enc + '==')).toEqual(bytes)
    expect(base64urlDecode(' ' + enc + ' \n')).toEqual(bytes)
  })

  it('produces only URL-fragment-safe characters', () => {
    const bytes = new Uint8Array(64).map((_, i) => i * 4)
    const enc = base64urlEncode(bytes)
    expect(enc).toMatch(/^[A-Za-z0-9\-_]*$/)
  })
})

describe('utf8', () => {
  it('round-trips ASCII, accents, CJK, and emoji', () => {
    const s = 'Cable: café 长度 🔌📦 100%'
    expect(utf8Decode(utf8Encode(s))).toBe(s)
  })
})

describe('encode/decode round trip', () => {
  it('round-trips a realistic label doc', () => {
    const payload = encodeDoc(sampleDoc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.items).toHaveLength(4)
      expect(result.doc.items[0]!.block).toMatchObject({ t: 't', s: 'Cable: USB-C 100W' })
      expect(result.warnings).toHaveLength(0)
    }
  })

  it('picks the shorter of the zlib and raw containers', () => {
    const payload = encodeDoc(sampleDoc)
    expect(payload[0]).toBe('L')
    expect(payload[1]).toBe('1')
    expect(['Z', 'J']).toContain(payload[2])
  })

  it('uses only fragment-safe characters end to end', () => {
    const payload = encodeDoc(sampleDoc)
    expect(payload).toMatch(/^L1[ZJ][A-Za-z0-9\-_]*$/)
  })

  it('detects truncation on the raw (J) container via checksum', () => {
    const tinyDoc: LabelDoc = { v: 1, w: 384, h: 40, items: [] }
    // Force the raw container path by checking both are producible; find
    // a doc small enough that J wins, then truncate it.
    const payload = encodeDoc(tinyDoc)
    const truncated = payload.slice(0, payload.length - 4)
    const result = decodePayload(truncated)
    expect(result.ok).toBe(false)
  })

  it('rejects garbage input without throwing', () => {
    expect(() => decodePayload('not-a-valid-payload-at-all')).not.toThrow()
    expect(decodePayload('not-a-valid-payload-at-all').ok).toBe(false)
    expect(() => decodePayload('')).not.toThrow()
    expect(decodePayload('').ok).toBe(false)
  })

  it('reports CONTAINER_TOO_NEW for an unknown container version', () => {
    const result = decodePayload('L9Zsomepayload')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('CONTAINER_TOO_NEW')
  })

  it('renders unknown block types as a visible placeholder instead of dropping them', () => {
    const docWithUnknown = {
      v: 1,
      w: 384,
      h: 100,
      items: [
        { id: 'x', x: 0, y: 0, w: 100, z: 0, block: { t: 'img', src: 'http://example.com/logo.png' } },
      ],
    }
    const payload = encodeDoc(docWithUnknown as unknown as LabelDoc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.items).toHaveLength(1)
      expect(result.doc.items[0]!.block.t).toBe('t')
      expect((result.doc.items[0]!.block as { s: string }).s).toContain('unsupported')
      expect(result.warnings.some((w) => w.w === 'UNKNOWN_BLOCK_TYPE')).toBe(true)
    }
  })

  it('respects minv and refuses to render a doc requiring a newer viewer', () => {
    const futureDoc = { v: 99, minv: 99, w: 384, h: 100, items: [] }
    const payload = encodeDoc(futureDoc as unknown as LabelDoc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('SCHEMA_TOO_NEW')
  })

  it('handles fragment-hostile characters in text content', () => {
    const doc: LabelDoc = {
      v: 1,
      w: 384,
      h: 100,
      items: [
        {
          id: 'a',
          x: 0,
          y: 0,
          w: 100,
          z: 0,
          block: { t: 't', s: `weird chars: # % & = + ? / \\ " ' <script> \n tab\ttab` },
        },
      ],
    }
    const payload = encodeDoc(doc)
    expect(payload).toMatch(/^L1[ZJ][A-Za-z0-9\-_]*$/)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.doc.items[0]!.block as { s: string }).s).toBe(
        `weird chars: # % & = + ? / \\ " ' <script> \n tab\ttab`,
      )
    }
  })

  it('round-trips an image block, including its fit mode', () => {
    const doc: LabelDoc = {
      v: 1,
      w: 384,
      h: 100,
      items: [
        {
          id: 'a',
          x: 0,
          y: 0,
          w: 100,
          h: 60,
          z: 0,
          block: { t: 'i', d: 'https://example.com/photo.jpg?w=100&h=60', fit: 'cover' },
        },
      ],
    }
    const payload = encodeDoc(doc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.items[0]!.block).toEqual({
        t: 'i',
        d: 'https://example.com/photo.jpg?w=100&h=60',
        fit: 'cover',
      })
    }
  })

  it('round-trips a Pokemon block, storing only the resolved id (not a name or URL)', () => {
    const doc: LabelDoc = {
      v: 1,
      w: 384,
      h: 100,
      items: [{ id: 'a', x: 0, y: 0, w: 120, z: 0, block: { t: 'p', id: 25 } }],
    }
    const payload = encodeDoc(doc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.items[0]!.block).toEqual({ t: 'p', id: 25 })
    }
  })

  it('only stores showName/showNumber when explicitly turned off (default stays implicit)', () => {
    const doc: LabelDoc = {
      v: 1,
      w: 384,
      h: 100,
      items: [{ id: 'a', x: 0, y: 0, w: 120, z: 0, block: { t: 'p', id: 1, showName: 0, showNumber: 1 } }],
    }
    const payload = encodeDoc(doc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      // showNumber: 1 is the default, so it's dropped rather than stored
      expect(result.doc.items[0]!.block).toEqual({ t: 'p', id: 1, showName: 0 })
    }
  })

  it('round-trips an icon block, keeping its sanitized markup and stroke width', () => {
    const doc: LabelDoc = {
      v: 1,
      w: 384,
      h: 100,
      items: [
        { id: 'a', x: 0, y: 0, w: 48, h: 48, z: 0, block: { t: 'k', d: '<path d="M12 2 2 22h20z"/>', name: 'triangle', th: 3 } },
      ],
    }
    const payload = encodeDoc(doc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.items[0]!.block).toEqual({
        t: 'k',
        d: '<path d="M12 2 2 22h20z"/>',
        name: 'triangle',
        th: 3,
      })
    }
  })

  it('rejects an icon block whose markup sanitizes down to nothing, as a visible placeholder', () => {
    const doc = {
      v: 1,
      w: 384,
      h: 100,
      items: [{ id: 'a', x: 0, y: 0, w: 48, z: 0, block: { t: 'k', d: '<script>alert(1)</script>' } }],
    }
    const payload = encodeDoc(doc as unknown as LabelDoc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.items[0]!.block.t).toBe('t')
      expect((result.doc.items[0]!.block as { s: string }).s).toContain('unsupported')
    }
  })

  it('round-trips a fill-mode icon with a non-default viewBox (e.g. a Game Icons/Phosphor/OpenMoji entry)', () => {
    const doc: LabelDoc = {
      v: 1,
      w: 384,
      h: 100,
      items: [
        {
          id: 'a',
          x: 0,
          y: 0,
          w: 48,
          z: 0,
          block: { t: 'k', d: '<path d="M0 0h512v512H0z"/>', name: 'game-icons/sword', fill: 1, vb: '0 0 512 512' },
        },
      ],
    }
    const payload = encodeDoc(doc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.doc.items[0]!.block).toEqual({
        t: 'k',
        d: '<path d="M0 0h512v512H0z"/>',
        name: 'game-icons/sword',
        fill: 1,
        vb: '0 0 512 512',
      })
    }
  })

  it('falls back to the default viewBox for a malformed vb value rather than trusting it', () => {
    const malformed = {
      v: 1,
      w: 384,
      h: 100,
      items: [{ id: 'a', x: 0, y: 0, w: 48, z: 0, block: { t: 'k', d: '<path d="M0 0"/>', vb: 'javascript:alert(1)' } }],
    }
    const payload = encodeDoc(malformed as unknown as LabelDoc)
    const result = decodePayload(payload)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect((result.doc.items[0]!.block as { vb?: string }).vb).toBeUndefined()
    }
  })
})
