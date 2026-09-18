/** FNV-1a 32-bit -- small, dependency-free, good enough to catch truncation
 *  (the most likely real-world failure: a URL clipped by a clipboard or a
 *  paste-field length cap) without needing a cryptographic hash. */
export function fnv1a32(bytes: Uint8Array): number {
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
