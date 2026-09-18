import { buildBarcode } from '../codegen/barcode'
import { buildQr } from '../codegen/qr'
import type { Block, BoxBlock, IconBlock, LabelDoc, RuleBlock, TextBlock } from '../codec/types'
import { formatPokemonNumber, pokemonArtworkUrl, pokemonDisplayName } from '../pokemon/pokemon'
import { FONT_BODY, FONT_SM, FONT_STACK_MONO, FONT_STACK_SANS, QR_MODULE_DEFAULT, STROKE_DEFAULT } from '../render/tokens'

/** Same markup and stroke/fill-mode logic as render/nodes/Icon.tsx (see
 *  its doc for why there are two modes), just wrapped as a data: URI so
 *  it can go through the same Image-loading path as ImageBlock/
 *  PokemonBlock -- no CORS concern at all here since it's not a network
 *  fetch. */
function iconDataUri(block: IconBlock): string {
  const th = block.th ?? STROKE_DEFAULT
  const vb = block.vb ?? '0 0 24 24'
  const paint = block.fill === 1 ? 'fill="#000000" stroke="none"' : 'fill="none" stroke="#000000"'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${paint} stroke-width="${th}" stroke-linecap="round" stroke-linejoin="round">${block.d}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

type ImageCache = Map<string, HTMLImageElement | null>

/**
 * Renders a LabelDoc directly onto a Canvas 2D context -- no <img>, no SVG
 * document, no foreignObject. Earlier this rasterized via an SVG
 * <foreignObject> loaded into an <img> and drawn onto canvas, which is
 * the standard DOM-to-canvas trick, but Safari taints ANY canvas drawn
 * from an SVG image that contains a foreignObject, unconditionally, even
 * from a same-origin blob: URL -- so getImageData/toDataURL throw
 * SecurityError there regardless of what's actually inside it. Drawing
 * directly with Canvas 2D primitives sidesteps that class of bug
 * entirely (nothing is ever loaded as an image, so there's nothing to
 * taint), and turns out simpler besides -- QR/barcode already produce an
 * SVG path string (codegen/{qr,barcode}.ts's `pathD`), which Path2D
 * accepts natively.
 *
 * Trade-off: text layout here (wrapping, line height) is a hand-rolled
 * approximation of label.css's CSS rules, not the same engine that
 * renders the real viewer -- expect it to be close but not pixel-
 * identical. That's consistent with the simulator's whole purpose: a
 * prediction to sanity-check against the next real print, not a
 * guarantee.
 *
 * QR/barcode blocks draw via the rect list codegen/{qr,barcode}.ts
 * expose (`rects`), not Path2D -- simpler, and avoids depending on an API
 * that isn't universal (missing from Node's `canvas` package used in
 * tests, not guaranteed on an unknown WebView).
 *
 * ImageBlock is the one place this file is genuinely async (a real
 * network image load) -- that's fine here, unlike in the viewer's render
 * path, because the simulator is editor-only tooling. A failed/blocked
 * load (network error, CORS) just draws as a placeholder box, matching
 * the real <img>'s onError behavior; reading the canvas back afterwards
 * can still throw (a successfully-drawn cross-origin image without
 * permissive CORS headers taints the canvas for getImageData) -- callers
 * should expect rasterizeToCanvas to succeed while a later readback still
 * fails, and treat that as "can't preview this one, real print may differ".
 */
export async function rasterizeToCanvas(doc: LabelDoc): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = doc.w
  canvas.height = doc.h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, doc.w, doc.h)

  const items = [...doc.items].sort((a, b) => a.z - b.z)
  const imageUrls = items
    .map((it) =>
      it.block.t === 'i'
        ? it.block.d
        : it.block.t === 'p'
          ? pokemonArtworkUrl(it.block.id)
          : it.block.t === 'k'
            ? iconDataUri(it.block)
            : null,
    )
    .filter((url): url is string => url !== null)
  const images = await preloadImages(imageUrls)

  for (const item of items) {
    ctx.save()
    ctx.translate(item.x, item.y)
    if (item.rot) {
      ctx.rotate((item.rot * Math.PI) / 180)
    }
    drawBlock(ctx, item.block, item.w, item.h, images)
    ctx.restore()
  }

  return canvas
}

async function preloadImages(urls: string[]): Promise<ImageCache> {
  const cache: ImageCache = new Map()
  await Promise.all(
    urls.map(async (url) => {
      if (cache.has(url)) return
      try {
        cache.set(url, await loadImageEl(url))
      } catch {
        cache.set(url, null)
      }
    }),
  )
  return cache
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`image failed to load: ${src}`))
    img.src = src
  })
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  w: number,
  h: number | undefined,
  images: ImageCache,
) {
  switch (block.t) {
    case 't':
      drawText(ctx, block, w)
      return
    case 'r':
      drawRule(ctx, block, w)
      return
    case 'b':
      drawBox(ctx, block, w, h)
      return
    case 'q': {
      const { rects, widthDots } = buildQr(block.d, block.e ?? 'M', block.m ?? QR_MODULE_DEFAULT)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, widthDots, widthDots)
      ctx.fillStyle = '#000000'
      for (const r of rects) ctx.fillRect(r.x, r.y, r.w, r.h)
      return
    }
    case 'c': {
      const format = block.f ?? '128'
      const moduleDots = block.m ?? 2
      const heightDots = block.h ?? 80
      try {
        const { rects, widthDots, heightDots: hd } = buildBarcode(block.d, format, moduleDots, heightDots)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, widthDots, hd)
        ctx.fillStyle = '#000000'
        for (const r of rects) ctx.fillRect(r.x, r.y, r.w, r.h)
        if (block.n) {
          drawText(ctx, { t: 't', s: block.d, z: 14, a: 'c', f: 'm' }, widthDots, hd + 4)
        }
      } catch {
        ctx.strokeStyle = '#000000'
        ctx.strokeRect(0, 0, 200, heightDots)
        drawText(ctx, { t: 't', s: 'invalid barcode data', z: 12 }, 200)
      }
      return
    }
    case 'i': {
      const img = images.get(block.d)
      const boxH = h ?? (img ? Math.round((w * img.height) / img.width) : 100)
      if (img) {
        drawImageFit(ctx, img, w, boxH, block.fit ?? 'contain')
      } else {
        ctx.strokeStyle = '#000000'
        ctx.setLineDash([4, 3])
        ctx.strokeRect(0, 0, w, boxH)
        ctx.setLineDash([])
        drawText(ctx, { t: 't', s: '[image unavailable]', z: 12, a: 'c' }, w, Math.max(0, boxH / 2 - 8))
      }
      return
    }
    case 'p': {
      const url = pokemonArtworkUrl(block.id)
      const img = images.get(url)
      const imgH = img ? Math.round((w * img.height) / img.width) : w
      if (img) {
        drawImageFit(ctx, img, w, imgH, 'contain')
      } else {
        ctx.strokeStyle = '#000000'
        ctx.setLineDash([4, 3])
        ctx.strokeRect(0, 0, w, imgH)
        ctx.setLineDash([])
      }
      let y = imgH
      if (block.showName !== 0) {
        drawText(ctx, { t: 't', s: pokemonDisplayName(block.id), z: FONT_SM, bd: 1, a: 'c' }, w, y)
        y += Math.round(FONT_SM * 1.25)
      }
      if (block.showNumber !== 0) {
        drawText(ctx, { t: 't', s: formatPokemonNumber(block.id), z: FONT_SM, a: 'c' }, w, y)
      }
      return
    }
    case 'k': {
      const img = images.get(iconDataUri(block))
      const boxH = h ?? w
      if (img) {
        drawImageFit(ctx, img, w, boxH, 'contain')
      } else {
        // data: URIs load synchronously in practice, so this is mostly
        // theoretical -- but degrade the same way as any other block.
        ctx.strokeStyle = '#000000'
        ctx.strokeRect(0, 0, w, boxH)
      }
      return
    }
  }
}

function drawImageFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxW: number,
  boxH: number,
  fit: 'contain' | 'cover' | 'fill',
) {
  if (fit === 'fill') {
    ctx.drawImage(img, 0, 0, boxW, boxH)
    return
  }
  const srcRatio = img.width / img.height
  let dw = boxW
  let dh = boxW / srcRatio
  const wins = fit === 'contain' ? dh > boxH : dh < boxH
  if (wins) {
    dh = boxH
    dw = boxH * srcRatio
  }
  const dx = (boxW - dw) / 2
  const dy = (boxH - dh) / 2
  if (fit === 'cover') {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, boxW, boxH)
    ctx.clip()
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.restore()
  } else {
    ctx.drawImage(img, dx, dy, dw, dh)
  }
}

function drawRule(ctx: CanvasRenderingContext2D, block: RuleBlock, w: number) {
  const th = block.th ?? STROKE_DEFAULT
  ctx.fillStyle = '#000000'
  if (block.s === 'dashed') {
    const dashLen = 8
    const gap = 6
    let x = 0
    while (x < w) {
      const segW = Math.min(dashLen, w - x)
      ctx.fillRect(x, 0, segW, th)
      x += dashLen + gap
    }
  } else {
    ctx.fillRect(0, 0, w, th)
  }
}

function drawBox(ctx: CanvasRenderingContext2D, block: BoxBlock, w: number, h: number | undefined) {
  const th = block.th ?? STROKE_DEFAULT
  const height = h ?? 40
  if (block.fill) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, w, height)
  } else {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = th
    ctx.strokeRect(th / 2, th / 2, Math.max(0, w - th), Math.max(0, height - th))
  }
}

function drawText(ctx: CanvasRenderingContext2D, block: TextBlock, boxWidth: number, yOffset = 0) {
  const fontSize = block.z ?? FONT_BODY
  const weight = block.bd ? '700' : '400'
  const family = block.f === 'm' ? FONT_STACK_MONO : FONT_STACK_SANS
  ctx.font = `${weight} ${fontSize}px ${family}`
  ctx.textBaseline = 'top'

  const lineHeight = block.lh ?? Math.round(fontSize * 1.25)
  const align = block.a ?? 'l'

  const lines: string[] = []
  for (const para of block.s.split('\n')) {
    if (para === '') {
      lines.push('')
      continue
    }
    let current = ''
    for (const word of para.split(' ')) {
      const candidate = current ? `${current} ${word}` : word
      if (current && ctx.measureText(candidate).width > boxWidth) {
        lines.push(current)
        current = word
      } else {
        current = candidate
      }
    }
    lines.push(current)
  }

  if (block.i) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, yOffset, boxWidth, lines.length * lineHeight)
    ctx.fillStyle = '#ffffff'
  } else {
    ctx.fillStyle = '#000000'
  }

  ctx.textAlign = align === 'c' ? 'center' : align === 'r' ? 'right' : 'left'
  const x = align === 'c' ? boxWidth / 2 : align === 'r' ? boxWidth : 0

  let y = yOffset
  for (const line of lines) {
    ctx.fillText(line, x, y)
    y += lineHeight
  }
}
