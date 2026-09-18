import { useState } from 'react'
import { QrCode } from '../shared/QrCode'
import { copyToClipboard } from '../shared/copyToClipboard'
import { buildLengthTestPayload } from './lengthLadder'

interface ProbeEntry {
  id: string
  title: string
  why: string
  url: string
  status?: 'passed'
}

interface ProbeSection {
  id: string
  title: string
  note?: string
  entries: ProbeEntry[]
}

// TANGO-7f3a-KILO is the fixed test token baked into every p0-* probe file.
const TOKEN = 'TANGO-7f3a-KILO'

function buildSections(origin: string): ProbeSection[] {
  return [
    {
      id: 'p0',
      title: 'P0 -- the gate',
      note: 'Confirmed: hash survives, JS runs, geometry roughly fits. Kept here for re-testing if anything changes.',
      entries: [
        {
          id: 'p0-hash',
          title: 'Hash survival',
          why: 'Does the URL fragment (#...) survive TinyPrint’s URL field, and does JS run at all?',
          url: `${origin}/probe/p0-hash.html#${TOKEN}`,
          status: 'passed',
        },
        {
          id: 'p0-query',
          title: 'Query survival',
          why: 'Same question via a query string, in case the fragment is stripped but ?q= survives.',
          url: `${origin}/probe/p0-query.html?q=${TOKEN}`,
          status: 'passed',
        },
        {
          id: 'p0-path',
          title: 'Path survival',
          why: 'A real file at a real path containing the token -- proves path segments survive even with zero JS.',
          url: `${origin}/probe/p0-path/${TOKEN}/`,
          status: 'passed',
        },
      ],
    },
    {
      id: 'p1',
      title: 'P1 -- geometry',
      note: 'Print all three geom variants (A/B/C), read the largest ruler number and the JS readout off each. Then print both crop tests and compare them to each other.',
      entries: [
        {
          id: 'p1-geom-a',
          title: 'Geometry A -- no viewport meta',
          why: 'Baseline: what is the layout viewport if we do nothing? (Safari default is often 980px.)',
          url: `${origin}/probe/p1-geom-A.html`,
        },
        {
          id: 'p1-geom-b',
          title: 'Geometry B -- width=device-width',
          why: 'The common "responsive" meta tag. Layout viewport should equal the real device width.',
          url: `${origin}/probe/p1-geom-B.html`,
        },
        {
          id: 'p1-geom-c',
          title: 'Geometry C -- width=384 (target)',
          why: 'Our target strategy: pin the layout viewport to exactly 384 so 1 CSS px = 1 dot. Read this one most carefully.',
          url: `${origin}/probe/p1-geom-C.html`,
          status: 'passed',
        },
        {
          id: 'p1-crop-visible',
          title: 'Crop vs scale -- overflow visible',
          why: 'A 420px bar in a 384px viewport, overflow NOT clipped. Does the app scale the whole (wider) content down, or crop at the viewport edge?',
          url: `${origin}/probe/p1-crop-visible.html`,
        },
        {
          id: 'p1-crop-hidden',
          title: 'Crop vs scale -- overflow hidden',
          why: 'Same bar, but body{overflow-x:hidden} is set. Compare this print to the one above.',
          url: `${origin}/probe/p1-crop-hidden.html`,
        },
      ],
    },
    {
      id: 'p3',
      title: 'P3 -- raster quality',
      note: 'The longest strip. Read top to bottom: which line widths survive, whether greys dither or hard-threshold, whether fine patterns hold up, and the smallest legible font size/weight.',
      entries: [
        {
          id: 'p3-raster',
          title: 'Raster quality',
          why: 'Line combs, grayscale ramp, dither/moire patches, font ladder + availability fingerprint, inversion test, vector primitives.',
          url: `${origin}/probe/p3-raster.html`,
          status: 'passed',
        },
      ],
    },
    {
      id: 'p4',
      title: 'P4 -- capture timing & extent',
      note: 'Confirmed: TinyPrint has two capture modes -- single-viewport, and a stitched full-page capture for tall content. Under stitching, fixed/sticky elements print REPEATED at every stitch boundary. label.css now bans both properties outright and a test enforces it.',
      entries: [
        {
          id: 'p4-timing',
          title: 'Timing & extent',
          why: 'Frozen ms clock, a CSS-only reveal ladder, an event ladder, and a ~3000px-tall page with position markers + a fixed/sticky element to detect viewport-stitching.',
          url: `${origin}/probe/p4-timing.html`,
          status: 'passed',
        },
      ],
    },
    {
      id: 'p2',
      title: 'P2 -- charset fidelity & URL length ceiling',
      note: 'The length ladder below is deprioritized: it used "|" as a padding delimiter, and "|" is a reserved URL character that gets percent-encoded in transit (confirmed -- the 250-char test arrived as 352 bytes). That’s not a real problem: our codec’s base64url alphabet is entirely RFC 3986 unreserved, so it’s never subject to this re-encoding. Real validation going forward is printing actual labels with real URLs through the editor.',
      entries: [
        {
          id: 'p2-charset',
          title: 'Charset fidelity',
          why: 'The base64url alphabet is all our codec ever emits -- 0 mismatches there is what actually matters. The risky-character set is diagnostic only.',
          // Deliberately raw, not encodeURIComponent'd -- the whole point
          // is to see what an unescaped "risky" character does when it
          // reaches TinyPrint's URL field. This never goes through actual
          // browser URL parsing on this page (just a QR bitmap + inert
          // text display), so nothing here mangles it before it ships.
          url: `${origin}/probe/p2-charset.html#ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_AaBbCcDd~.!*'();:@&=+$,/?%#[]`,
        },
        ...([250, 500, 1000, 2000, 4000, 8000, 16000] as const).map((len) => ({
          id: `p2-len-${len}`,
          title: `(deprioritized) URL length: ${len} chars`,
          why: `Superseded -- see section note. Kept only for reference.`,
          url: `${origin}/probe/p2-len.html?len=${len}#${buildLengthTestPayload(len)}`,
        })),
      ],
    },
    {
      id: 'p5',
      title: 'P5 -- does our actual bundle boot',
      note: 'Confirmed: all syntax/API/CSS feature checks and the live codec round-trip pass on the real device, against the real bundle.',
      entries: [
        {
          id: 'p5-selftest',
          title: 'Bundle selftest',
          why: 'If this page renders at all, the bundle booted. Check the round-trip decoded text, then scan the printed QR.',
          url: `${origin}/#/probe/selftest`,
          status: 'passed',
        },
      ],
    },
  ]
}

export function HubPage() {
  const origin = window.location.origin
  const sections = buildSections(origin)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleCopy(entry: ProbeEntry) {
    const ok = await copyToClipboard(entry.url)
    setCopiedId(ok ? entry.id : null)
    if (ok) window.setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px', fontFamily: 'inherit' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>labelprinter -- probe hub</h1>
      <p style={{ color: '#666', marginTop: 0, marginBottom: 24, fontSize: 14 }}>
        Laptop-only. Never printed. Scan a QR with the phone, or use Copy (Universal
        Clipboard works if the phone is signed into the same Apple ID as this Mac),
        then paste the URL into TinyPrint and print.
      </p>

      {sections.map((section) => (
        <div key={section.id} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>{section.title}</h2>
          {section.note && (
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>{section.note}</p>
          )}

          {section.entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                border: entry.status === 'passed' ? '1px solid #bde5bd' : '1px solid #ddd',
                background: entry.status === 'passed' ? '#f6fff6' : undefined,
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <QrCode value={entry.url} size={140} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>
                  {entry.title}
                  {entry.status === 'passed' && (
                    <span style={{ color: '#2a7a2a', fontSize: 12, marginLeft: 8 }}>✓ passed</span>
                  )}
                </h3>
                <p style={{ fontSize: 13, color: '#555', margin: '0 0 8px' }}>{entry.why}</p>
                <div
                  style={{
                    fontFamily: 'ui-monospace, "Courier New", monospace',
                    fontSize: 12,
                    wordBreak: 'break-all',
                    background: '#f5f5f5',
                    padding: '6px 8px',
                    borderRadius: 4,
                    userSelect: 'all',
                    marginBottom: 8,
                  }}
                >
                  {entry.url}
                </div>
                <button onClick={() => handleCopy(entry)} style={{ padding: '4px 10px' }}>
                  {copiedId === entry.id ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ borderTop: '1px solid #eee', paddingTop: 16, marginTop: 8 }}>
        <h2 style={{ fontSize: 14, margin: '0 0 8px' }}>Icon library credits</h2>
        <ul style={{ fontSize: 12, color: '#666', margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>
            <strong>Lucide</strong> (lucide.dev) -- MIT/ISC, no attribution required.
          </li>
          <li>
            <strong>Phosphor</strong> (phosphoricons.com) -- MIT, no attribution required.
          </li>
          <li>
            <strong>Game Icons</strong> (game-icons.net) -- CC BY 3.0. Icons made by ~37 contributing
            authors (Lorc, Delapouite, and others); available on{' '}
            <a href="https://game-icons.net" target="_blank" rel="noreferrer">
              game-icons.net
            </a>
            .
          </li>
          <li>
            <strong>OpenMoji</strong> (openmoji.org) -- CC BY-SA 4.0. The OpenMoji project --{' '}
            <a href="https://openmoji.org" target="_blank" rel="noreferrer">
              openmoji.org
            </a>
            .
          </li>
        </ul>
      </div>

      <p style={{ fontSize: 12, color: '#888', marginTop: 24 }}>
        Serving from <code>{origin}</code>. If this isn’t the LAN IP, the phone
        can’t reach it -- run <code>npm run print</code> and open the LAN URL, not
        localhost.
      </p>
    </div>
  )
}
