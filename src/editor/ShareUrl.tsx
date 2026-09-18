import { useMemo, useState } from 'react'
import { encodeDoc } from '../codec/encode'
import { buildViewerHash } from '../router/route'
import { copyToClipboard } from '../shared/copyToClipboard'
import { QrCode } from '../shared/QrCode'
import { useEditorStore } from './store'

/**
 * Just the QR code -- tap/click to copy the label's viewer URL. No size
 * meter, no URL text, no warnings: the QR either scans or it doesn't, and
 * by the time it stops scanning reliably the payload is already far
 * larger than any label this app is meant for.
 */
export function ShareUrl() {
  const doc = useEditorStore((s) => s.doc)
  const [copied, setCopied] = useState(false)

  const url = useMemo(
    () => `${window.location.origin}${window.location.pathname}${buildViewerHash(encodeDoc(doc))}`,
    [doc],
  )

  async function handleCopy() {
    const ok = await copyToClipboard(url)
    setCopied(ok)
    if (ok) window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div style={{ padding: 12, borderTop: '1px solid #ddd', background: '#fafafa' }}>
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
          display: 'block',
        }}
      >
        <QrCode value={url} size={140} />
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
    </div>
  )
}
