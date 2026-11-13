/**
 * @genoffice/host-contract — platform-neutral host contract.
 *
 * Rules for this package:
 *  1. Interfaces and plain data only. No implementations, no Electron, no
 *     `node:` imports. It must typecheck under `lib: ["ES2022", "DOM"]`.
 *  2. A host (Electron main+preload, a browser shim, the Android WebView
 *     bridge) implements these groups; the renderer only ever sees the
 *     `Host` facade.
 *  3. Every path-shaped parameter is a `FileHandle`, never a string path.
 */
export {
  NO_CAPABILITIES,
  DESKTOP_CAPABILITIES,
  BROWSER_CAPABILITIES,
  supports,
  type HostCapabilities,
} from './capabilities.js'

export type { FileHandle, DocumentKind, OpenResult } from './handle.js'

export type {
  FileAccess,
  FileReader,
  FileWriter,
  OpenedFile,
  SaveOutcome,
} from './file-access.js'

export type {
  FileHost,
  DialogHost,
  SettingsHost,
  AiHost,
  PrintHost,
  CliHost,
} from './groups.js'
