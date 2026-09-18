import type { IconEntry } from '../data/iconTypes'

/**
 * Registry of bundled icon libraries. Each one is dynamically imported
 * (`load()`) rather than statically imported here -- combined, the four
 * libraries run several MB (mostly Game Icons' hand-illustrated paths),
 * so nothing loads until its tab is actually opened in the icon picker.
 * See data/*.ts for per-library extraction notes and licensing detail.
 */
export interface IconLibrary {
  id: string
  label: string
  /** SVG viewBox these icons are natively drawn in -- baked into the
   *  IconBlock as `vb` when it differs from the "0 0 24 24" default. */
  vb: string
  /** Render mode: true = solid-fill style (wrapper defaults to
   *  fill=#000/stroke=none), false = stroke style (fill=none/stroke=#000,
   *  configurable width). See render/nodes/Icon.tsx's doc. */
  fillMode: boolean
  /** Short license/attribution note shown in the picker and the hub. */
  license: string
  load: () => Promise<readonly IconEntry[]>
}

export const ICON_LIBRARIES: readonly IconLibrary[] = [
  {
    id: 'lucide',
    label: 'Lucide',
    vb: '0 0 24 24',
    fillMode: false,
    license: 'MIT/ISC -- no attribution required',
    load: () => import('../data/lucideIcons').then((m) => m.LUCIDE_ICONS),
  },
  {
    id: 'phosphor',
    label: 'Phosphor',
    vb: '0 0 256 256',
    fillMode: true,
    license: 'MIT -- no attribution required',
    load: () => import('../data/phosphorIcons').then((m) => m.PHOSPHOR_ICONS),
  },
  {
    id: 'game-icons',
    label: 'Game Icons',
    vb: '0 0 512 512',
    fillMode: true,
    license: 'CC BY 3.0 -- credit game-icons.net (see hub)',
    load: () => import('../data/gameIcons').then((m) => m.GAME_ICONS),
  },
  {
    id: 'openmoji',
    label: 'OpenMoji',
    vb: '0 0 72 72',
    fillMode: true,
    license: 'CC BY-SA 4.0 -- credit openmoji.org (see hub)',
    load: () => import('../data/openmojiIcons').then((m) => m.OPENMOJI_ICONS),
  },
]
