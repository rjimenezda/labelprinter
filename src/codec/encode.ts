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

/** Byte/char size breakdown, used by the editor's payload size meter. */
export interface EncodeSizeInfo {
  jsonBytes: number
  zlibBytes: number
  payloadChars: number
  codec: 'Z' | 'J'
}

export function encodeDocWithInfo(doc: LabelDoc): { payload: string; info: EncodeSizeInfo } {
  const jsonBytes = utf8Encode(JSON.stringify(doc))
  const zBytes = zlibSync(jsonBytes, { level: 9 })
  const payload = encodeDoc(doc)
  const codec = payload[2] === 'Z' ? 'Z' : 'J'
  return {
    payload,
    info: {
      jsonBytes: jsonBytes.length,
      zlibBytes: zBytes.length,
      payloadChars: payload.length,
      codec,
    },
  }
}
