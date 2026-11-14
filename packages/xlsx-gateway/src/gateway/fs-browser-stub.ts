/**
 * Browser stand-in for fs-node.
 *
 * The gateway's Node fallback (real temp dirs, atomic rename) cannot exist in
 * a renderer. Renderer builds alias ./fs-node here so the Node imports never
 * enter the browser graph; a mobile host configures an in-memory host via
 * configureGatewayHost() before any gateway call, so this stub is never
 * reached. If it is, the error says exactly what was forgotten.
 */
import type { FileSystemPort, PathPort } from './fs-port'

function unavailable(): never {
  throw new Error(
    'the Node filesystem is not available in a renderer — call configureGatewayHost() with an in-memory host first',
  )
}

export function createNodeFileSystem(): FileSystemPort {
  return unavailable()
}

export const nodePaths: PathPort = {
  join: unavailable,
  dirname: unavailable,
  basename: unavailable,
  extname: unavailable,
  tmpdir: unavailable,
}
