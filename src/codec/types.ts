/**
 * The label document schema. Every length is an integer number of printer
 * dots (384 = full width at 203dpi/8 dots-per-mm on the 58mm roll) -- see
 * src/probe-results.ts for the measured constants this design leans on.
 *
 * Reserved single-letter keys (never reuse a letter for a different
 * meaning across block types -- this is what keeps old URLs renderable
 * forever):
 *   t  = block-type discriminant (every block/item)
 *   s  = text string content (TextBlock)
 *   d  = data payload (QrBlock, BarcodeBlock: encoded data; ImageBlock: URL)
 *   z  = font size in dots (TextBlock)
 *   bd = bold (TextBlock)            -- NOT `w`, that means width elsewhere
 *   a  = align: l | c | r            (TextBlock)
 *   f  = font family / barcode format (TextBlock, BarcodeBlock)
 *   i  = inverted (TextBlock)
 *   lh = line height in dots (TextBlock)
 *   e  = QR error-correction level (QrBlock)
 *   m  = module size in dots (QrBlock, BarcodeBlock)
 *   h  = height in dots (BarcodeBlock, Item)
 *   n  = show human-readable text (BarcodeBlock)
 *   th = thickness in dots (RuleBlock, BoxBlock); SVG stroke-width, in
 *        the icon's own viewBox units (IconBlock, stroke-style only)
 *   fill = filled vs outline, 0|1 (BoxBlock); solid-fill vs stroke-style
 *          icon, 0|1 (IconBlock) -- same "filled vs outline" concept,
 *          reused deliberately
 *   fit = contain | cover | fill (ImageBlock)
 *   crop = { s, ox, oy[, h] }: cover-fit pan/zoom crop, cross-cutting
 *          across every block backed by a raster photo (ImageBlock,
 *          PokemonBlock) -- s is a zoom factor >=1 (1 = default cover
 *          fit), ox/oy are a pan offset as a fraction of the crop frame,
 *          each clamped to [-(s-1)/2, (s-1)/2] so the frame always stays
 *          fully covered. On ImageBlock the frame IS the item box; on
 *          PokemonBlock the artwork is only part of the item (the
 *          name/number caption sits below it), so `h` locks that
 *          sub-box's height in dots instead of reusing Item.h
 *   id = National Dex number (PokemonBlock)
 *   showName, showNumber = 0 | 1 (PokemonBlock)
 *   name = canonical icon name, e.g. "house" (IconBlock) -- editor UX
 *          only (re-highlighting the picker), never read by the renderer
 *   vb = SVG viewBox, e.g. "0 0 512 512" (IconBlock) -- default "0 0 24 24"
 */

export const SCHEMA_VERSION = 1

export const DEFAULT_WIDTH_DOTS = 384

export interface LabelDoc {
  v: number
  /** Minimum viewer schema version required to render this correctly.
   *  Only set when a doc uses a feature whose omission would be wrong,
   *  never for purely cosmetic additions. */
  minv?: number
  w: number
  /** Canvas height in dots. Author-set (or auto-grown by the editor to
   *  fit content); the viewer never invents this. */
  h: number
  items: Item[]
  meta?: { name?: string }
}

export interface Item {
  id: string
  x: number
  y: number
  w: number
  /** Omitted = intrinsic content height (text wraps/grows naturally). */
  h?: number
  z: number
  /** Clockwise rotation in whole degrees, pivoting around the item's own
   *  center (see render/LabelRoot.tsx). Normalized to [0, 360) on decode;
   *  omitted or 0 means unrotated. */
  rot?: number
  block: Block
}

export type BlockType =
  | TextBlock['t']
  | QrBlock['t']
  | BarcodeBlock['t']
  | RuleBlock['t']
  | BoxBlock['t']
  | ImageBlock['t']
  | PokemonBlock['t']
  | IconBlock['t']

export type Block =
  | TextBlock
  | QrBlock
  | BarcodeBlock
  | RuleBlock
  | BoxBlock
  | ImageBlock
  | PokemonBlock
  | IconBlock

export interface TextBlock {
  t: 't'
  s: string
  /** dots. Default MIN_FONT_DOTS_NORMAL (16, see probe-results.ts). */
  z?: number
  bd?: 0 | 1
  a?: 'l' | 'c' | 'r'
  f?: 's' | 'm'
  i?: 0 | 1
  lh?: number
}

export interface QrBlock {
  t: 'q'
  d: string
  e?: 'L' | 'M' | 'Q' | 'H'
  /** module size in dots. Width is DERIVED from this, never the reverse
   *  -- see src/codegen/qr.ts. */
  m?: number
}

export interface BarcodeBlock {
  t: 'c'
  d: string
  f?: '128' | '39' | 'ean13'
  /** narrow-bar width in dots */
  m?: number
  h?: number
  n?: 0 | 1
}

export interface RuleBlock {
  t: 'r'
  th?: number
  s?: 'solid' | 'dashed'
}

export interface BoxBlock {
  t: 'b'
  th?: number
  fill?: 0 | 1
}

/**
 * Best-effort exception to the renderer's "no <img>" rule (see
 * render/LabelRoot.tsx's contract doc for why that rule exists). `d` is a
 * plain image URL, loaded directly by whatever's rendering the page --
 * the viewer's WKWebView, or the editor's own browser. No proxy, no
 * hosting, no CORS workaround: if the URL blocks cross-origin loads or
 * TinyPrint's capture doesn't wait for it, the image just doesn't show
 * up. That trade-off is accepted deliberately, not an oversight.
 */
/**
 * A cover-fit pan/zoom crop, cross-cutting across every block backed by
 * a raster photo -- see the reserved-keys note above for the field
 * semantics and clamp math (shared by render/nodes/Image.tsx and
 * Pokemon.tsx).
 */
export interface ImageCrop {
  s: number
  ox: number
  oy: number
}

export interface ImageBlock {
  t: 'i'
  d: string
  fit?: 'contain' | 'cover' | 'fill'
  /** In-place pan/zoom crop, set via the editor's on-canvas crop tool.
   *  When present, overrides `fit` with cover-based pan/zoom. The frame
   *  is the item's own box (Item.w x Item.h). */
  crop?: ImageCrop
}

/**
 * A PokeAPI-sourced block: id is resolved ONCE in the editor (via a live
 * lookup, see pokemon/fetchPokemon.ts) and baked in here as a plain
 * National Dex number. The render path never calls PokeAPI -- the
 * artwork URL and display name are both derived offline from the id
 * alone (see pokemon/pokemon.ts), so this stays consistent with the "no
 * live API dependency in the render path" rule everything else in this
 * schema follows; the only network fetch is the same passive <img src>
 * loading ImageBlock already relies on.
 */
export interface PokemonBlock {
  t: 'p'
  id: number
  /** default 1 (shown) */
  showName?: 0 | 1
  /** default 1 (shown) */
  showNumber?: 0 | 1
  /** Same in-place pan/zoom crop as ImageBlock, but the artwork is only
   *  part of the item (the name/number caption sits below it), so the
   *  frame isn't Item.h -- `h` locks the artwork sub-box's own height in
   *  dots instead. */
  crop?: ImageCrop & { h: number }
}

/**
 * An icon from one of several bundled libraries (see
 * editor/iconLibraries.ts for the registry: Lucide, Phosphor, Game Icons,
 * OpenMoji) -- `d` is the icon's inner SVG markup, resolved ONCE in the
 * editor's icon picker and baked in directly, the same way PokemonBlock
 * bakes in a resolved id and ImageBlock bakes in a URL. This means the
 * viewer never needs any icon library bundled at all (see
 * data/lucideIcons.ts's doc) -- only the editor does, and each library
 * lazy-loads independently within the editor, since the four combined
 * run several MB (mostly Game Icons' hand-illustrated paths).
 *
 * Line-art/outline and solid-fill styles were both chosen deliberately
 * over detailed/gradient/multi-tone styles: a consistent 1-2 color
 * design is exactly what survives 1-bit thresholding on thermal paper
 * (see probe-results.ts's P3 findings) -- solid fills (Phosphor's fill
 * weight, Game Icons, OpenMoji's occasional detail shapes) are if
 * anything even more print-reliable than thin strokes.
 */
export interface IconBlock {
  t: 'k'
  /** Inner SVG markup only. Most of it is untouched geometry (path/
   *  circle/etc), but unlike Lucide's pure outlines, OpenMoji icons mix
   *  in their own per-element fill/stroke/color (see sanitizeSvg.ts,
   *  which allow-lists this to black/none/currentColor only -- 1-bit
   *  output has no room for arbitrary color). */
  d: string
  /** Canonical name, e.g. "house" -- editor UX only (lets the picker
   *  re-highlight the current icon); the renderer never reads it. */
  name?: string
  /** SVG stroke-width, in the icon's own viewBox units. Only meaningful
   *  when `fill` is unset (stroke-style icons, e.g. Lucide) -- default 2. */
  th?: number
  /** 1 = solid-fill style (Phosphor's fill weight, Game Icons, OpenMoji):
   *  the renderer's wrapper defaults to fill=#000/stroke=none instead of
   *  fill=none/stroke=#000, letting each source's own per-element styling
   *  (where present) still take precedence. Unset/0 = stroke style. */
  fill?: 0 | 1
  /** viewBox, e.g. "0 0 512 512". Default "0 0 24 24" (Lucide/most UI
   *  icon sets' native size) -- Phosphor is 256x256, Game Icons 512x512,
   *  OpenMoji 72x72, so this travels with the block rather than being
   *  assumed globally. */
  vb?: string
}

export type DecodeResult =
  | { ok: true; doc: LabelDoc; warnings: DecodeWarning[] }
  | { ok: false; code: DecodeErrorCode; message: string; detail?: string }

export type DecodeErrorCode =
  | 'EMPTY'
  | 'BAD_PREFIX'
  | 'CONTAINER_TOO_NEW'
  | 'BASE64'
  | 'INFLATE'
  | 'CHECKSUM'
  | 'JSON'
  | 'NOT_A_DOC'
  | 'SCHEMA_TOO_NEW'

export type DecodeWarning =
  | { w: 'UNKNOWN_BLOCK_TYPE'; itemId: string; type: string }
  | { w: 'UNKNOWN_FIELD'; itemId: string; key: string }
  | { w: 'NEWER_SCHEMA'; docV: number; viewerV: number }
  | { w: 'CLAMPED'; itemId: string; field: string }
