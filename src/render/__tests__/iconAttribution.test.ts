import { describe, expect, it } from 'vitest'
import type { LabelDoc } from '../../codec/types'
import { getIconAttributions } from '../iconAttribution'

function docWithIcons(vbs: (string | undefined)[]): LabelDoc {
  return {
    v: 1,
    w: 384,
    h: 100,
    items: vbs.map((vb, i) => ({
      id: `item-${i}`,
      x: 0,
      y: 0,
      w: 24,
      z: i,
      block: { t: 'k', d: '<path d="M0 0"/>', vb },
    })),
  }
}

describe('getIconAttributions', () => {
  it('returns nothing for a doc with no icon blocks', () => {
    const doc: LabelDoc = { v: 1, w: 384, h: 100, items: [{ id: 'a', x: 0, y: 0, w: 100, z: 0, block: { t: 't', s: 'hi' } }] }
    expect(getIconAttributions(doc)).toEqual([])
  })

  it('requires no attribution for Lucide (default vb) or Phosphor', () => {
    expect(getIconAttributions(docWithIcons([undefined, '0 0 256 256']))).toEqual([])
  })

  it('requires attribution for Game Icons (512x512 viewBox)', () => {
    expect(getIconAttributions(docWithIcons(['0 0 512 512']))).toEqual(['Icons by game-icons.net, CC BY 3.0'])
  })

  it('requires attribution for OpenMoji (72x72 viewBox)', () => {
    expect(getIconAttributions(docWithIcons(['0 0 72 72']))).toEqual([
      'Icons by OpenMoji (openmoji.org), CC BY-SA 4.0',
    ])
  })

  it('includes both, deduplicated, when a doc mixes attribution-requiring libraries', () => {
    expect(getIconAttributions(docWithIcons(['0 0 512 512', '0 0 512 512', '0 0 72 72']))).toEqual([
      'Icons by game-icons.net, CC BY 3.0',
      'Icons by OpenMoji (openmoji.org), CC BY-SA 4.0',
    ])
  })
})
