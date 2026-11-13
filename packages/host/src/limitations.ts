
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
    capability: 'saveWorkbookEdits',
    missing: 'saving a spreadsheet back to its file',
    needs:
      'a host-side workbook session: the sheets app opens through the main process, which owns a sessionId and writes the patched package. A mobile host must provide the same session + FileAccess save path.',
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
