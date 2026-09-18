/**
 * Hand-rolled hash routing -- not a router library. Two reasons this
 * matters more than it looks: a router would `decodeURIComponent` the
 * param for us, and our payload must survive verbatim (only our own
 * codec's base64url alphabet is ever supposed to appear there, but the
 * decoder is deliberately liberal about `%`-encoded input, so parsing
 * has to be explicit about when decoding happens). And the viewer route
 * needs to boot fast over LAN Wi-Fi -- no router bundle in that path.
 */

export type Route =
  | { k: 'editor' }
  | { k: 'view'; payload: string }
  | { k: 'hub' }
  | { k: 'selftest' }
  | { k: 'notfound'; raw: string }

export function parseHash(hash: string): Route {
  // location.hash includes the leading '#'; strip it.
  const raw = hash.startsWith('#') ? hash.slice(1) : hash

  if (raw === '' || raw === '/') return { k: 'editor' }
  if (raw === '/hub') return { k: 'hub' }
  if (raw === '/probe/selftest') return { k: 'selftest' }

  if (raw.startsWith('/p/')) {
    const payload = raw.slice('/p/'.length)
    // Only decode if the payload actually contains a % escape -- our own
    // codec alphabet (A-Za-z0-9-_) is never percent-encoded, so this only
    // fires if something upstream (a paste field, a URL normalizer)
    // re-encoded the fragment.
    const decoded = payload.includes('%') ? safeDecodeURIComponent(payload) : payload
    return { k: 'view', payload: decoded }
  }

  return { k: 'notfound', raw }
}

export function buildViewerHash(payload: string): string {
  return `#/p/${payload}`
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
