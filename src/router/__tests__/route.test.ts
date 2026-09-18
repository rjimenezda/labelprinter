import { describe, expect, it } from 'vitest'
import { buildEditorHash, buildViewerHash, parseHash } from '../route'

describe('parseHash', () => {
  it('routes empty/root hash to the editor', () => {
    expect(parseHash('')).toEqual({ k: 'editor' })
    expect(parseHash('#')).toEqual({ k: 'editor' })
    expect(parseHash('#/')).toEqual({ k: 'editor' })
  })

  it('routes #/hub to the probe hub', () => {
    expect(parseHash('#/hub')).toEqual({ k: 'hub' })
  })

  it('routes #/probe/selftest to the self-test page', () => {
    expect(parseHash('#/probe/selftest')).toEqual({ k: 'selftest' })
  })

  it('extracts a viewer payload verbatim, without decoding', () => {
    const payload = 'L1ZAbc123-_XYZ'
    expect(parseHash(`#/p/${payload}`)).toEqual({ k: 'view', payload })
  })

  it('only percent-decodes the payload if it actually contains a %', () => {
    // our own alphabet (A-Za-z0-9-_) never needs decoding
    expect(parseHash('#/p/L1ZAbc-_123')).toEqual({ k: 'view', payload: 'L1ZAbc-_123' })
    // but if something upstream re-encoded it, decode once
    expect(parseHash('#/p/L1Z%2DAbc')).toEqual({ k: 'view', payload: 'L1Z-Abc' })
  })

  it('falls back to notfound for anything else', () => {
    expect(parseHash('#/whatever')).toEqual({ k: 'notfound', raw: '/whatever' })
  })

  it('buildViewerHash round-trips through parseHash', () => {
    const payload = 'L1Zsomepayload-_123'
    expect(parseHash(buildViewerHash(payload))).toEqual({ k: 'view', payload })
  })

  it('extracts the editor autosave payload from #/e/', () => {
    const payload = 'L1ZAbc123-_XYZ'
    expect(parseHash(`#/e/${payload}`)).toEqual({ k: 'editor', payload })
  })

  it('buildEditorHash round-trips through parseHash', () => {
    const payload = 'L1Zsomepayload-_123'
    expect(parseHash(buildEditorHash(payload))).toEqual({ k: 'editor', payload })
  })
})
