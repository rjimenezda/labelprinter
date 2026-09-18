const SENTINEL = '|END|'

/**
 * Builds a hash payload of exactly `totalLen` characters, made of a
 * counter pattern (0000|0010|0020|...) so a truncation point is visible
 * and legible directly off the printed paper, ending in a fixed sentinel
 * -- if `|END|` didn't survive, the URL was cut short somewhere.
 */
export function buildLengthTestPayload(totalLen: number): string {
  if (totalLen <= 0) return ''
  const sentinel = totalLen >= SENTINEL.length ? SENTINEL : SENTINEL.slice(0, totalLen)
  const bodyLen = totalLen - sentinel.length
  let s = ''
  let counter = 0
  while (s.length < bodyLen) {
    s += String(counter).padStart(4, '0') + '|'
    counter += 10
  }
  s = s.slice(0, bodyLen)
  return s + sentinel
}

export const LENGTH_LADDER_SENTINEL = SENTINEL
