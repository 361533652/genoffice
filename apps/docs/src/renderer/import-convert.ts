/**
 * Open an imported document on a host without a main process.
 *
 * The desktop main process converts legacy Word (.doc/.dot) and ODF (.odt/.ott)
 * imports to a .docx copy before the renderer ever sees the bytes. A mobile host
 * has no main process, so the renderer runs the same import filters here. Native
 * .docx (a zip) passes through untouched, which also makes this a no-op on the
 * desktop (where the bytes are already converted).
 *
 * A converted legacy document is still saved as a NEW .docx on a mobile host:
 * the browser/WebView bridge refuses in-place saves and routes every save to
 * Save As, so the original .doc is never overwritten with OOXML bytes.
 */
import { convertLegacyDocToDocx } from '@genoffice/doc2docx'
import { convertOdtToDocx } from '@genoffice/odf2ooxml'
import { docImportKindForPath } from '../shared/open-file'

function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b
}

/**
 * Convert an imported document to .docx bytes, or return the bytes unchanged
 * when they are already a .docx (or the name carries no import kind).
 */
export async function convertImportedDocument(
  name: string,
  bytes: Uint8Array,
): Promise<Uint8Array> {
  const kind = docImportKindForPath(name)
  if (!kind || isZip(bytes)) return bytes
  if (kind === 'word97') return (await convertLegacyDocToDocx(bytes)).docx
  if (kind === 'odf') return (await convertOdtToDocx(bytes)).docx
  // .hwp/.hwpx: the converter reads Node's fs/zlib and cannot run in a WebView.
  // Say so instead of letting the docx parser fail on a compound file.
  throw new Error('HWP/HWPX needs the desktop app; save it as .docx first.')
}
