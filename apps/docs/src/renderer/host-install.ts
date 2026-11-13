/**
 * Install the legacy `window.desktop` bridge before anything else runs.
 *
 * This file must be the FIRST import in the renderer entry: ES modules evaluate
 * their imports before the importing module's body, so calling the installer
 * from `main.tsx`'s body would still be too late for any imported module that
 * touches `window.desktop` at module scope.
 */
import { installLegacyDesktopBridge } from '@genoffice/host'

export const legacyBridgeStats = installLegacyDesktopBridge()
