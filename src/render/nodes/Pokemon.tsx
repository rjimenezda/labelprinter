import type { PokemonBlock } from '../../codec/types'
import { formatPokemonNumber, pokemonArtworkUrl, pokemonDisplayName } from '../../pokemon/pokemon'
import { cropImgStyle } from '../cropStyle'
import { FONT_SM } from '../tokens'
import { d } from '../units'

/**
 * Image + optional name/number, both resolved offline from the id alone
 * (see pokemon/pokemon.ts) -- no PokeAPI call happens here, only the
 * same passive <img src> loading ImageBlock already relies on.
 *
 * Unlike ImageBlock, the crop frame here is only the artwork -- the
 * caption sits below it, outside the frame -- so a crop wraps the <img>
 * in its own fixed-height, overflow:hidden box (block.crop.h) rather
 * than reusing the item's own box the way ImageBlock's crop does.
 */
export function Pokemon({ block }: { block: PokemonBlock }) {
  const showName = block.showName !== 0
  const showNumber = block.showNumber !== 0
  const crop = block.crop

  const img = (
    <img
      src={pokemonArtworkUrl(block.id)}
      alt=""
      style={{
        display: 'block',
        width: '100%',
        height: crop ? '100%' : 'auto',
        objectFit: 'contain',
        ...cropImgStyle(crop),
      }}
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden'
      }}
    />
  )

  return (
    <div style={{ width: '100%' }}>
      {crop ? <div style={{ width: '100%', height: d(crop.h), overflow: 'hidden' }}>{img}</div> : img}
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
