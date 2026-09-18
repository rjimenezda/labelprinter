import { useMemo, type ReactNode } from 'react'
import { decodePayload } from '../codec/decode'
import { encodeDoc } from '../codec/encode'
import type { LabelDoc } from '../codec/types'
import { buildBarcode } from '../codegen/barcode'
import { buildQr } from '../codegen/qr'

/**
 * P5 -- "does our actual bundle boot", run against the REAL bundle rather
 * than a synthetic standalone probe: this exercises the exact codec,
 * codegen, and render modules that ship to the viewer, not a proxy for
 * them. Printing a QR here that then scans correctly is the Phase 1 exit
 * criterion from the plan.
 */

const FIXTURE_DOC: LabelDoc = {
  v: 1,
  w: 384,
  h: 120,
  items: [{ id: 'a', x: 8, y: 8, w: 368, z: 0, block: { t: 't', s: 'SELFTEST-OK-42', z: 24, bd: 1 } }],
}

interface Check {
  label: string
  ok: boolean
  detail?: string
}

function tryEval(label: string, fn: () => unknown): Check {
  try {
    fn()
    return { label, ok: true }
  } catch (e) {
    return { label, ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}

function checkSyntax(): Check[] {
  return [
    tryEval('arrow fn', () => new Function('return (() => 1)()')()),
    tryEval('class', () => new Function('class X {}; return new X()')()),
    tryEval('template literal', () => new Function('return `a${1}b`')()),
    tryEval('let/const', () => new Function('let a = 1; const b = 2; return a+b')()),
    tryEval('default params', () => new Function('function f(a=1){return a} return f()')()),
    tryEval('spread', () => new Function('return [...[1,2,3]]')()),
    tryEval('async/await', () => new Function('return (async () => 1)()')()),
    tryEval('optional chaining', () => new Function('return ({a:1})?.a')()),
    tryEval('nullish coalescing', () => new Function('return null ?? 2')()),
    tryEval('Array.flat', () => [1, [2]].flat()),
    tryEval('Object.entries', () => Object.entries({ a: 1 })),
    tryEval("String.padStart", () => 'a'.padStart(2)),
  ]
}

function checkApis(): Check[] {
  return [
    { label: 'TextEncoder', ok: typeof TextEncoder !== 'undefined' },
    { label: 'TextDecoder', ok: typeof TextDecoder !== 'undefined' },
    { label: 'atob/btoa', ok: typeof atob !== 'undefined' && typeof btoa !== 'undefined' },
    { label: 'Uint8Array.from', ok: typeof Uint8Array.from === 'function' },
    { label: 'structuredClone', ok: typeof structuredClone !== 'undefined' },
    { label: 'URL', ok: typeof URL !== 'undefined' },
    { label: 'URLSearchParams', ok: typeof URLSearchParams !== 'undefined' },
    {
      label: 'crypto.getRandomValues',
      ok: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function',
    },
    { label: 'CompressionStream', ok: 'CompressionStream' in window },
    { label: 'DecompressionStream', ok: 'DecompressionStream' in window },
  ]
}

function checkCss(): Check[] {
  const supports = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' ? CSS.supports : null
  return [
    { label: 'display:flex', ok: !!supports?.('display', 'flex') },
    { label: 'display:grid', ok: !!supports?.('display', 'grid') },
    { label: 'gap on flex', ok: !!supports?.('gap', '4px') },
    { label: 'custom properties', ok: !!supports?.('--x', '1') },
    { label: 'position:sticky', ok: !!supports?.('position', 'sticky') },
    { label: ':has() selector', ok: !!(supports && CSS.supports('selector(:has(a))')) },
  ]
}

export function SelfTestPage() {
  const syntax = useMemo(() => checkSyntax(), [])
  const apis = useMemo(() => checkApis(), [])
  const css = useMemo(() => checkCss(), [])

  const roundTrip = useMemo(() => {
    const payload = encodeDoc(FIXTURE_DOC)
    return { payload, result: decodePayload(payload) }
  }, [])

  const qr = useMemo(() => buildQr('TINYPRINT-P5-SELFTEST', 'M', 4), [])
  const barcode = useMemo(() => buildBarcode('012345678905', '128', 2, 60), [])

  const firstBlock = roundTrip.result.ok ? roundTrip.result.doc.items[0]?.block : undefined
  const decodedText = firstBlock?.t === 't' ? firstBlock.s : 'DECODE FAILED'

  return (
    <div
      style={{
        width: 384,
        margin: '0 auto',
        background: '#fff',
        color: '#000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        paddingBottom: 24,
      }}
    >
      <div style={{ background: '#000', color: '#fff', fontWeight: 700, padding: '6px 8px', fontSize: 14 }}>
        PROBE P5 &mdash; BUNDLE SELFTEST
      </div>

      <Section title="1. Codec round-trip (real bundle)">
        <Kv k="Decoded text" v={decodedText} big />
        <Kv k="Round-trip ok?" v={roundTrip.result.ok ? '[Y] YES' : '[n] FAILED'} />
        <Kv k="Payload length" v={String(roundTrip.payload.length)} />
      </Section>

      <Section title="2. Real QR (scan this with the phone)">
        <div style={{ padding: 8 }} dangerouslySetInnerHTML={{ __html: qr.svg }} />
      </Section>

      <Section title="3. Real barcode">
        <div style={{ padding: 8 }} dangerouslySetInnerHTML={{ __html: barcode.svg }} />
      </Section>

      <Section title="4. Syntax features">
        {syntax.map((s) => (
          <Kv key={s.label} k={s.label} v={s.ok ? '[Y]' : `[n] ${s.detail ?? ''}`} />
        ))}
      </Section>

      <Section title="5. APIs">
        {apis.map((a) => (
          <Kv key={a.label} k={a.label} v={a.ok ? '[Y]' : '[n]'} />
        ))}
      </Section>

      <Section title="6. CSS features">
        {css.map((c) => (
          <Kv key={c.label} k={c.label} v={c.ok ? '[Y]' : '[n]'} />
        ))}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ background: '#000', color: '#fff', fontWeight: 700, padding: '4px 8px', fontSize: 13, marginTop: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Kv({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div
      style={{
        padding: '3px 8px',
        borderBottom: '1px dashed #000',
        fontSize: big ? 18 : 13,
        fontFamily: big ? undefined : '"Courier New", monospace',
        wordBreak: 'break-all',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{k}</div>
      <div>{v}</div>
    </div>
  )
}
