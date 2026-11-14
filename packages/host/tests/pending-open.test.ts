/**
 * The "open with GenOffice" pending-open pipeline.
 *
 * A native host stages a file (ACTION_VIEW / recent tap) and exposes a one-shot
 * provider; the app consumes it at boot through whichever entry point it uses.
 * These tests lock the contract: consume-once, the per-app return shapes, and
 * that openAnywhere prefers the pending file over any picker.
 */
import { afterEach, describe, expect, test } from 'vitest'
import {
  consumePendingOpenFile,
  hasPendingOpenFile,
  openAnywhere,
  openResultFromPending,
  rawFileFor,
  type PendingOpenFile,
} from '../src/files.js'
import { installLegacyDesktopBridge } from '../src/legacy-desktop-bridge.js'

const g = globalThis as {
  __genofficeConsumePendingOpen?: () => Promise<PendingOpenFile | null>
  __genofficeHasPendingOpen?: () => Promise<boolean>
}

function sample(): PendingOpenFile {
  return {
    name: 'report.docx',
    data: new Uint8Array([1, 2, 3, 4]),
    handleId: 'content://media/external/file/42',
    writable: true,
  }
}

afterEach(() => {
  delete g.__genofficeConsumePendingOpen
  delete g.__genofficeHasPendingOpen
})

describe('pending-open provider', () => {
  test('consumePendingOpenFile returns null without a provider', async () => {
    expect(await consumePendingOpenFile()).toBeNull()
    expect(await hasPendingOpenFile()).toBe(false)
  })

  test('consumePendingOpenFile hands over the staged file', async () => {
    const file = sample()
    g.__genofficeConsumePendingOpen = async () => file
    g.__genofficeHasPendingOpen = async () => true
    expect(await hasPendingOpenFile()).toBe(true)
    const got = await consumePendingOpenFile()
    expect(got?.name).toBe('report.docx')
    expect(got?.handleId).toBe('content://media/external/file/42')
    expect(Array.from(got!.data)).toEqual([1, 2, 3, 4])
  })

  test('a provider that throws is treated as no pending file', async () => {
    g.__genofficeConsumePendingOpen = async () => {
      throw new Error('native gone')
    }
    expect(await consumePendingOpenFile()).toBeNull()
  })
})

describe('openResultFromPending', () => {
  test('a non-writable snapshot registers a readable File', async () => {
    const result = openResultFromPending({ ...sample(), writable: false, handleId: 'host/x/report.docx' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.handle.writable).toBe(false)
      expect(rawFileFor('host/x/report.docx')?.name).toBe('report.docx')
    }
  })

  test('a writable SAF handle is not shadowed by a raw snapshot', () => {
    const result = openResultFromPending(sample())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.handle.writable).toBe(true)
    // writable handles read/write through the native hooks, not a raw File
    expect(rawFileFor(sample().handleId)).toBeNull()
  })
})

describe('openAnywhere prefers the pending file', () => {
  test('consumes the staged file instead of opening a picker', async () => {
    g.__genofficeConsumePendingOpen = async () => sample()
    const result = await openAnywhere('docx')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.handle.id).toBe('content://media/external/file/42')
      expect(Array.from(result.data)).toEqual([1, 2, 3, 4])
    }
  })
})

describe('legacy bridge startup probes consume the pending file', () => {
  function bridge(): Record<string, (...args: unknown[]) => Promise<unknown>> {
    const target: Record<string, unknown> = {}
    installLegacyDesktopBridge(target)
    return target.desktop as Record<string, (...args: unknown[]) => Promise<unknown>>
  }

  test('consumePendingOpenDocx returns the docs shape with a blob dataUrl', async () => {
    g.__genofficeConsumePendingOpen = async () => sample()
    const desktop = bridge()
    const result = (await desktop.consumePendingOpenDocx()) as {
      path: string
      name: string
      dataUrl: string
      hash: string
    }
    expect(result.name).toBe('report.docx')
    expect(result.path).toBe('content://media/external/file/42')
    expect(result.dataUrl.startsWith('blob:')).toBe(true)
    // a readable snapshot is registered for readFile/readFileChunk
    expect(rawFileFor(result.path)?.name).toBe('report.docx')
  })

  test('consumePending returns the handle id for pdf/markdown/html', async () => {
    g.__genofficeConsumePendingOpen = async () => sample()
    const desktop = bridge()
    const handleId = await desktop.consumePending()
    expect(handleId).toBe('content://media/external/file/42')
    expect(rawFileFor(handleId as string)?.name).toBe('report.docx')
  })

  test('consumePendingOpenDocx is null when nothing is staged', async () => {
    const desktop = bridge()
    expect(await desktop.consumePendingOpenDocx()).toBeNull()
    expect(await desktop.consumePending()).toBeNull()
  })
})
