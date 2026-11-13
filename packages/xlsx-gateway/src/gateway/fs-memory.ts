/**
 * The in-memory implementation of {@link FileSystemPort}.
 *
 * A WebView has no temp directory and no atomic rename, so this keeps the whole
 * working set in a Map. Paths are synthetic keys, not real files.
 *
 * The guarantees that change, per ADR 3:
 *  - `replaceFile` is a two-step copy behind one synchronous swap of the map
 *    entry, so a reader never sees a half-written package — but if the tab dies
 *    mid-save there is no on-disk journal to replay.
 *  - `syncFile` is a no-op; there is nothing to flush to.
 */
import type { FileSystemPort, PathPort, ScratchArea } from './fs-port'

let scratchSeq = 0

/** A filesystem that lives entirely in a Map. */
export function createMemoryFileSystem(): FileSystemPort & { snapshot(): Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>()
  const dirs = new Set<string>()

  return {
    snapshot: () => new Map(files),

    async makeScratchDir(): Promise<ScratchArea> {
      const dir = '/memory/scratch-' + ++scratchSeq
      dirs.add(dir)
      return {
        dir,
        dispose: async () => {
          for (const key of [...files.keys()]) if (key.startsWith(dir + '/')) files.delete(key)
          dirs.delete(dir)
        },
      }
    },
    async readFile(path) {
      const found = files.get(path)
      if (!found) throw new Error('ENOENT: ' + path)
      return found
    },
    async writeFile(path, data) {
      files.set(path, new Uint8Array(data))
    },
    async syncFile() {
      // nothing to flush: the bytes are already the only copy
    },
    async replaceFile(source, target) {
      const found = files.get(source)
      if (found) files.set(target, found)
      files.delete(source)
      return { atomic: false }
    },
    async copyFile(source, target) {
      const found = files.get(source)
      if (found) files.set(target, new Uint8Array(found))
    },
    async remove(path) {
      files.delete(path)
    },
    async makeDir(path) {
      dirs.add(path)
    },
  }
}

/** POSIX-shaped path helpers; synthetic keys only ever use `/`. */
export const memoryPaths: PathPort = {
  join: (...parts) => parts.filter(Boolean).join('/').replace(/\/+/g, '/'),
  dirname: (p) => {
    const i = p.lastIndexOf('/')
    return i <= 0 ? '/' : p.slice(0, i)
  },
  basename: (p, ext) => {
    const base = p.slice(p.lastIndexOf('/') + 1)
    return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base
  },
  extname: (p) => {
    const base = p.slice(p.lastIndexOf('/') + 1)
    const i = base.lastIndexOf('.')
    return i <= 0 ? '' : base.slice(i)
  },
  tmpdir: () => '/memory',
}
