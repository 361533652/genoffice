
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

/**
 * Known gaps on a browser/WebView host, as of the Android port.
 *
 * The sheets session gaps below apply to hosts that have NOT installed the
 * session hosts (@genoffice/host/sheets/install, @genoffice/host/slides/install).
 * With them installed, open/edit/save work; the remaining entries are the
 * honest v1 residue.
 */
export const BROWSER_HOST_LIMITATIONS: readonly HostLimitation[] = [
  {
    capability: 'selectWorkbook',
    missing: 'opening a spreadsheet on a host without the workbook session',
    needs:
      'a host-side workbook session. The sheets app does not read bytes and parse them itself: it asks the host to open a file, and gets back a WorkbookFile whose sessionId addresses every later read, edit and save. Supplied by the wasm workbook session (the desktop Rust sidecar compiled to wasm32-wasip1) when the host installs it.',
  },
  {
    capability: 'saveWorkbookEdits',
    missing: 'saving a spreadsheet back to its file on a host without the workbook session',
    needs:
      'the same host-side session as selectWorkbook, plus a FileAccess save path. Both fall out of the wasm workbook session; without it, saving is unavailable.',
  },
  {
    capability: 'slidesMasterEdit',
    missing: 'editing slide masters and layouts in the dedicated master view',
    needs: 'a port of the master-view session (part-addressed transactions); the deck session covers normal slide editing',
  },
  {
    capability: 'slidesFontPrecision',
    missing: 'pixel-exact text layout for fonts the device does not have',
    needs: 'the deck session uses deterministic heuristic metrics; a canvas-measurement provider and embedded-font loading are the next step',
  },
  {
    capability: 'crashRecovery',
    missing: 'restoring unsaved edits after a crash',
    needs: 'a persistent recovery store on the host; writeWorkbookRecovery honestly reports failure until one exists',
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
