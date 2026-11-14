/**
 * The gateway's FileSystemPort, backed by the SAME in-memory tree the wasm
 * sidecar sees through WASI.
 *
 * This is the seam that makes the desktop streaming save pipeline
 * (saveWorkbookViaSidecar) run unchanged on a mobile host: the sidecar
 * extracts entries to /tmp/... and the gateway reads them back through this
 * port — one filesystem, two clients.
 *
 * Guarantees degrade exactly where ADR 3 says they do: replaceFile is a map
 * move, not an atomic rename, so it reports atomic:false.
 */
import { File, Directory, type Inode } from '@bjorn3/browser_wasi_shim'
import type { FileSystemPort, PathPort, ScratchArea } from '@genoffice/xlsx-gateway/gateway/fs-port'
import type { SidecarTree } from './wasm-sidecar.js'

function partsOf(path: string): string[] {
  return path.split('/').filter((part) => part !== '' && part !== '.')
}

/** Resolve an absolute virtual path to its root directory and components. */
function rootFor(tree: SidecarTree, path: string): { root: Directory; parts: string[] } {
  const parts = partsOf(path)
  const head = parts.shift()
  if (head === 'tmp') return { root: tree.tmp, parts }
  if (head === 'data') return { root: tree.data, parts }
  throw new Error(`virtual path outside the sidecar tree: ${path}`)
}

function entryAt(root: Directory, parts: string[]): File | Directory | undefined {
  let current: Inode = root
  for (const part of parts) {
    if (!(current instanceof Directory)) return undefined
    const next: Inode | undefined = current.contents.get(part)
    if (next === undefined) return undefined
    current = next
  }
  return current instanceof File || current instanceof Directory ? current : undefined
}

function parentOf(root: Directory, parts: string[]): { parent: Directory; name: string } {
  const name = parts[parts.length - 1]
  if (name === undefined) throw new Error('cannot address the root itself')
  let current = root
  for (const part of parts.slice(0, -1)) {
    let next: Inode | undefined = current.contents.get(part)
    if (next === undefined) {
      next = new Directory(new Map())
      current.contents.set(part, next)
    }
    if (!(next instanceof Directory)) throw new Error(`not a directory: ${part}`)
    current = next
  }
  return { parent: current, name }
}

function removeEntry(root: Directory, parts: string[]): void {
  const { parent, name } = parentOf(root, parts)
  parent.contents.delete(name)
}

export function createShimFileSystem(tree: SidecarTree): FileSystemPort {
  return {
    async makeScratchDir(): Promise<ScratchArea> {
      const dir = `/tmp/gw-${crypto.randomUUID()}`
      const { root, parts } = rootFor(tree, dir)
      const { parent, name } = parentOf(root, parts)
      parent.contents.set(name, new Directory(new Map()))
      return {
        dir,
        dispose: async () => {
          removeEntry(root, parts)
        },
      }
    },

    async readFile(path: string): Promise<Uint8Array> {
      const { root, parts } = rootFor(tree, path)
      const entry = entryAt(root, parts)
      if (!(entry instanceof File)) throw new Error(`no such file: ${path}`)
      // copy: the caller may hold the bytes while the engine rewrites the file
      return new Uint8Array(entry.data)
    },

    async writeFile(path: string, data: Uint8Array): Promise<void> {
      const { root, parts } = rootFor(tree, path)
      const { parent, name } = parentOf(root, parts)
      const existing = parent.contents.get(name)
      if (existing instanceof File) {
        existing.data = new Uint8Array(data)
      } else {
        parent.contents.set(name, new File(new Uint8Array(data)))
      }
    },

    async syncFile(): Promise<void> {
      // in-memory bytes are already "flushed"; nothing to fsync
    },

    async replaceFile(source: string, target: string): Promise<{ atomic: boolean }> {
      const from = rootFor(tree, source)
      const to = rootFor(tree, target)
      const entry = entryAt(from.root, from.parts)
      if (entry === undefined) throw new Error(`no such file: ${source}`)
      removeEntry(from.root, from.parts)
      const { parent, name } = parentOf(to.root, to.parts)
      parent.contents.set(name, entry)
      return { atomic: false }
    },

    async copyFile(source: string, target: string): Promise<void> {
      const from = rootFor(tree, source)
      const entry = entryAt(from.root, from.parts)
      if (!(entry instanceof File)) throw new Error(`no such file: ${source}`)
      const to = rootFor(tree, target)
      const { parent, name } = parentOf(to.root, to.parts)
      parent.contents.set(name, new File(new Uint8Array(entry.data)))
    },

    async remove(path: string): Promise<void> {
      const { root, parts } = rootFor(tree, path)
      removeEntry(root, parts)
    },

    async makeDir(path: string): Promise<void> {
      const { root, parts } = rootFor(tree, path)
      let current = root
      for (const part of parts) {
        let next: Inode | undefined = current.contents.get(part)
        if (next === undefined) {
          next = new Directory(new Map())
          current.contents.set(part, next)
        }
        if (!(next instanceof Directory)) throw new Error(`not a directory: ${part}`)
        current = next
      }
    },
  }
}

/** POSIX-style paths: the virtual tree has no drive letters or backslashes. */
export const shimPaths: PathPort = {
  join(...parts: string[]): string {
    const joined = parts
      .filter((part) => part !== '')
      .join('/')
      .replace(/\/+/g, '/')
    return joined.startsWith('/') ? joined : `/${joined}`
  },
  dirname(path: string): string {
    const parts = partsOf(path)
    parts.pop()
    return `/${parts.join('/')}`
  },
  basename(path: string, ext?: string): string {
    const parts = partsOf(path)
    const name = parts[parts.length - 1] ?? ''
    return ext !== undefined && name.endsWith(ext) ? name.slice(0, -ext.length) : name
  },
  extname(path: string): string {
    const name = partsOf(path).pop() ?? ''
    const dot = name.lastIndexOf('.')
    return dot <= 0 ? '' : name.slice(dot)
  },
  tmpdir(): string {
    return '/tmp'
  },
}
