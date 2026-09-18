import { describe, expect, it } from 'vitest'
import { buildLengthTestPayload, LENGTH_LADDER_SENTINEL } from '../lengthLadder'

describe('buildLengthTestPayload', () => {
  it('produces exactly the requested length', () => {
    for (const len of [0, 1, 4, 5, 100, 250, 1000, 4001]) {
      expect(buildLengthTestPayload(len).length).toBe(len)
    }
  })

  it('ends with the sentinel when there is room for it', () => {
    const s = buildLengthTestPayload(500)
    expect(s.endsWith(LENGTH_LADDER_SENTINEL)).toBe(true)
  })

  it('is deterministic', () => {
    expect(buildLengthTestPayload(300)).toBe(buildLengthTestPayload(300))
  })
})
