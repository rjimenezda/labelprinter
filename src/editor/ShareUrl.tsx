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

export function ShareUrl() {
  const doc = useEditorStore((s) => s.doc)
  const [copied, setCopied] = useState(false)

  const { payload, info } = useMemo(() => encodeDocWithInfo(doc), [doc])
  const url = useMemo(
    () => `${window.location.origin}${window.location.pathname}${buildViewerHash(payload)}`,
    [payload],
  )

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
        <QrCode value={url} size={120} />
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
          <button onClick={handleCopy} style={{ marginBottom: 8 }}>
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
          <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: barColor }} />
          </div>
          <p style={{ fontSize: 11, color: '#888', margin: '4px 0 0' }}>
            {info.payloadChars} chars payload ({info.codec === 'Z' ? 'compressed' : 'raw'}, {info.jsonBytes}B JSON)
            {info.payloadChars > SOFT_BUDGET_CHARS ? ' -- getting long, QR may be harder to scan' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
