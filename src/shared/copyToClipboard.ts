/**
 * navigator.clipboard requires a secure context, and http://192.168.x.x is
 * not one -- so fall back to the classic hidden-textarea execCommand trick.
 * (This is also why the QR code exists: it's the transport that always
 * works, clipboard is just the fast path when the phone is an iPhone on
 * the same Apple ID as this Mac -- Universal Clipboard.)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to legacy path
    }
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    ta.style.top = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
