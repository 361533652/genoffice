/**
 * A zlib-stored-block compressor, in plain TypeScript.
 *
 * `media-insert.ts` used `node:zlib`'s `deflateSync` to build the IDAT chunk of
 * a generated solid-colour PNG. `solidPng` is synchronous and exported, so the
 * browser's async `CompressionStream` cannot take its place without changing
 * the shape of every call site.
 *
 * A zlib stream may use *stored* (uncompressed) deflate blocks, and every PNG
 * decoder accepts them. That gives a byte-exact, dependency-free, synchronous
 * implementation that behaves identically under Node and in a WebView.
 *
 * Cost: no compression. This only ever encodes the placeholder poster frame,
 * which is a flat colour, so the raw stream is the dominant cost either way.
 */

const BLOCK_MAX = 0xffff

/**
 * Wrap `data` in a zlib stream (RFC 1950) using stored deflate blocks.
 *
 * The output is a valid zlib stream: 2-byte header, N stored blocks of at most
 * 65535 bytes, then the Adler-32 of the uncompressed input.
 */
export function zlibStoredSync(data: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(data.length / BLOCK_MAX))
  // header(2) + per-block 5 bytes (BFINAL/BTYPE, LEN, NLEN) + payload + adler(4)
  const out = new Uint8Array(2 + blocks * 5 + data.length + 4)
  let p = 0
  // CMF: deflate, 32K window. FLG chosen so (CMF*256 + FLG) % 31 === 0.
  out[p++] = 0x78
  out[p++] = 0x01
  let offset = 0
  for (let i = 0; i < blocks; i++) {
    const len = Math.min(BLOCK_MAX, data.length - offset)
    const final = i === blocks - 1 ? 1 : 0
    out[p++] = final // BFINAL in bit 0, BTYPE=00 (stored) in bits 1-2
    out[p++] = len & 0xff
    out[p++] = (len >>> 8) & 0xff
    out[p++] = ~len & 0xff
    out[p++] = (~len >>> 8) & 0xff
    out.set(data.subarray(offset, offset + len), p)
    p += len
    offset += len
  }
  writeU32BE(out, p, adler32(data))
  return out
}

/** Adler-32 as zlib defines it (RFC 1950 §9). */
export function adler32(data: Uint8Array): number {
  let a = 1
  let b = 0
  // 5552 is the largest n for which 255n(n+1)/2 + (n+1)(BASE-1) stays under 2^32
  const NMAX = 5552
  let i = 0
  while (i < data.length) {
    const end = Math.min(i + NMAX, data.length)
    for (; i < end; i++) {
      a += data[i]!
      b += a
    }
    a %= 65521
    b %= 65521
  }
  return ((b << 16) | a) >>> 0
}

function writeU32BE(out: Uint8Array, at: number, value: number): void {
  out[at] = (value >>> 24) & 0xff
  out[at + 1] = (value >>> 16) & 0xff
  out[at + 2] = (value >>> 8) & 0xff
  out[at + 3] = value & 0xff
}
