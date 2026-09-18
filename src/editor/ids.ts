let counter = 0

/** Editor-only id generation -- never used by the renderer/decoder, which
 *  must stay deterministic. crypto.randomUUID is fine here because this
 *  only ever runs in a modern authoring browser, never on the viewer's
 *  unknown WebView. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8)
  }
  counter += 1
  return `id-${Date.now().toString(36)}-${counter}`
}
