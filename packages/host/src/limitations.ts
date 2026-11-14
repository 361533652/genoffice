
/**
 * Capabilities a host can honestly lack, and what the app should do about it.
 *
 * The shim can keep an app booting without Electron, but "boots" is not "works".
 * These are the places where a renderer needs something only a native host can
 * supply; naming them lets the UI disable the affordance instead of failing at
 * the moment of use.
 */
export interface HostLimitation {
  /** the bridge method or capability that is missing */
  readonly capability: string
  /** what the user cannot do, in user terms */
  readonly missing: string
  /** what would supply it */
  readonly needs: string
}

/** Known gaps on a browser/WebView host, as of the Android port. */
export const BROWSER_HOST_LIMITATIONS: readonly HostLimitation[] = [
  {
    capability: 'selectWorkbook',
    missing: 'opening a spreadsheet at all',
    needs:
      'a host-side workbook session. The sheets app does not read bytes and parse them itself: it asks the main process to open a file, and gets back a WorkbookFile whose sessionId addresses every later read, edit and save. Without that session there is no workbook to show — so this gap sits *before* the save one.',
  },
  {
    capability: 'saveWorkbookEdits',
    missing: 'saving a spreadsheet back to its file',
    needs:
      'the same host-side session as selectWorkbook, plus a FileAccess save path. Both fall out of one piece of work.',
  },
  {
    capability: 'splitPdf',
    missing: 'PDF page surgery (split, merge, crop, reorder, resize)',
    needs: 'in-renderer pdf-lib work, or a native PDF service',
  },
  {
    capability: 'signWithCertificate',
    missing: 'digital signatures',
    needs: 'the Android keystore / PKCS#11 equivalent',
  },
  {
    capability: 'print',
    missing: 'printing',
    needs: 'Android PrintManager',
  },
  {
    capability: 'ocrPage',
    missing: 'OCR of scanned pages',
    needs: 'ML Kit or Tesseract.wasm',
  },
  {
    capability: 'zoteroCommand',
    missing: 'Zotero citation integration',
    needs: 'no mobile equivalent; desktop only by nature',
  },
]
