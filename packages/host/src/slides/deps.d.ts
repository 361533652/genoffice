/**
 * Ambient declarations for dependencies of the pptx packages, whose own
 * declaration files live inside their source trees and are not part of this
 * package's compilation.
 */

// pptx-render/src/text-layout.ts imports bidi-js (ships no types)
declare module 'bidi-js' {
  interface BidiApi {
    getEmbeddingLevels(
      text: string,
      explicitDirection?: 'ltr' | 'rtl',
    ): { levels: Uint8Array; paragraphs: Array<{ start: number; end: number; level: number }> }
  }
  export default function bidiFactory(): BidiApi
}

// pptx-ops/src/op-docs.ts imports its prompt markdown via Vite's ?raw suffix
declare module '*?raw' {
  const content: string
  export default content
}
