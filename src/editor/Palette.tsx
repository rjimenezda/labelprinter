import { FONT_BODY } from '../render/tokens'
import { IconPicker } from './IconPicker'
import { useEditorStore } from './store'

const buttonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  marginBottom: 6,
  textAlign: 'left',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
}

export function Palette() {
  const addBlock = useEditorStore((s) => s.addBlock)

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        padding: 12,
        borderRight: '1px solid #ddd',
        background: '#fafafa',
        overflowY: 'auto',
      }}
    >
      <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>Add block</h3>
      <button style={buttonStyle} onClick={() => addBlock({ t: 't', s: 'Text', z: FONT_BODY })}>
        + Text
      </button>
      <button style={buttonStyle} onClick={() => addBlock({ t: 'q', d: 'https://example.com' })}>
        + QR code
      </button>
      <button style={buttonStyle} onClick={() => addBlock({ t: 'c', d: '012345678905', f: '128' })}>
        + Barcode
      </button>
      <button style={buttonStyle} onClick={() => addBlock({ t: 'r' })}>
        + Rule (line)
      </button>
      <button style={buttonStyle} onClick={() => addBlock({ t: 'b' })}>
        + Box
      </button>
      <button style={buttonStyle} onClick={() => addBlock({ t: 'i', d: 'https://example.com/image.jpg' })}>
        + Image
      </button>
      <button style={buttonStyle} onClick={() => addBlock({ t: 'p', id: 25 })}>
        + Pokemon
      </button>

      <IconPicker />
    </div>
  )
}
