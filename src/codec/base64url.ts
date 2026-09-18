/**
 * Hand-rolled base64url, rather than atob/btoa: this drops a platform
 * dependency from the decode path (which runs on the unknown WebView),
 * and lets the decoder be liberal about what it accepts -- present-or-
 * absent padding, stray '+'/'/' in case something transcoded the string,
 * and whitespace a phone clipboard might have inserted.
 *
 * Alphabet is RFC 4648 base64url (A-Za-z0-9-_), unpadded on encode. All
 * 64 characters are RFC 3986 unreserved, so nothing here is ever
 * percent-encoded by a URL bar or paste field.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const REV: number[] = new Array(128).fill(-1)
for (let i = 0; i < ALPHABET.length; i++) {
  REV[ALPHABET.charCodeAt(i)] = i
}
// Tolerate standard base64's '+' and '/' in case something re-encoded the
// payload before it reached us.
REV['+'.charCodeAt(0)] = 62
REV['/'.charCodeAt(0)] = 63

export function base64urlEncode(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!
    out += ALPHABET[(n >>> 18) & 63] + ALPHABET[(n >>> 12) & 63] + ALPHABET[(n >>> 6) & 63] + ALPHABET[n & 63]
  }
  const rem = bytes.length - i
  if (rem === 1) {
    const n = bytes[i]! << 16
    out += ALPHABET[(n >>> 18) & 63] + ALPHABET[(n >>> 12) & 63]
  } else if (rem === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8)
    out += ALPHABET[(n >>> 18) & 63] + ALPHABET[(n >>> 12) & 63] + ALPHABET[(n >>> 6) & 63]
  }
  return out
}

export function base64urlDecode(input: string): Uint8Array {
  // Liberal: strip whitespace and '=' padding before decoding.
  const s = input.replace(/[\s=]/g, '')
  const chars: number[] = []
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    const v = code < 128 ? REV[code] : -1
    if (v === undefined || v === -1) {
      throw new Error(`base64url: invalid character "${s[i]}" at index ${i}`)
    }
    chars.push(v)
  }
  const out = new Uint8Array(Math.floor((chars.length * 6) / 8))
  let outIdx = 0
  let buffer = 0
  let bits = 0
  for (const v of chars) {
    buffer = (buffer << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[outIdx++] = (buffer >>> bits) & 0xff
    }
  }
  return out
}
