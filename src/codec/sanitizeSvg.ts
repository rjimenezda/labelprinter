/**
 * Restricts IconBlock's raw SVG markup to a small allowlist of shape
 * elements/attributes before it's trusted (dangerouslySetInnerHTML'd) by
 * the renderer. This is needed because -- unlike QR/barcode, which are
 * always REGENERATED from primitive data and never trust raw markup from
 * the wire -- an icon's markup IS the wire format (see codec/types.ts's
 * IconBlock doc: baking in a few hundred bytes of markup per icon is what
 * avoids bundling any of the several-MB icon libraries into the viewer).
 * Without this, a hand-crafted URL could smuggle a <script>, an
 * event-handler attribute, or a <foreignObject> into the app.
 *
 * Uses the real browser SVG parser (DOMParser) to build an allowlist
 * tree, rather than trying to blocklist dangerous patterns with regex --
 * blocklists are the wrong shape for this problem; allowlists fail safe.
 *
 * fill/stroke are allowed per-element (not just via the renderer's own
 * wrapper) because OpenMoji icons mix their own per-element styling in
 * the source -- but their VALUES are restricted to our 1-bit palette
 * (black/none/currentColor). This isn't primarily a security concern
 * (colors aren't a script-injection vector); it's a design-integrity one:
 * nothing should be able to sneak an actual color or a paint-server
 * reference (url(#gradient)) past the "pure #000/#fff" rule everything
 * else in this renderer follows.
 */

const ALLOWED_TAGS = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g'])

const ALLOWED_GEOMETRY_ATTRS = new Set([
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'width',
  'height',
  'points',
  'transform',
])

const COLOR_ATTRS = new Set(['fill', 'stroke'])
const OTHER_STYLE_ATTRS = new Set(['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule'])

const SAFE_COLOR_VALUES = new Set(['none', '#000', '#000000', 'black', 'currentcolor'])

// Real icon markup runs from under a hundred bytes (Lucide) to a few
// thousand (OpenMoji's more detailed faces top out around 4.6KB) --
// anything wildly larger than any bundled library's actual max is
// suspicious on its face and not worth even attempting to parse.
const MAX_MARKUP_LENGTH = 6000

export function sanitizeIconSvg(markup: unknown): string | null {
  if (typeof markup !== 'string' || markup.length === 0 || markup.length > MAX_MARKUP_LENGTH) return null
  if (typeof DOMParser === 'undefined') return null

  let doc: Document
  try {
    doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, 'image/svg+xml')
  } catch {
    return null
  }
  if (doc.getElementsByTagName('parsererror').length > 0) return null

  const root = doc.documentElement
  if (!root) return null

  // Clean in place: strip disallowed attributes/descendants, and drop any
  // top-level child that isn't an allowed element outright (this also
  // removes stray text nodes -- root.children only ever enumerates
  // elements, so plain text sitting alongside them is never inspected by
  // cleanElement and would otherwise survive untouched).
  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE || !cleanElement(child as Element)) {
      root.removeChild(child)
    }
  }
  if (root.children.length === 0) return null

  // Serialize the surviving tree once via the parent's innerHTML, rather
  // than each child's own outerHTML -- serializing a child in isolation
  // re-declares `xmlns` on every single element, which (multiplied across
  // every icon in a doc) is pure avoidable bloat in the URL payload.
  // jsdom's innerHTML re-adds it anyway despite the parent already
  // declaring it (a serializer quirk, not a security concern -- the
  // attribute isn't allowed and carries no risk), so strip it explicitly
  // rather than relying on the serializer to omit it.
  const out = root.innerHTML.replace(/\s+xmlns="[^"]*"/g, '').trim()
  return out.length > 0 ? out : null
}

/** Mutates and returns `el` with disallowed attributes stripped and
 *  disallowed descendants removed, or returns null if `el` itself isn't
 *  an allowed tag. */
function cleanElement(el: Element): Element | null {
  if (!ALLOWED_TAGS.has(el.tagName.toLowerCase())) return null

  for (const attr of Array.from(el.attributes)) {
    if (ALLOWED_GEOMETRY_ATTRS.has(attr.name) || OTHER_STYLE_ATTRS.has(attr.name)) {
      continue
    }
    if (COLOR_ATTRS.has(attr.name)) {
      if (!SAFE_COLOR_VALUES.has(attr.value.trim().toLowerCase())) {
        el.removeAttribute(attr.name)
      }
      continue
    }
    el.removeAttribute(attr.name)
  }
  for (const child of Array.from(el.children)) {
    if (!cleanElement(child)) el.removeChild(child)
  }
  return el
}
