import { describe, expect, it } from 'vitest'
import { GAME_ICONS } from '../../data/gameIcons'
import { LUCIDE_ICONS } from '../../data/lucideIcons'
import { OPENMOJI_ICONS } from '../../data/openmojiIcons'
import { PHOSPHOR_ICONS } from '../../data/phosphorIcons'
import { sanitizeIconSvg } from '../sanitizeSvg'

describe('sanitizeIconSvg', () => {
  it('passes through a real Lucide icon markup unchanged in shape', () => {
    const markup = '<path d="M12 20h.01" /><path d="M2 8.82a15 15 0 0 1 20 0" />'
    const out = sanitizeIconSvg(markup)
    expect(out).toContain('<path')
    expect(out).toContain('d="M12 20h.01"')
    expect(out).toContain('d="M2 8.82a15 15 0 0 1 20 0"')
  })

  it('allows the full shape-element allowlist', () => {
    const markup =
      '<path d="M0 0"/><circle cx="1" cy="1" r="1"/><rect x="0" y="0" width="2" height="2"/>' +
      '<line x1="0" y1="0" x2="1" y2="1"/><polyline points="0,0 1,1"/><polygon points="0,0 1,1 2,2"/>' +
      '<ellipse cx="1" cy="1" rx="1" ry="2"/><g transform="translate(1 1)"><path d="M0 0"/></g>'
    const out = sanitizeIconSvg(markup)
    expect(out).toContain('<circle')
    expect(out).toContain('<rect')
    expect(out).toContain('<line')
    expect(out).toContain('<polyline')
    expect(out).toContain('<polygon')
    expect(out).toContain('<ellipse')
    expect(out).toContain('<g')
  })

  it('rejects a script tag entirely', () => {
    const out = sanitizeIconSvg('<path d="M0 0"/><script>alert(1)</script>')
    expect(out).not.toContain('script')
    expect(out).not.toContain('alert')
  })

  it('strips event handler attributes from an otherwise-allowed element', () => {
    const out = sanitizeIconSvg('<path d="M0 0" onload="alert(1)" onclick="alert(2)"/>')
    expect(out).not.toBeNull()
    expect(out).not.toContain('onload')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('alert')
  })

  it('strips a href attribute so nothing can reference an external resource', () => {
    // Note: an undeclared `xlink:href` namespace prefix makes the input
    // malformed XML, which sanitizeIconSvg already rejects outright (see
    // the malformed-XML test below) -- a stronger outcome than stripping,
    // so it isn't exercised here separately.
    const out = sanitizeIconSvg('<path d="M0 0" href="javascript:alert(1)"/>')
    expect(out).not.toBeNull()
    expect(out).not.toContain('href')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('d="M0 0"')
  })

  it('rejects a disallowed element (foreignObject) but keeps sibling allowed elements', () => {
    const out = sanitizeIconSvg('<path d="M0 0"/><foreignObject><div>hi</div></foreignObject>')
    expect(out).toContain('<path')
    expect(out).not.toContain('foreignObject')
    expect(out).not.toContain('<div')
  })

  it('rejects an <image> element (could reference an arbitrary/tracking URL)', () => {
    const out = sanitizeIconSvg('<image href="https://evil.example/track.png"/><path d="M0 0"/>')
    expect(out).not.toContain('image')
    expect(out).not.toContain('evil.example')
    expect(out).toContain('<path')
  })

  it('drops a disallowed element nested inside an allowed <g>', () => {
    const out = sanitizeIconSvg('<g><path d="M0 0"/><script>alert(1)</script></g>')
    expect(out).toContain('<path')
    expect(out).not.toContain('script')
  })

  it('rejects malformed XML rather than throwing', () => {
    expect(() => sanitizeIconSvg('<path d="M0 0"')).not.toThrow()
    expect(sanitizeIconSvg('<path d="M0 0"')).toBeNull()
  })

  it('rejects empty, non-string, or absurdly long input', () => {
    expect(sanitizeIconSvg('')).toBeNull()
    expect(sanitizeIconSvg(undefined)).toBeNull()
    expect(sanitizeIconSvg(123)).toBeNull()
    expect(sanitizeIconSvg('<path d="M0 0"/>'.repeat(1000))).toBeNull()
  })

  it('rejects markup that sanitizes down to nothing (all content stripped)', () => {
    expect(sanitizeIconSvg('<script>alert(1)</script>')).toBeNull()
    expect(sanitizeIconSvg('just plain text, no elements at all')).toBeNull()
  })

  it.each([
    ['Lucide', LUCIDE_ICONS],
    ['Phosphor', PHOSPHOR_ICONS],
    ['Game Icons', GAME_ICONS],
    ['OpenMoji', OPENMOJI_ICONS],
  ] as const)('passes every real bundled %s icon through unchanged and non-empty', (_label, icons) => {
    // The actual production data, not synthetic strings -- if a future
    // library upgrade ever introduces a tag/attribute/color outside the
    // allowlist, this is what would catch it.
    for (const [name, , svg] of icons) {
      const out = sanitizeIconSvg(svg)
      expect(out, `icon "${name}" was rejected or emptied by sanitization`).not.toBeNull()
      expect(out!.length).toBeGreaterThan(0)
    }
  })

  it('allows per-element fill/stroke but only with safe color values', () => {
    const out = sanitizeIconSvg('<path d="M0 0" fill="none" stroke="#000000" stroke-width="2"/>')
    expect(out).toContain('fill="none"')
    expect(out).toContain('stroke="#000000"')
    expect(out).toContain('stroke-width="2"')
  })

  it('strips a fill/stroke value outside the 1-bit palette instead of rejecting the whole icon', () => {
    const out = sanitizeIconSvg('<path d="M0 0" fill="red" stroke="url(#evilGradient)"/>')
    expect(out).not.toBeNull()
    expect(out).toContain('d="M0 0"')
    expect(out).not.toContain('red')
    expect(out).not.toContain('url(')
  })

  it('allows currentColor and case-insensitive black spellings', () => {
    for (const value of ['currentColor', 'CURRENTCOLOR', 'BLACK', '#000']) {
      const out = sanitizeIconSvg(`<path d="M0 0" fill="${value}"/>`)
      expect(out, `value "${value}" should have been allowed`).toContain(`fill="${value}"`)
    }
  })
})
