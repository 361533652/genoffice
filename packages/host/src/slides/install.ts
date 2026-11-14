/**
 * Install the deck session host: the pure-TS pptx engine stack behind the
 * legacy bridge, so the slides renderer's `slidesApi` calls reach real
 * implementations instead of desktop-only refusals.
 *
 * SYNCHRONOUS on purpose: slides calls newBlank during boot, before any user
 * interaction — an async install would race the first render. Unlike sheets
 * there is no engine asset to fetch, so nothing here needs to be async.
 *
 * Opt-in by design (a host calls this when it wants the session): the Android
 * WebView injection and the e2e harness set `__genofficeSlidesSession`.
 *
 * Subpath export (@genoffice/host/slides/install): the pptx stack must not
 * enter the other five apps' module graphs.
 */
import type { FileHost } from '@genoffice/host-contract'
import { registerBridgeOverride } from '../legacy-desktop-bridge.js'
import { openAnywhere, readFromHandle, saveAnywhere, writeToHandle } from '../files.js'
import { DeckSessionHost } from './deck-session.js'
import { createDeckMethods } from './methods.js'

export interface SlidesSessionInstallOptions {
  /** file access; defaults to the browser primitives (picker/download) */
  files?: FileHost
}

export interface SlidesSessionHandle {
  host: DeckSessionHost
  uninstall(): void
}

/** The browser FileHost: the same primitives the legacy shim already uses. */
export function browserSlidesFileHost(): FileHost {
  return {
    open: (kind) => openAnywhere(kind),
    saveAs: (data, name) => saveAnywhere(data, name, 'pptx'),
    saveInPlace: (handle, data) => writeToHandle(handle, data),
    read: (handle) => readFromHandle(handle),
    rename: async () => ({ ok: false, error: 'rename needs the desktop host' }),
  }
}

export function installSlidesSessionHost(
  options: SlidesSessionInstallOptions = {},
): SlidesSessionHandle {
  const files = options.files ?? browserSlidesFileHost()
  const host = new DeckSessionHost(files)
  const methods = createDeckMethods(host, files)
  // Desktop IPC always answers with a Promise; the renderer uses .then() in
  // places (consumePendingOpen at boot). Wrap every non-subscription method so
  // a sync return or throw behaves exactly like the IPC it replaces.
  const unregisters = Object.entries(methods).map(([name, fn]) => {
    const wrapped = name.startsWith('on')
      ? fn
      : ((...args: unknown[]) => (async () => fn(...(args as never[])))())
    return registerBridgeOverride(name, wrapped as (...args: unknown[]) => unknown)
  })
  // readiness marker + diagnostic handle (tests, Android host)
  const g = globalThis as {
    __genofficeSlidesSessionReady?: boolean
    __genofficeSlidesSessionHost?: DeckSessionHost
  }
  g.__genofficeSlidesSessionReady = true
  g.__genofficeSlidesSessionHost = host
  return {
    host,
    uninstall(): void {
      for (const unregister of unregisters) unregister()
      delete g.__genofficeSlidesSessionReady
      delete g.__genofficeSlidesSessionHost
      host.close()
    },
  }
}
