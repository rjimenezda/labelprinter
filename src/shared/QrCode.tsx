import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/**
 * Laptop-side only. Renders a QR code of `value` sized so each module is
 * comfortably scannable off a screen (not off thermal paper -- the label
 * QR renderer in src/codegen/qr.ts is a completely separate, dot-snapped
 * implementation).
 */
export function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'L',
    }).catch((err: unknown) => {
      console.error('QR render failed', err)
    })
  }, [value, size])

  return <canvas ref={canvasRef} width={size} height={size} />
}
