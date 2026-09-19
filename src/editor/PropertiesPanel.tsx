import { useState, type CSSProperties, type ReactNode } from 'react'
import { POKEMON_NAMES } from '../data/pokemonNames'
import type { Item, PokemonBlock } from '../codec/types'
import { resolvePokemon } from '../pokemon/fetchPokemon'
import { formatPokemonNumber, pokemonArtworkUrl, pokemonDisplayName } from '../pokemon/pokemon'
import { MIN_FONT_DOTS_INVERTED, MIN_FONT_DOTS_NORMAL } from '../probe-results'
import { useEditorStore } from './store'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>
      <span style={{ display: 'block', color: '#666', marginBottom: 3 }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: CSSProperties = { width: '100%', padding: '4px 6px', fontSize: 13, boxSizing: 'border-box' }

export function PropertiesPanel() {
  const doc = useEditorStore((s) => s.doc)
  const selectedId = useEditorStore((s) => s.selectedId)
  const updateBlock = useEditorStore((s) => s.updateBlock)

  const item = doc.items.find((it) => it.id === selectedId)

  if (!item) {
    return (
      <div style={{ width: 260, padding: 12, borderLeft: '1px solid #ddd', color: '#888', fontSize: 13 }}>
        Select an item to edit its properties.
      </div>
    )
  }

  return (
    <div style={{ width: 260, padding: 12, borderLeft: '1px solid #ddd', overflowY: 'auto' }}>
      <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>Properties</h3>
      <Fields item={item} onChange={(patch) => updateBlock(item.id, patch)} />
    </div>
  )
}

function Fields({ item, onChange }: { item: Item; onChange: (patch: Record<string, unknown>) => void }) {
  const block = item.block

  switch (block.t) {
    case 't': {
      const floor = block.i ? MIN_FONT_DOTS_INVERTED : MIN_FONT_DOTS_NORMAL
      const belowFloor = (block.z ?? 22) < floor
      return (
        <>
          <Field label="Text">
            <textarea
              style={{ ...inputStyle, height: 60 }}
              value={block.s}
              onChange={(e) => onChange({ s: e.target.value })}
            />
          </Field>
          <Field label={`Font size (dots)${belowFloor ? ` -- below measured-legible size (${floor})` : ''}`}>
            <input
              type="number"
              style={{ ...inputStyle, borderColor: belowFloor ? '#c00' : undefined }}
              value={block.z ?? 22}
              onChange={(e) => onChange({ z: Number(e.target.value) })}
            />
          </Field>
          <Field label="Bold">
            <input type="checkbox" checked={!!block.bd} onChange={(e) => onChange({ bd: e.target.checked ? 1 : undefined })} />
          </Field>
          <Field label="Inverted (white on black)">
            <input type="checkbox" checked={!!block.i} onChange={(e) => onChange({ i: e.target.checked ? 1 : undefined })} />
          </Field>
          <Field label="Align">
            <select style={inputStyle} value={block.a ?? 'l'} onChange={(e) => onChange({ a: e.target.value })}>
              <option value="l">Left</option>
              <option value="c">Center</option>
              <option value="r">Right</option>
            </select>
          </Field>
          <Field label="Font">
            <select style={inputStyle} value={block.f ?? 's'} onChange={(e) => onChange({ f: e.target.value })}>
              <option value="s">Sans</option>
              <option value="m">Mono</option>
            </select>
          </Field>
        </>
      )
    }
    case 'q':
      return (
        <>
          <Field label="Data / URL">
            <textarea
              style={{ ...inputStyle, height: 50 }}
              value={block.d}
              onChange={(e) => onChange({ d: e.target.value })}
            />
          </Field>
          <Field label="Error correction">
            <select style={inputStyle} value={block.e ?? 'M'} onChange={(e) => onChange({ e: e.target.value })}>
              <option value="L">L (max capacity)</option>
              <option value="M">M</option>
              <option value="Q">Q</option>
              <option value="H">H (max redundancy)</option>
            </select>
          </Field>
          <Field label="Module size (dots)">
            <input
              type="number"
              min={3}
              style={inputStyle}
              value={block.m ?? 4}
              onChange={(e) => onChange({ m: Number(e.target.value) })}
            />
          </Field>
          <p style={{ fontSize: 11, color: '#888' }}>Size on canvas: {item.w}&times;{item.w} dots</p>
        </>
      )
    case 'c':
      return (
        <>
          <Field label="Data">
            <input style={inputStyle} value={block.d} onChange={(e) => onChange({ d: e.target.value })} />
          </Field>
          <Field label="Format">
            <select style={inputStyle} value={block.f ?? '128'} onChange={(e) => onChange({ f: e.target.value })}>
              <option value="128">Code 128</option>
              <option value="39">Code 39</option>
              <option value="ean13">EAN-13</option>
            </select>
          </Field>
          <Field label="Module (bar) width (dots)">
            <input
              type="number"
              min={1}
              style={inputStyle}
              value={block.m ?? 2}
              onChange={(e) => onChange({ m: Number(e.target.value) })}
            />
          </Field>
          <Field label="Height (dots)">
            <input
              type="number"
              min={20}
              style={inputStyle}
              value={block.h ?? 80}
              onChange={(e) => onChange({ h: Number(e.target.value) })}
            />
          </Field>
          <Field label="Show text below">
            <input type="checkbox" checked={!!block.n} onChange={(e) => onChange({ n: e.target.checked ? 1 : undefined })} />
          </Field>
        </>
      )
    case 'r':
      return (
        <>
          <Field label="Thickness (dots)">
            <input
              type="number"
              min={1}
              style={inputStyle}
              value={block.th ?? 2}
              onChange={(e) => onChange({ th: Number(e.target.value) })}
            />
          </Field>
          <Field label="Style">
            <select style={inputStyle} value={block.s ?? 'solid'} onChange={(e) => onChange({ s: e.target.value })}>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
            </select>
          </Field>
        </>
      )
    case 'b':
      return (
        <>
          <Field label="Border thickness (dots)">
            <input
              type="number"
              min={1}
              style={inputStyle}
              value={block.th ?? 2}
              onChange={(e) => onChange({ th: Number(e.target.value) })}
            />
          </Field>
          <Field label="Filled">
            <input type="checkbox" checked={!!block.fill} onChange={(e) => onChange({ fill: e.target.checked ? 1 : undefined })} />
          </Field>
        </>
      )
    case 'i':
      return (
        <>
          <Field label="Image URL">
            <input style={inputStyle} value={block.d} onChange={(e) => onChange({ d: e.target.value })} />
          </Field>
          {block.crop ? (
            <p style={{ fontSize: 11, color: '#888' }}>
              Cropped on the canvas (the Crop tool in its floating toolbar) -- Fit is ignored while a crop is set.{' '}
              <button
                onClick={() => onChange({ crop: undefined })}
                style={{ font: 'inherit', color: '#c00', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Reset crop
              </button>
            </p>
          ) : (
            <Field label="Fit">
              <select style={inputStyle} value={block.fit ?? 'contain'} onChange={(e) => onChange({ fit: e.target.value })}>
                <option value="contain">Contain (fit inside, may letterbox)</option>
                <option value="cover">Cover (fill box, may crop)</option>
                <option value="fill">Fill (stretch to box)</option>
              </select>
            </Field>
          )}
          <p style={{ fontSize: 11, color: '#888' }}>
            Loaded directly from the URL, best-effort only -- no hosting or CORS workaround. If the URL blocks
            cross-origin loads or is unreachable, the image just won't show up.
          </p>
        </>
      )
    case 'p':
      // Own component (not inlined here) so its lookup/query state can
      // use hooks safely -- keyed by item.id below so switching between
      // two different Pokemon items doesn't carry over stale local state.
      return <PokemonFields key={item.id} block={block} onChange={onChange} />
    case 'k': {
      const isFillMode = block.fill === 1
      const vb = block.vb ?? '0 0 24 24'
      const paint = isFillMode ? { fill: '#000000', stroke: 'none' } : { fill: 'none', stroke: '#000000' as const }
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <svg
              viewBox={vb}
              width={32}
              height={32}
              {...paint}
              strokeWidth={block.th ?? 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, border: '1px solid #eee', borderRadius: 4 }}
              dangerouslySetInnerHTML={{ __html: block.d }}
            />
            <span style={{ fontSize: 12 }}>{block.name ?? 'icon'}</span>
          </div>
          {!isFillMode && (
            <Field label={`Stroke width (viewBox units, ${vb})`}>
              <input
                type="number"
                min={0.5}
                step={0.5}
                style={inputStyle}
                value={block.th ?? 2}
                onChange={(e) => onChange({ th: Number(e.target.value) })}
              />
            </Field>
          )}
          <p style={{ fontSize: 11, color: '#888' }}>
            To use a different icon, pick a new one from the sidebar and delete this one.
          </p>
        </>
      )
    }
  }
}

function PokemonFields({ block, onChange }: { block: PokemonBlock; onChange: (patch: Record<string, unknown>) => void }) {
  const [query, setQuery] = useState(pokemonDisplayName(block.id))
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleResolve() {
    setStatus('loading')
    setError(null)
    try {
      const resolved = await resolvePokemon(query)
      onChange({ id: resolved.id })
      setQuery(resolved.name)
      setStatus('idle')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <>
      <Field label="Pokemon name or National Dex number">
        <input
          list="lp-pokemon-names"
          style={inputStyle}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleResolve()
            }
          }}
        />
      </Field>
      <datalist id="lp-pokemon-names">
        {POKEMON_NAMES.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <button onClick={() => void handleResolve()} disabled={status === 'loading'} style={{ marginBottom: 8 }}>
        {status === 'loading' ? 'Looking up...' : 'Look up'}
      </button>
      {status === 'error' && <p style={{ color: '#c00', fontSize: 11, margin: '0 0 8px' }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <img
          src={pokemonArtworkUrl(block.id)}
          alt=""
          style={{ width: 48, height: 48, objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.style.opacity = '0.15'
          }}
        />
        <span style={{ fontSize: 12 }}>
          {pokemonDisplayName(block.id)} <span style={{ color: '#888' }}>{formatPokemonNumber(block.id)}</span>
        </span>
      </div>

      <Field label="Show name">
        <input
          type="checkbox"
          checked={block.showName !== 0}
          onChange={(e) => onChange({ showName: e.target.checked ? undefined : 0 })}
        />
      </Field>
      <Field label="Show number">
        <input
          type="checkbox"
          checked={block.showNumber !== 0}
          onChange={(e) => onChange({ showNumber: e.target.checked ? undefined : 0 })}
        />
      </Field>
      <p style={{ fontSize: 11, color: '#888' }}>
        Artwork and name are resolved once and baked in -- printing later never depends on PokeAPI being up.
      </p>
    </>
  )
}
