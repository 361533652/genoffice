/**
 * The Node implementation of {@link FileSystemPort}: a real temp dir, atomic
 * rename, and fsync. This is what the desktop app keeps using.
 */
import { closeSync, fsyncSync, openSync, mkdirSync, readFileSync, writeFileSync, writeSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import type { FileSystemPort, PathPort, ScratchArea } from './fs-port'

/** Atomic replacement through `rename`, the way the desktop always did it. */
export function createNodeFileSystem(): FileSystemPort {
  return {
    async makeScratchDir(): Promise<ScratchArea> {
      const dir = await mkdtemp(join(tmpdir(), 'genoffice-xlsx-'))
      return { dir, dispose: () => rm(dir, { recursive: true, force: true }) }
    },
    async readFile(path) {
      return new Uint8Array(readFileSync(path))
    },
    async writeFile(path, data) {
      writeFileSync(path, data)
    },
    async syncFile(path) {
      const fd = openSync(path, 'r+')
      try {
        fsyncSync(fd)
      } finally {
        closeSync(fd)
      }
    },
    async replaceFile(source, target) {
      await rename(source, target)
      return { atomic: true }
    },
    async copyFile(source, target) {
      await copyFile(source, target)
    },
    async remove(path) {
      await rm(path, { force: true })
    },
    async makeDir(path) {
      await mkdir(path, { recursive: true })
    },
  }
}

export const nodePaths: PathPort = {
  join,
  dirname,
  basename,
  extname,
  tmpdir,
}

/** Kept for the one caller that wrote through a raw fd. */
export { closeSync, openSync, writeSync }
