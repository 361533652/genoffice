import type { DocumentTabKind } from '../shared/tabs-api'
import { SOURCE_EXTS_RE_PART } from '@genoffice/electron-utils'

// shared by the open route, the open-dialog filter and the rename gate so they cannot drift
// .odt/.odp (and the .ott/.ots/.otp templates), legacy Word .doc/.dot and .hwp/.hwpx
// open through the docs/slides/sheets import filters (converted copies)
const DOCX_RE = /\.(docx|doc|dot|odt|ott|hwpx|hwp)$/i
const XLSX_RE = /\.(xlsx|xlsm|xls|csv|tsv|ods|ots)$/i
const PPTX_RE = /\.(pptx|odp|otp)$/i
const PDF_RE = /\.pdf$/i
const HTML_RE = /\.(html|htm|xhtml)$/i

/**
 * Every plain-text / source-code extension, from the one shared list. HTML has
 * its own rich app above, so it is excluded here even though the source editor
 * could also show it.
 */
const TEXT_RE = new RegExp(`\\.(${SOURCE_EXTS_RE_PART})$`, 'i')

export { DOCX_RE, XLSX_RE, PPTX_RE, PDF_RE, HTML_RE, TEXT_RE }

export function appForPath(path: string): DocumentTabKind | undefined {
  if (DOCX_RE.test(path)) return 'docs'
  if (XLSX_RE.test(path)) return 'sheets'
  if (PPTX_RE.test(path)) return 'slides'
  if (PDF_RE.test(path)) return 'pdf'
  if (TEXT_RE.test(path)) return 'markdown'
  if (HTML_RE.test(path)) return 'html'
  return undefined
}

/** A legal name in an extension no app routes to would turn an openable file into an unopenable one. */
export function renameStaysInApp(from: string, newName: string): boolean {
  const current = appForPath(from)
  if (!current) return true
  return appForPath(newName) === current
}
