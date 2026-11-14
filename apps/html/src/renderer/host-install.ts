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

export const legacyBridgeStats = installLegacyDesktopBridge()

// storage can throw on a phone (private mode, full quota, locked-down WebView); a
// throwing preference write during render white-screens the app, so this runs
// before any module reads a preference
export const storageOk = installStorageFallback()

// `Buffer` is a global, not an import, so this must finish before any engine
// module reads it at call time. Buffering the promise is enough: the engines
// only touch Buffer inside async entry points that run after boot.
export const nodeGlobalsReady = installNodeGlobals()