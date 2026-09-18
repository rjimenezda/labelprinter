import { describe, expect, it } from 'vitest'
import { POKEMON_NAMES } from '../../data/pokemonNames'
import {
  formatPokemonNumber,
  isValidPokemonId,
  pokemonArtworkUrl,
  pokemonDisplayName,
  pokemonRawName,
  POKEMON_MAX_ID,
  POKEMON_MIN_ID,
} from '../pokemon'

describe('pokemon helpers', () => {
  it('has a name table covering the full National Dex (1-1025)', () => {
    expect(POKEMON_NAMES.length).toBe(1025)
    expect(POKEMON_MIN_ID).toBe(1)
    expect(POKEMON_MAX_ID).toBe(1025)
  })

  it('resolves known raw names at known ids', () => {
    expect(pokemonRawName(1)).toBe('bulbasaur')
    expect(pokemonRawName(25)).toBe('pikachu')
    expect(pokemonRawName(151)).toBe('mew')
    expect(pokemonRawName(1025)).toBe('pecharunt')
  })

  it('builds a deterministic artwork URL from the id alone', () => {
    expect(pokemonArtworkUrl(25)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    )
  })

  it('title-cases hyphenated names', () => {
    expect(pokemonDisplayName(122)).toBe('Mr Mime') // raw name "mr-mime"
    expect(pokemonDisplayName(83)).toBe('Farfetchd') // raw name "farfetchd", no hyphen
  })

  it('applies manual overrides for names that do not Title-Case sensibly', () => {
    const nidoranFId = POKEMON_NAMES.indexOf('nidoran-f') + 1
    const nidoranMId = POKEMON_NAMES.indexOf('nidoran-m') + 1
    expect(pokemonDisplayName(nidoranFId)).toBe('Nidoran♀')
    expect(pokemonDisplayName(nidoranMId)).toBe('Nidoran♂')
  })

  it('formats the dex number with zero-padding', () => {
    expect(formatPokemonNumber(1)).toBe('#0001')
    expect(formatPokemonNumber(25)).toBe('#0025')
    expect(formatPokemonNumber(1025)).toBe('#1025')
  })

  it('validates ids against the known range', () => {
    expect(isValidPokemonId(1)).toBe(true)
    expect(isValidPokemonId(1025)).toBe(true)
    expect(isValidPokemonId(0)).toBe(false)
    expect(isValidPokemonId(1026)).toBe(false)
    expect(isValidPokemonId(1.5)).toBe(false)
  })

  it('degrades gracefully for an out-of-range id rather than throwing', () => {
    expect(() => pokemonRawName(999999)).not.toThrow()
    expect(() => pokemonDisplayName(999999)).not.toThrow()
    expect(() => pokemonArtworkUrl(999999)).not.toThrow()
  })
})
