/**
 * Capability flags a host declares about itself.
 *
 * A renderer must branch on these instead of probing for `window.desktop`:
 * the Electron host, a plain browser and the Android WebView host all expose
 * the same `host` object, but they implement different subsets of the
 * contract. Anything a host cannot do is reported here up front so the UI can
 * hide the affordance rather than fail at call time.
 *
 * Every flag defaults to `false`: a host opts in to what it actually supports.
 */
export interface HostCapabilities {
  /** the host can open a file picker and return bytes for a document */
  readonly openFile: boolean
  /** the host can write document bytes to a user-chosen destination */
  readonly saveFile: boolean
  /** the host can overwrite an already-open document in place */
  readonly saveInPlace: boolean
  /** the host has a native print path (Electron printers, Android PrintManager) */
  readonly print: boolean
  /** the host can render a PDF through a native/embedded viewer */
  readonly exportPdf: boolean
  /** the host can run the structured AI chat/stream tools */
  readonly ai: boolean
  /** the host can perform web/image search for the AI tools */
  readonly webSearch: boolean
  /** the host can read files off the local disk by absolute path */
  readonly localPaths: boolean
  /** the host has a multi-tab shell around the editor */
  readonly tabs: boolean
  /** the host can drive Zotero word-processor integration */
  readonly zotero: boolean
  /** the host can persist a project/recent-files index */
  readonly projectStore: boolean
  /** the host can run an external CLI (packages/cli) as a child process */
  readonly runCli: boolean
}

/** Every capability off — the neutral baseline a new host starts from. */
export const NO_CAPABILITIES: HostCapabilities = {
  openFile: false,
  saveFile: false,
  saveInPlace: false,
  print: false,
  exportPdf: false,
  ai: false,
  webSearch: false,
  localPaths: false,
  tabs: false,
  zotero: false,
  projectStore: false,
  runCli: false,
}

/** The Electron desktop host: everything the current shell does. */
export const DESKTOP_CAPABILITIES: HostCapabilities = {
  openFile: true,
  saveFile: true,
  saveInPlace: true,
  print: true,
  exportPdf: true,
  ai: true,
  webSearch: true,
  localPaths: true,
  tabs: true,
  zotero: true,
  projectStore: true,
  runCli: true,
}

/**
 * A browser host: can do what the web platform allows and nothing more.
 *
 * `localPaths` stays false on purpose — a browser never sees a real filesystem
 * path, everything it touches is a blob it was handed.
 */
export const BROWSER_CAPABILITIES: HostCapabilities = {
  openFile: true,
  saveFile: true,
  saveInPlace: false,
  print: false,
  exportPdf: false,
  ai: true,
  webSearch: true,
  localPaths: false,
  tabs: false,
  zotero: false,
  projectStore: false,
  runCli: false,
}

/** True when every flag in `required` is also true in `caps`. */
export function supports(caps: HostCapabilities, ...required: (keyof HostCapabilities)[]): boolean {
  return required.every((key) => caps[key])
}
