import type { LabelDoc } from '../codec/types'

/**
 * Which bundled icon libraries require attribution when their icons are
 * printed (see editor/iconLibraries.ts's `license` field for the full
 * registry -- Lucide and Phosphor are both attribution-free, so they're
 * simply absent here).
 *
 * IconBlock never records which library an icon came from (see its doc in
 * codec/types.ts) -- only its native viewBox survives into the baked
 * block, which happens to be distinct per bundled library. That's enough
 * to identify game-icons/OpenMoji icons here without the viewer importing
 * editor/iconLibraries.ts, which would pull the editor's icon-picker code
 * (several MB across four libraries) into the viewer's fast-boot bundle.
 */
const ATTRIBUTION_BY_VIEWBOX: readonly { vb: string; text: string }[] = [
  { vb: '0 0 512 512', text: 'Icons by game-icons.net, CC BY 3.0' },
  { vb: '0 0 72 72', text: 'Icons by OpenMoji (openmoji.org), CC BY-SA 4.0' },
]

/** Attribution lines required for the icon blocks actually used in `doc`,
 *  in registry order, deduplicated. Empty when nothing in the doc needs
 *  attribution. */
export function getIconAttributions(doc: LabelDoc): string[] {
  const usedViewBoxes = new Set<string>()
  for (const item of doc.items) {
    if (item.block.t === 'k') usedViewBoxes.add(item.block.vb ?? '0 0 24 24')
  }
  return ATTRIBUTION_BY_VIEWBOX.filter((rule) => usedViewBoxes.has(rule.vb)).map((rule) => rule.text)
}
