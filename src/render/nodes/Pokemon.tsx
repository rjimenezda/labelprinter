import type { PokemonBlock } from '../../codec/types'
import { formatPokemonNumber, pokemonArtworkUrl, pokemonDisplayName } from '../../pokemon/pokemon'
import { FONT_SM } from '../tokens'
import { d } from '../units'

/**
 * Image + optional name/number, both resolved offline from the id alone
 * (see pokemon/pokemon.ts) -- no PokeAPI call happens here, only the
 * same passive <img src> loading ImageBlock already relies on.
 */
export function Pokemon({ block }: { block: PokemonBlock }) {
  const showName = block.showName !== 0
  const showNumber = block.showNumber !== 0

  return (
    <div style={{ width: '100%' }}>
      <img
        src={pokemonArtworkUrl(block.id)}
        alt=""
        style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain' }}
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden'
        }}
      />
      {showName && (
        <p className="lp-text" style={{ fontSize: d(FONT_SM), fontWeight: 700, textAlign: 'center' }}>
          {pokemonDisplayName(block.id)}
        </p>
      )}
      {showNumber && (
        <p className="lp-text" style={{ fontSize: d(FONT_SM), textAlign: 'center' }}>
          {formatPokemonNumber(block.id)}
        </p>
      )}
    </div>
  )
}
