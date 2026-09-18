import { sanitizeIconSvg } from './sanitizeSvg'
import type { Block, DecodeWarning, Item, LabelDoc } from './types'
import { DEFAULT_WIDTH_DOTS } from './types'

/**
 * Best-effort validation/clamping of decoded JSON into a renderable
 * LabelDoc. Never throws and never drops content silently -- an item with
 * an unrecognized block type becomes a visible placeholder rather than
 * disappearing, because a label that quietly omits the barcode you needed
 * is worse than one that tells you it couldn't render it.
 */

export function isLabelDocShape(json: unknown): json is { v: number; w?: number; h?: number; items?: unknown } {
  return (
    typeof json === 'object' &&
    json !== null &&
    typeof (json as Record<string, unknown>).v === 'number' &&
    Array.isArray((json as Record<string, unknown>).items)
  )
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function placeholderItem(id: string, x: number, y: number, label: string): Item {
  return {
    id,
    x,
    y,
    w: 200,
    z: 9999,
    block: { t: 't', s: `[unsupported: "${label}"]`, i: 1, bd: 1 },
  }
}

function normalizeBlock(raw: unknown, itemId: string, warnings: DecodeWarning[]): Block | null {
  if (typeof raw !== 'object' || raw === null) return null
  const b = raw as Record<string, unknown>
  const t = b.t
  switch (t) {
    case 't':
      if (typeof b.s !== 'string') return null
      return {
        t: 't',
        s: b.s,
        z: isFiniteNumber(b.z) ? b.z : undefined,
        bd: b.bd === 1 ? 1 : undefined,
        a: b.a === 'c' || b.a === 'r' ? b.a : b.a === 'l' ? 'l' : undefined,
        f: b.f === 'm' ? 'm' : undefined,
        i: b.i === 1 ? 1 : undefined,
        lh: isFiniteNumber(b.lh) ? b.lh : undefined,
      }
    case 'q':
      if (typeof b.d !== 'string') return null
      return {
        t: 'q',
        d: b.d,
        e: b.e === 'L' || b.e === 'M' || b.e === 'Q' || b.e === 'H' ? b.e : undefined,
        m: isFiniteNumber(b.m) ? b.m : undefined,
      }
    case 'c':
      if (typeof b.d !== 'string') return null
      return {
        t: 'c',
        d: b.d,
        f: b.f === '39' || b.f === 'ean13' ? b.f : b.f === '128' ? '128' : undefined,
        m: isFiniteNumber(b.m) ? b.m : undefined,
        h: isFiniteNumber(b.h) ? b.h : undefined,
        n: b.n === 1 ? 1 : undefined,
      }
    case 'r':
      return {
        t: 'r',
        th: isFiniteNumber(b.th) ? b.th : undefined,
        s: b.s === 'dashed' ? 'dashed' : undefined,
      }
    case 'b':
      return {
        t: 'b',
        th: isFiniteNumber(b.th) ? b.th : undefined,
        fill: b.fill === 1 ? 1 : undefined,
      }
    case 'i':
      if (typeof b.d !== 'string') return null
      return {
        t: 'i',
        d: b.d,
        fit: b.fit === 'cover' || b.fit === 'fill' ? b.fit : b.fit === 'contain' ? 'contain' : undefined,
      }
    case 'p':
      if (!isFiniteNumber(b.id) || b.id < 1) return null
      return {
        t: 'p',
        id: Math.round(b.id),
        showName: b.showName === 0 ? 0 : undefined,
        showNumber: b.showNumber === 0 ? 0 : undefined,
      }
    case 'k': {
      const cleaned = sanitizeIconSvg(b.d)
      if (!cleaned) return null
      // vb is inserted into our own JSX as a plain attribute value (React
      // escapes it, no injection risk), but a malformed one would still
      // break the icon's layout -- require exactly 4 space-separated
      // non-negative numbers before trusting it.
      const vb = typeof b.vb === 'string' && /^\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/.test(b.vb)
        ? b.vb
        : undefined
      return {
        t: 'k',
        d: cleaned,
        name: typeof b.name === 'string' ? b.name.slice(0, 60) : undefined,
        th: isFiniteNumber(b.th) ? b.th : undefined,
        fill: b.fill === 1 ? 1 : undefined,
        vb,
      }
    }
    default:
      warnings.push({ w: 'UNKNOWN_BLOCK_TYPE', itemId, type: String(t) })
      return null
  }
}

export function normalizeDoc(json: unknown, warnings: DecodeWarning[]): LabelDoc {
  const raw = json as Record<string, unknown>
  const w = isFiniteNumber(raw.w) && raw.w > 0 ? Math.round(raw.w) : DEFAULT_WIDTH_DOTS
  const items: Item[] = []
  const rawItems = Array.isArray(raw.items) ? raw.items : []

  let autoId = 0
  let maxY = 0
  for (const ri of rawItems) {
    if (typeof ri !== 'object' || ri === null) continue
    const it = ri as Record<string, unknown>
    const id = typeof it.id === 'string' ? it.id : `auto-${autoId++}`
    const x = isFiniteNumber(it.x) ? Math.round(it.x) : 0
    const y = isFiniteNumber(it.y) ? Math.round(it.y) : 0
    const iw = isFiniteNumber(it.w) ? Math.round(it.w) : w
    const ih = isFiniteNumber(it.h) ? Math.round(it.h) : undefined
    const z = isFiniteNumber(it.z) ? it.z : 0
    const rot = it.rot === 90 || it.rot === 180 || it.rot === 270 ? it.rot : undefined

    const block = normalizeBlock(it.block, id, warnings)
    if (block) {
      items.push({ id, x, y, w: iw, h: ih, z, rot, block })
    } else {
      const label = typeof (it.block as Record<string, unknown> | undefined)?.t === 'string'
        ? String((it.block as Record<string, unknown>).t)
        : 'unknown'
      items.push(placeholderItem(id, x, y, label))
    }
    maxY = Math.max(maxY, y + (ih ?? 40))
  }

  const h = isFiniteNumber(raw.h) && raw.h > 0 ? Math.round(raw.h) : Math.max(40, maxY)

  return {
    v: typeof raw.v === 'number' ? raw.v : 1,
    minv: isFiniteNumber(raw.minv) ? raw.minv : undefined,
    w,
    h,
    items,
    meta: typeof raw.meta === 'object' && raw.meta !== null ? (raw.meta as LabelDoc['meta']) : undefined,
  }
}
