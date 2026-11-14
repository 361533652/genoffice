/**
 * Install the legacy `window.desktop` bridge before anything else runs.
 *
 * This file must be the FIRST import in the renderer entry: ES modules evaluate
 * their imports before the importing module's body, so calling the installer
 * from `main.tsx`'s body would still be too late for any imported module that
 * touches `window.desktop` at module scope.
 *
 * It also installs the Node globals the engine packages assume (`Buffer`), which
 * a WebView does not provide. See docs/mobile/decisions.md, ADR 2 and ADR 5.
 */
import { installLegacyDesktopBridge, installNodeGlobals, installStorageFallback } from '@genoffice/host'
import { installSheetsSessionHost } from '@genoffice/host/sheets/install'

export const legacyBridgeStats = installLegacyDesktopBridge()

// storage can throw on a phone (private mode, full quota, locked-down WebView); a
// throwing preference write during render white-screens the app, so this runs
// before any module reads a preference
export const storageOk = installStorageFallback()

// `Buffer` is a global, not an import, so this must finish before any engine
// module reads it at call time. Buffering the promise is enough: the engines
// only touch Buffer inside async entry points that run after boot.
export const nodeGlobalsReady = installNodeGlobals()

// The wasm workbook session: when the host serves the engine asset, sheets
// gets real open/edit/save (the same Rust sidecar the desktop spawns, compiled
// to wasm32-wasip1). The Android WebView injection and the e2e harness set the
// URL; a host that never sets it keeps the honest desktop-only refusals, and
// the desktop build is untouched. Installation is async but completes long
// before a user can pick a file; a failure leaves the refusals in place.
const sheetsWasmUrl = (globalThis as { __genofficeSheetsWasmUrl?: string }).__genofficeSheetsWasmUrl
if (typeof sheetsWasmUrl === 'string' && sheetsWasmUrl !== '') {
  void installSheetsSessionHost({ wasm: sheetsWasmUrl }).catch((error: unknown) => {
    console.warn('[sheets] wasm session host unavailable:', error)
  })
}