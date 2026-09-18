/**
 * Measured constants from printing the probes in public/probe/ on the real
 * TinyPrint app + thermal printer. Only put a number here once it has
 * actually been read off printed paper -- never a guess. If something is
 * still unknown, leave a TODO comment, don't fill in a plausible-looking
 * default; render/env.ts should fail loudly (or fall back conservatively)
 * rather than silently trust an unmeasured constant.
 *
 * Physical facts (not measured, just arithmetic from the printer spec):
 *   58mm roll, 203dpi => 8 dots/mm => 384 dots printable width (~48mm).
 */

// ---- P0 (2026-09-11): gate -----------------------------------------------
// Hash fragment survives byte-identical, JS runs. Confirmed via p0-hash.html.
export const HASH_SURVIVES = true
export const JS_RUNS = true

// ---- P1 (2026-09-11): geometry, from p1-geom-C.html ----------------------
// meta viewport width=384 is honoured exactly by TinyPrint's WKWebView:
// document.documentElement.clientWidth printed as 384, and the computed
// dotsPerCssPx (384 paper-dots / 384 viewport-px) printed as 1.
export const VIEWPORT_META = 'width=384, initial-scale=1.0'
export const LAYOUT_VIEWPORT_CSS_PX = 384
export const DOTS_PER_CSS_PX = 1
export const VIEWPORT_STRATEGY = 'meta-fixed' as const

// Horizontal calibration: the 320px (nominal 40mm) bar measured ~41mm with
// a hand ruler -- within reading noise of the 8 dots/mm (203dpi) spec, so
// treated as confirming it rather than contradicting it.
export const DOTS_PER_MM_HORIZONTAL = 8

// Vertical calibration: the 800px (nominal 100mm) ruler measured "about
// 100mm" -- no significant feed skew vs horizontal. The paper was snagging
// slightly during this print (a mechanical issue with the feed, not a
// CSS/geometry problem) -- worth re-checking if a later long print shows
// vertical banding or stretching.
export const DOTS_PER_MM_VERTICAL = 8
export const FEED_SNAG_OBSERVED_2026_09_11 = true

// Physical print margin: the edge-tick ruler's largest FULLY VISIBLE number
// was 350, not 384 -- even though the CSS layout (clientWidth, and the
// ruler's own width:100%) is exactly 384 wide. So somewhere in the last
// ~34 CSS px (~4mm) at the right edge, ink doesn't reach the paper. This is
// a printer/app safe-area clipping, independent of the (confirmed correct)
// CSS geometry.
// TODO verify: is this right-edge-only, or symmetric (check whether "0"
// printed flush against the left edge)? Until confirmed, treat both edges
// as unsafe and keep content inset by this margin on the right; the left
// value is a placeholder, not yet measured.
export const SAFE_MARGIN_RIGHT_DOTS = 34 // provisional
export const SAFE_MARGIN_LEFT_DOTS = 0 // TODO: unmeasured, don't trust yet

// Crop-vs-scale (whether horizontal overflow shrinks the whole label, or is
// simply cropped off): p1-crop-visible.html / p1-crop-hidden.html not yet
// printed. Until measured, the real renderer defends with overflow-x:hidden
// unconditionally (the cheaper assumption either way).
// export const OVERFLOW_BEHAVIOR: 'scale' | 'crop' = ???

// ---- P3 (2026-09-13): raster quality, from p3-raster.html ----------------
// Horizontal rules: all six widths (0.5/1/1.5/2/3/4 px) printed visibly --
// no minimum stroke width to enforce, thin rules are safe.
export const MIN_STROKE_DOTS = 1

// Font ladder: text legible from 16px onward (regular and bold both read
// fine at 16; below that it degrades). Inverted (white-on-black) text is
// worse at the same size -- 18px is the smallest comfortably-readable
// inverted size, i.e. inverted text needs one size step up from normal.
export const MIN_FONT_DOTS_NORMAL = 16
export const MIN_FONT_DOTS_INVERTED = 18
export const INVERT_BOOST_DOTS = MIN_FONT_DOTS_INVERTED - MIN_FONT_DOTS_NORMAL // 2

// Dither/moiré: checkerboards (1px and 2px) all print "slightly mushed"
// rather than crisp or collapsed to flat grey -- the downscale/threshold
// softens fine repeating patterns instead of aliasing them cleanly. This
// means QR modules must stay comfortably above the 1-2px range that
// mushed here; keep the existing plan of integer modules >= 3-4 dots
// rather than relying on this print to find an exact safe floor.
export const FINE_PATTERN_MUSHES = true

// Not yet measured: exact dither algorithm (threshold vs ordered vs error
// diffusion) wasn't conclusively read off the grayscale ramp this round,
// and the crop-vs-scale overflow test (p1-crop-visible/hidden) is still
// unprinted. Both are safe to defer -- the renderer already assumes pure
// #000/#fff (no greys) and always clips overflow, which is the
// conservative choice regardless of how those turn out.

// ---- P4 (2026-09-14): capture timing & extent, from p4-timing.html -------
// TinyPrint has (at least) two capture modes: single-viewport, and a
// stitched full-page capture for content taller than one viewport. Under
// stitching, position:fixed AND position:sticky elements print REPEATED
// at each stitch boundary -- confirmed on real paper, not just a WebKit
// theory. This is a real constraint, not a hypothetical one: label.css
// bans both properties outright and the contract test enforces it (see
// render/__tests__/labelcss.contract.test.ts). Everything else P4 checked
// (JS execution before capture, event timing) looked fine -- no other
// action needed there.
export const CAPTURE_HAS_STITCHED_MODE = true
export const STITCHING_REPEATS_FIXED_AND_STICKY = true
// TODO unmeasured: the exact viewport-height threshold where TinyPrint
// switches from single-shot to stitched capture, and whether stitching
// introduces any OTHER seam artifact beyond the fixed/sticky repeat (e.g.
// a scaling/offset discontinuity at the boundary for ordinary flowed
// content). Revisit if a very tall real label shows a visible seam.

// ---- P2 (2026-09-14): charset & URL length ceiling ------------------------
// The length-ladder probe (p2-len.html) used '|' as a padding delimiter so
// truncation would be visually legible on paper -- but '|' is a RESERVED
// URL character (RFC 3986), not unreserved, so wherever the URL gets
// re-normalized in transit it's correctly percent-encoded to %7C (3 bytes
// for 1). That's exactly what happened: the 250-char test arrived as 352
// bytes (~50 pipes x 2 extra bytes each = ~100, matching). This is a flaw
// in the PROBE's delimiter choice, not a transport problem -- and it's a
// real, useful confirmation of the codec's own design: base64url
// (A-Za-z0-9-_) is entirely RFC 3986 UNRESERVED, so none of it is subject
// to this re-encoding. Decided (2026-09-14): stop investing in synthetic
// length-ladder probes: encodeDoc()'s output survives length inflation by
// construction, and the real validation going forward is printing actual
// labels with real (often long, QR-bearing) URLs through the editor.
export const RESERVED_CHARS_GET_REENCODED_IN_TRANSIT = true
export const CODEC_ALPHABET_IS_UNRESERVED_SAFE_BY_DESIGN = true
// URL_HARD_LIMIT / URL_SOFT_BUDGET remain unmeasured -- ShareUrl.tsx's
// 1200-char soft budget is still a placeholder. Revisit only if a real
// printed label's URL turns out to be suspiciously long or fails to load.

// ---- P5 (2026-09-14): bundle boot, from #/probe/selftest ------------------
// All syntax/API/CSS feature checks and the live codec round-trip passed
// on the real device, against the real bundle (not a synthetic proxy).
export const BUNDLE_BOOTS_ON_DEVICE = true
