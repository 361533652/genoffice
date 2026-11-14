
import { describe, expect, it, beforeEach } from 'vitest'
import { installLegacyDesktopBridge } from '../src/index.js'

/**
 * No write-shaped method may resolve to nothing.
 *
 * An audit of all 109 desktop-API methods against the browser shim found 23
 * whose names promise to write something and which resolved to `undefined`.
 * Two distinct harms came out of it:
 *
 *  - the app read `result.ok` and threw a TypeError, so the user saw
 *    "Cannot read properties of undefined" as their save error;
 *  - or the app did not read the result at all, and the operation silently did
 *    nothing while the UI said it had happened.
 *
 * The rule this pins: a write either performs, or answers with a value the
 * caller can act on — or rejects with a reason. Never `undefined`.
 */

const WRITEISH = /^(save|write|set|delete|remove|apply|commit|update|put|insert|add|create|rename|convert|export|import|move|copy|replace|discard|reset|clear|report|respond|signal)/i

/** Methods the shim answers directly (everything else goes through the Proxy). */
const KNOWN = [
  'saveDocx', 'saveDocxNew', 'saveDocxTo', 'saveDocxAs',
  'exportHtml', 'exportMarkdown', 'exportPdf',
  'setDocPassword', 'discardDocPasswordIntents',
  'convertAltChunkHtml', 'writeMergeOutput',
  'respondToZotero', 'reportMcpResult', 'signalMcpReady',
  'reportCloseCheck', 'reportCloseSaveResult', 'reportViewMenuState',
  'focusDocsTab', 'takeExportPdf', 'writeRecoveryCopy',
]

describe('write-shaped bridge methods', () => {
  beforeEach(() => {
    const scope = globalThis as unknown as Record<string, unknown>
    for (const name of ['desktop', 'desktopApi', 'aiOffice', 'pdfApi', 'sheetsApi', 'slidesApi', 'markdownApi', 'htmlApi']) {
      delete scope[name]
    }
  })

  it('answer with something a caller can act on, or reject', async () => {
    installLegacyDesktopBridge()
    const bridge = (globalThis as Record<string, unknown>).desktop as Record<string, (...a: unknown[]) => Promise<unknown>>

    const silent: string[] = []
    for (const name of KNOWN) {
      if (!WRITEISH.test(name)) continue
      const fn = bridge[name]
      if (typeof fn !== 'function') continue
      let settled: unknown
      try {
        settled = await fn()
      } catch {
        continue // a rejection is a fine answer
      }
      if (settled === undefined) silent.push(name)
    }
    // the message names every offender, so a regression lists what to fix
    expect(silent, `these resolved without saying anything: ${silent.join(', ')}`).toEqual([])
  })

  it('report why a save could not happen', async () => {
    installLegacyDesktopBridge()
    const bridge = (globalThis as Record<string, unknown>).desktop as Record<string, () => Promise<{ ok: boolean; error?: string; reason?: string }>>

    const result = await bridge.saveDocx()
    expect(result.ok).toBe(false)
    // a person reads this, so it must be a sentence, not an errno
    expect(result.error).toMatch(/save/i)
  })

  it('never resolve an export as if it had written a file', async () => {
    const stats = installLegacyDesktopBridge()
    const bridge = (globalThis as Record<string, unknown>).desktop as Record<string, () => Promise<{ ok: boolean }>>
    for (const name of ['exportHtml', 'exportMarkdown', 'exportPdf']) {
      const result = await bridge[name]()
      expect(result.ok, name).toBe(false)
    }
    expect(stats).toBeDefined()
  })
})
