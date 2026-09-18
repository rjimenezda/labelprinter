import { POKEMON_NAMES } from '../data/pokemonNames'

/**
 * Pure, offline helpers -- no network, safe to import from render/ and
 * the viewer. Scoped deliberately to base species only (National Dex
 * 1-1025, matching the bundled name table), not PokeAPI's broader
 * /pokemon/ endpoint which also covers mega/regional-form variants at
 * non-contiguous ids -- "enter its number" means the dex number, and
 * that's a well-known, unambiguous range.
 */

export const POKEMON_MIN_ID = 1
export const POKEMON_MAX_ID = POKEMON_NAMES.length

export function isValidPokemonId(id: number): boolean {
  return Number.isInteger(id) && id >= POKEMON_MIN_ID && id <= POKEMON_MAX_ID
}

/**
 * Deterministic from the id alone -- no lookup needed. Confirmed to
 * exist for the full 1-1025 range and to serve with
 * `access-control-allow-origin: *` (checked 2026-09-16), so unlike an
 * arbitrary user-supplied ImageBlock URL, this one also works for the
 * simulator's canvas pixel readback, not just display.
 */
export function pokemonArtworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

// PokeAPI's raw names are lowercase-hyphenated (e.g. "ho-oh"); a couple
// don't Title-Case sensibly and get a manual override.
const DISPLAY_OVERRIDES: Record<string, string> = {
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
}

export function pokemonRawName(id: number): string {
  return POKEMON_NAMES[id - 1] ?? `pokemon-${id}`
}

export function pokemonDisplayName(id: number): string {
  const raw = pokemonRawName(id)
  const override = DISPLAY_OVERRIDES[raw]
  if (override) return override
  return raw
    .split('-')
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function formatPokemonNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}
