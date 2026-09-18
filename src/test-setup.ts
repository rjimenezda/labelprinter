// jsdom doesn't implement the ImageData constructor (no canvas backend).
// Production code correctly uses the real browser API; this is a minimal
// duck-typed stand-in so dither.ts's unit tests can run under vitest.
if (typeof globalThis.ImageData === 'undefined') {
  class ImageDataPolyfill {
    data: Uint8ClampedArray
    width: number
    height: number
    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth
        this.width = widthOrHeight
        this.height = height ?? dataOrWidth.length / 4 / widthOrHeight
      } else {
        this.width = dataOrWidth
        this.height = widthOrHeight
        this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4)
      }
    }
  }
  // @ts-expect-error test-only global polyfill, not a full ImageData
  globalThis.ImageData = ImageDataPolyfill
}
