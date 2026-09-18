import { useEffect, useMemo, useState } from 'react'
import type { IconEntry } from '../data/iconTypes'
import { STROKE_DEFAULT } from '../render/tokens'
import { ICON_LIBRARIES, type IconLibrary } from './iconLibraries'
import { useEditorStore } from './store'

// Rendering all icons in a library at once (unfiltered) is unnecessary
// DOM churn for a picker -- cap results and tell the user to narrow the
// search. Game Icons/OpenMoji are large enough that this matters more
// than it did with Lucide alone.
const MAX_RESULTS = 120

// A stable reference for the "not loaded yet" case -- a fresh `[]`
// literal on every render would needlessly invalidate the useMemo below.
const NO_ICONS: readonly IconEntry[] = []

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; icons: readonly IconEntry[] }
  | { status: 'error'; message: string }

export function IconPicker() {
  const [libraryId, setLibraryId] = useState(ICON_LIBRARIES[0]!.id)
  const [query, setQuery] = useState('')
  const [cache, setCache] = useState<Record<string, LoadState>>({})
  const addBlock = useEditorStore((s) => s.addBlock)

  const library = ICON_LIBRARIES.find((l) => l.id === libraryId)!
  const state = cache[libraryId] ?? { status: 'idle' }

  useEffect(() => {
    if (cache[libraryId]) return
    setCache((c) => ({ ...c, [libraryId]: { status: 'loading' } }))
    library
      .load()
      .then((icons) => setCache((c) => ({ ...c, [libraryId]: { status: 'ready', icons } })))
      .catch((e: unknown) =>
        setCache((c) => ({
          ...c,
          [libraryId]: { status: 'error', message: e instanceof Error ? e.message : String(e) },
        })),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `library` is derived from libraryId, not independent state
  }, [libraryId])

  const icons = state.status === 'ready' ? state.icons : NO_ICONS
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return icons
    return icons.filter(([name, tags]) => name.toLowerCase().includes(q) || tags.some((tag) => tag.toLowerCase().includes(q)))
  }, [icons, query])

  const shown = matches.slice(0, MAX_RESULTS)

  function handlePick(name: string, svg: string) {
    addBlock({
      t: 'k',
      d: svg,
      name: `${library.id}/${name}`,
      fill: library.fillMode ? 1 : undefined,
      th: library.fillMode ? undefined : STROKE_DEFAULT,
      vb: library.vb === '0 0 24 24' ? undefined : library.vb,
    })
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>Icons</h3>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {ICON_LIBRARIES.map((lib) => (
          <button
            key={lib.id}
            onClick={() => setLibraryId(lib.id)}
            style={{
              fontSize: 11,
              padding: '3px 8px',
              borderRadius: 4,
              border: '1px solid #ccc',
              background: lib.id === libraryId ? '#2266ff' : '#fff',
              color: lib.id === libraryId ? '#fff' : undefined,
              cursor: 'pointer',
            }}
          >
            {lib.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 10, color: '#999', margin: '0 0 8px' }}>{library.license}</p>

      <input
        type="text"
        placeholder="Search icons..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', padding: '5px 7px', fontSize: 13, boxSizing: 'border-box', marginBottom: 8 }}
      />

      {state.status === 'loading' && <p style={{ fontSize: 12, color: '#888' }}>Loading {library.label}...</p>}
      {state.status === 'error' && (
        <p style={{ fontSize: 12, color: '#c00' }}>Could not load {library.label}: {state.message}</p>
      )}

      {state.status === 'ready' && (
        <>
          <p style={{ fontSize: 11, color: '#888', margin: '0 0 6px' }}>
            {matches.length > MAX_RESULTS
              ? `Showing ${MAX_RESULTS} of ${matches.length} matches -- keep typing to narrow`
              : `${matches.length} icon${matches.length === 1 ? '' : 's'}`}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))',
              gap: 4,
              maxHeight: 280,
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderRadius: 6,
              padding: 6,
              background: '#fff',
            }}
          >
            {shown.map(([name, , svg]) => (
              <button
                key={name}
                title={name}
                onClick={() => handlePick(name, svg)}
                style={{
                  width: 36,
                  height: 36,
                  padding: 6,
                  border: '1px solid #eee',
                  borderRadius: 4,
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPreview svg={svg} library={library} />
              </button>
            ))}
            {shown.length === 0 && (
              <p style={{ gridColumn: '1 / -1', fontSize: 12, color: '#888', margin: 0 }}>
                No icons match &quot;{query}&quot;.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function IconPreview({ svg, library }: { svg: string; library: IconLibrary }) {
  const paint = library.fillMode
    ? { fill: '#000000', stroke: 'none' }
    : { fill: 'none', stroke: '#000000' as const }
  return (
    <svg
      viewBox={library.vb}
      width={20}
      height={20}
      {...paint}
      strokeWidth={STROKE_DEFAULT}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
