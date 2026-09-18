declare module 'qrcode-generator' {
  export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

  export interface QRCode {
    addData(data: string, mode?: string): void
    make(): void
    getModuleCount(): number
    isDark(row: number, col: number): boolean
  }

  /** typeNumber 0 means "auto-detect the smallest version that fits". */
  export function qrcode(typeNumber: number, errorCorrectionLevel: ErrorCorrectionLevel): QRCode

  export default qrcode
}
