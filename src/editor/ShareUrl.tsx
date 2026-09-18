import { useMemo, useState } from 'react'
import { encodeDocWithInfo } from '../codec/encode'
import { buildViewerHash } from '../router/route'
import { copyToClipboard } from '../shared/copyToClipboard'
import { QrCode } from '../shared/QrCode'
import { useEditorStore } from './store'

// Provisional soft budget -- P2 (URL length ceiling) hasn't been printed
// yet, see probe-results.ts. In practice the QR code gets awkward to scan
// well before any app-side limit bites, so this is a reasonable guess to
// warn from until we have a measured number.
const SOFT_BUDGET_CHARS = 1200

// Below this, the QR code speaks for itself -- the URL text, size meter,
// and warning copy only earn their space once size is actually a concern.
const WARN_THRESHOLD_CHARS = Math.round(SOFT_BUDGET_CHARS * 0.75)

export function ShareUrl() {
  const doc = useEditorStore((s) => s.doc)
  const [copied, setCopied] = useState(false)

  const { payload, info } = useMemo(() => encodeDocWithInfo(doc), [doc])
  const url = useMemo(
    () => `${window.location.origin}${window.location.pathname}${buildViewerHash(payload)}`,
    [payload],
  )

  const nearLimit = info.payloadChars > WARN_THRESHOLD_CHARS
  const pct = Math.min(100, (info.payloadChars / SOFT_BUDGET_CHARS) * 100)
  const barColor = info.payloadChars <= 700 ? '#2a7a2a' : info.payloadChars <= SOFT_BUDGET_CHARS ? '#c98a00' : '#c00'

  async function handleCopy() {
    const ok = await copyToClipboard(url)
    setCopied(ok)
    if (ok) window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ padding: 12, borderTop: '1px solid #ddd', background: '#fafafa' }}>
      <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>Print this label</h3>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <button
          onClick={() => void handleCopy()}
          title="Tap to copy the label URL"
          style={{
            position: 'relative',
            padding: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            lineHeight: 0,
            flexShrink: 0,
          }}
        >
          <QrCode value={url} size={120} />
          {copied && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fff',
                border: '1px solid #2a7a2a',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                color: '#2a7a2a',
              }}
            >
              Copied!
            </div>
          )}
        </button>

        {nearLimit ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11,
                wordBreak: 'break-all',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 4,
                padding: '4px 6px',
                marginBottom: 6,
                userSelect: 'all',
              }}
            >
              {url}
            </div>
            <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: barColor }} />
            </div>
            <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
              {info.payloadChars} chars payload ({info.codec === 'Z' ? 'compressed' : 'raw'}, {info.jsonBytes}B JSON)
              {info.payloadChars > SOFT_BUDGET_CHARS ? ' -- getting long, QR may be harder to scan' : ''}
            </p>
          </div>
        ) : (
          <p style={{ flex: 1, minWidth: 0, fontSize: 12, color: '#888', margin: 0 }}>Tap the QR code to copy its URL.</p>
        )}
      </div>
    </div>
  )
}
