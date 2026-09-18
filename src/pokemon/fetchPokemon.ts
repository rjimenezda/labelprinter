import { pokemonDisplayName } from './pokemon'

/**
 * Editor-only: resolves free-text (a name or a dex number) against the
 * live PokeAPI, so the user can type "pikachu" or "25" and get back a
 * confirmed canonical id before it's baked into the doc. Never imported
 * by render/ or the viewer -- once resolved, the doc stores only the
 * numeric id, and everything else (artwork URL, display name) is
 * computed offline from it (see pokemon.ts).
 *
 * Hits /pokemon-species/ rather than /pokemon/ deliberately: species ids
 * are the contiguous 1-1025 National Dex range that matches our bundled
 * name table, whereas /pokemon/ also resolves mega/regional-form
 * variants at non-contiguous higher ids that we don't support.
 */
export interface ResolvedPokemon {
  id: number
  name: string
}

export async function resolvePokemon(query: string): Promise<ResolvedPokemon> {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) throw new Error('Enter a Pokemon name or number.')

  let res: Response
  try {
    res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(trimmed)}`)
  } catch {
    throw new Error('Could not reach PokeAPI -- check your connection.')
  }
  if (!res.ok) {
    throw new Error(res.status === 404 ? `No Pokemon found for "${query}".` : `PokeAPI error (${res.status}).`)
  }

  const data = (await res.json()) as { id?: unknown }
  if (typeof data.id !== 'number') {
    throw new Error('Unexpected response from PokeAPI.')
  }
  return { id: data.id, name: pokemonDisplayName(data.id) }
}
