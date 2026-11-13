/**
 * The host a gateway call runs against.
 *
 * The gateway is shared by the Electron app, the CLI and (now) the mobile host.
 * Rather than thread a filesystem through every public function — there are
 * dozens, and most do not care — the host is a module-level setting with a
 * default that keeps desktop behaviour byte-for-byte identical.
 *
 * The Node implementation is loaded lazily on purpose: importing it
 * statically pulls `node:fs` into the module graph, which makes the whole
 * package unimportable in a browser even when no filesystem call happens.
 */
import type { FileSystemPort, PathPort } from './fs-port'

export interface GatewayHost {
  readonly fs: FileSystemPort
  readonly paths: PathPort
  /** v4 UUID for temporary file names */
  readonly uuid: () => string
}

let current: GatewayHost | null = null
let nodeHostPromise: Promise<GatewayHost> | null = null

/**
 * The active host, or null when nobody configured one and the Node
 * implementation cannot be loaded (a browser that forgot to configure).
 */
export function tryGatewayHost(): GatewayHost | null {
  return current
}

/** The active host; falls back to Node. Throws in a browser with no host set. */
export function gatewayHost(): GatewayHost {
  if (current) return current
  if (nodeHostPromise) {
    // the Node host was requested but has not resolved yet: every caller is on
    // an async path, so this synchronous facade cannot await. Callers that need
    // the fallback must call `ensureGatewayHost()` first.
    throw new Error(
      'gateway host not ready: await ensureGatewayHost() before using the gateway',
    )
  }
  throw new Error(
    'no gateway host configured — call configureGatewayHost() on this platform',
  )
}

/**
 * Resolve the default host for this platform.
 *
 * On Node this loads the real-filesystem implementation; anywhere else it
 * fails, which is the signal for the app to call `configureGatewayHost()` with
 * an in-memory host first.
 */
export async function ensureGatewayHost(): Promise<GatewayHost> {
  if (current) return current
  if (!nodeHostPromise) {
    nodeHostPromise = (async () => {
      const { createNodeFileSystem, nodePaths } = await import('./fs-node')
      current = {
        fs: createNodeFileSystem(),
        paths: nodePaths,
        uuid: () =>
          typeof globalThis.crypto?.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : Math.random().toString(16).slice(2),
      }
      return current
    })()
  }
  return nodeHostPromise
}

/** A host backed by the real Node filesystem (desktop callers and tests). */
export async function nodeGatewayHost(): Promise<GatewayHost> {
  return ensureGatewayHost()
}

/** Swap in a different host (the mobile app calls this once at startup). */
export function configureGatewayHost(host: GatewayHost): void {
  current = host
}

/** Restore the platform default — tests use this after configuring a host. */
export function resetGatewayHost(): void {
  current = null
  nodeHostPromise = null
}
