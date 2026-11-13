/**
 * The filesystem operations the xlsx gateway needs, behind an interface.
 *
 * `xlsx-gateway.ts` and `xlsx-package-io.ts` were the only two files in this
 * package that imported `node:fs`, but they did it deeply: a temp directory per
 * package, atomic rename for the final write, and fsync between the two. That
 * is fine on a desktop and impossible in a WebView.
 *
 * Two hosts need very different things here:
 *
 *  - Node/Electron: a real temp dir, `rename` for atomic replacement, fsync.
 *  - A browser/Android WebView: no temp dir at all; the package lives in memory
 *    and the "file" is a handle the user granted through SAF. There is no
 *    atomic rename, so the desktop-only guarantees degrade (see ADR 3 in
 *    docs/mobile/decisions.md).
 *
 * This port is the seam. Callers depend on it; each host supplies one.
 */

/** Where a working copy of a package can be materialised. */
export interface ScratchArea {
  /** absolute-ish path of the working directory (may be a synthetic key) */
  readonly dir: string
  /** remove the directory and everything in it */
  dispose(): Promise<void>
}

/** The filesystem surface the gateway uses. */
export interface FileSystemPort {
  /** create a private working directory */
  makeScratchDir(): Promise<ScratchArea>
  /** read a whole file; throws when missing */
  readFile(path: string): Promise<Uint8Array>
  /** write a whole file, truncating any existing content */
  writeFile(path: string, data: Uint8Array): Promise<void>
  /**
   * Flush a file's bytes to the OS.
   *
   * A WebView host treats this as a no-op: `createWritable()` already commits
   * on `close()`, and SAF offers a sync only through a file descriptor we do
   * not hold.
   */
  syncFile(path: string): Promise<void>
  /**
   * Replace `target` with `source` atomically.
   *
   * Hosts without atomic rename report `atomic: false` so the caller can
   * decide whether the weaker guarantee is acceptable (it is for a save the
   * user just asked for, and it is not for crash recovery).
   */
  replaceFile(source: string, target: string): Promise<{ atomic: boolean }>
  /** copy a file */
  copyFile(source: string, target: string): Promise<void>
  /** delete a file; missing files are not an error */
  remove(path: string): Promise<void>
  /** create a directory and its parents */
  makeDir(path: string): Promise<void>
}

/** Join path segments the way the host expects. */
export interface PathPort {
  join(...parts: string[]): string
  dirname(path: string): string
  basename(path: string, ext?: string): string
  extname(path: string): string
  /** the platform temp root, or a synthetic prefix on a host with none */
  tmpdir(): string
}

/** A v4 UUID, without importing `node:crypto`. */
export type UuidSource = () => string
