/**
 * Container format: a 3-char prefix before the base64url payload.
 *   L 1 Z <base64url>   zlib-deflated UTF-8 JSON (default -- see encode.ts)
 *   L 1 J <base64url>   raw UTF-8 JSON + 4-byte FNV-1a32 checksum
 *
 * 'L' magic + '1' container version are checked before any work is spent
 * decoding the body -- a container version we don't recognize is a
 * printable error card, not a crash.
 */

const MAGIC = 'L'
const CONTAINER_VERSION = '1'

export type ContainerCodec = 'Z' | 'J'

export function formatContainer(codec: ContainerCodec, payload: string): string {
  return MAGIC + CONTAINER_VERSION + codec + payload
}

export type ParsedContainer =
  | { ok: true; codec: ContainerCodec; payload: string }
  | { ok: false; error: 'EMPTY' | 'BAD_PREFIX' | 'CONTAINER_TOO_NEW' }

export function parseContainer(raw: string): ParsedContainer {
  if (!raw) return { ok: false, error: 'EMPTY' }
  if (raw[0] !== MAGIC) return { ok: false, error: 'BAD_PREFIX' }
  if (raw[1] !== CONTAINER_VERSION) return { ok: false, error: 'CONTAINER_TOO_NEW' }
  const codecChar = raw[2]
  if (codecChar !== 'Z' && codecChar !== 'J') return { ok: false, error: 'BAD_PREFIX' }
  return { ok: true, codec: codecChar, payload: raw.slice(3) }
}
