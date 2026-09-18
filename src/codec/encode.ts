import { zlibSync } from 'fflate'
import { base64urlEncode } from './base64url'
import { formatContainer } from './container'
import type { LabelDoc } from './types'
import { fnv1a32 } from './checksum'
import { utf8Encode } from './utf8'

/**
 * Encodes a LabelDoc into the URL-safe payload string (without the leading
 * `#`). Produces both the zlib and raw+checksum containers and returns
 * whichever is shorter -- for very small docs the raw form can win because
 * zlib's own header/footer overhead isn't amortized yet.
 */
export function encodeDoc(doc: LabelDoc): string {
  const jsonBytes = utf8Encode(JSON.stringify(doc))

  const cksum = fnv1a32(jsonBytes)
  const jBytes = new Uint8Array(jsonBytes.length + 4)
  jBytes.set(jsonBytes, 0)
  new DataView(jBytes.buffer).setUint32(jsonBytes.length, cksum, false)
  const jPayload = formatContainer('J', base64urlEncode(jBytes))

  const zBytes = zlibSync(jsonBytes, { level: 9 })
  const zPayload = formatContainer('Z', base64urlEncode(zBytes))

  return zPayload.length <= jPayload.length ? zPayload : jPayload
}
