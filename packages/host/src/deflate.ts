/**
 * Injected DEFLATE for callers that need real compression in a browser.
 *
 * `pptx-engine` generated the IDAT chunk of an inserted PNG with `node:zlib`'s
 * `deflateSync`. A WebView has `CompressionStream('deflate')` instead, which is
 * async and therefore changes the call site's shape, so the engine takes a
 * compressor function and the host decides which one to supply.
 *
 * PNG's IDAT carries a zlib stream (deflate + zlib header/adler32), which is
 * exactly what `CompressionStream('deflate')` produces.
 */

/** A synchronous-looking compressor the engine can call. */
export interface DeflateSource {
  deflate(bytes: Uint8Array): Promise<Uint8Array>
}

/** The browser implementation, backed by CompressionStream. */
export function createCompressionStreamDeflate(): DeflateSource | null {
  const Stream = (globalThis as unknown as { CompressionStream?: typeof CompressionStream }).CompressionStream
  if (typeof Stream !== 'function') return null
  return {
    async deflate(bytes: Uint8Array): Promise<Uint8Array> {
      const copy = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(copy).set(bytes)
      const stream = new Stream('deflate')
      const out = new Response(new Blob([copy]).stream().pipeThrough(stream))
      return new Uint8Array(await out.arrayBuffer())
    },
  }
}
