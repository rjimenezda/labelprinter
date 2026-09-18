import { unzlibSync } from 'fflate'
import { base64urlDecode } from './base64url'
import { fnv1a32 } from './checksum'
import { parseContainer } from './container'
import { isLabelDocShape, normalizeDoc } from './normalize'
import { SCHEMA_VERSION, type DecodeResult, type DecodeWarning } from './types'
import { utf8Decode } from './utf8'

export function decodePayload(raw: string): DecodeResult {
  const parsed = parseContainer(raw)
  if (!parsed.ok) {
    return { ok: false, code: parsed.error, message: describeContainerError(parsed.error) }
  }

  let jsonBytes: Uint8Array
  try {
    const decoded = base64urlDecode(parsed.payload)
    if (parsed.codec === 'Z') {
      jsonBytes = unzlibSync(decoded)
    } else {
      if (decoded.length < 4) {
        return { ok: false, code: 'CHECKSUM', message: 'Payload is too short to contain a valid checksum.' }
      }
      const body = decoded.subarray(0, decoded.length - 4)
      const expected = new DataView(decoded.buffer, decoded.byteOffset + decoded.length - 4, 4).getUint32(0, false)
      const actual = fnv1a32(body)
      if (actual !== expected) {
        return {
          ok: false,
          code: 'CHECKSUM',
          message: 'This label looks truncated or corrupted (checksum mismatch) -- the URL may have been cut off.',
        }
      }
      jsonBytes = body
    }
  } catch (e) {
    return {
      ok: false,
      code: parsed.codec === 'Z' ? 'INFLATE' : 'BASE64',
      message: parsed.codec === 'Z' ? 'Could not decompress this label (it may be truncated).' : 'Could not decode this label.',
      detail: String(e),
    }
  }

  let json: unknown
  try {
    json = JSON.parse(utf8Decode(jsonBytes))
  } catch (e) {
    return { ok: false, code: 'JSON', message: 'Decoded data is not valid JSON.', detail: String(e) }
  }

  if (!isLabelDocShape(json)) {
    return { ok: false, code: 'NOT_A_DOC', message: 'This does not look like a label document.' }
  }

  const minvRaw = (json as { minv?: unknown }).minv
  if (typeof minvRaw === 'number') {
    const minv = minvRaw
    if (minv > SCHEMA_VERSION) {
      return {
        ok: false,
        code: 'SCHEMA_TOO_NEW',
        message: `This label needs viewer schema v${minv}. This viewer supports up to v${SCHEMA_VERSION}.`,
      }
    }
  }

  const warnings: DecodeWarning[] = []
  if (typeof json.v === 'number' && json.v > SCHEMA_VERSION) {
    warnings.push({ w: 'NEWER_SCHEMA', docV: json.v, viewerV: SCHEMA_VERSION })
  }

  const doc = normalizeDoc(json, warnings)
  return { ok: true, doc, warnings }
}

function describeContainerError(code: 'EMPTY' | 'BAD_PREFIX' | 'CONTAINER_TOO_NEW'): string {
  switch (code) {
    case 'EMPTY':
      return 'No label data in this URL.'
    case 'BAD_PREFIX':
      return 'This URL does not contain a recognizable label payload.'
    case 'CONTAINER_TOO_NEW':
      return 'This label was made with a newer version of this tool.'
  }
}
