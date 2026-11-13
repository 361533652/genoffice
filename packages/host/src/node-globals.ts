/**
 * Browser shims for the Node globals the engine packages assume.
 *
 * The docx/pptx engines are pure TypeScript with no `node:` imports in their
 * hot paths, but they still reach for three globals that Node provides:
 *
 *   Buffer      - byte slicing with the base64/hex helpers (87 call sites)
 *   node:crypto - createHash('sha256') for the original-bytes hash, and
 *                 randomUUID for section ids
 *   node:zlib   - deflateSync, only to build the IDAT chunk of a generated PNG
 *
 * A WebView has none of them. Rather than rewrite every call site, this module
 * installs faithful equivalents on `globalThis` before the app boots:
 *
 *   - Buffer        <- the `buffer` package (the reference browser build)
 *   - crypto.randomUUID / digest are native in every WebView we target
 *
 * `deflateSync` cannot be shimmed this way (it is a real compression call), so
 * pptx-engine now uses an injected compressor — see ./deflate.ts.
 *
 * Import this FIRST in a renderer entry, before any engine import.
 */

/** Install the Buffer global when the host does not provide one. */
export async function installNodeGlobals(): Promise<void> {
  const scope = globalThis as unknown as Record<string, unknown>
  if (typeof scope.Buffer === 'undefined') {
    const mod = (await import('buffer')) as { Buffer?: unknown }
    if (mod.Buffer) scope.Buffer = mod.Buffer
  }
}

/**
 * SHA-256 as lowercase hex, the way `createHash('sha256').update(x).digest('hex')`
 * answers in Node. Uses the WebCrypto implementation every target has.
 */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', copy)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** A v4 UUID without importing `node:crypto`. */
export function randomUuid(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  // RFC 4122 v4 layout, filled from getRandomValues
  const b = new Uint8Array(16)
  globalThis.crypto.getRandomValues(b)
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
