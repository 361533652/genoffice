import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Every write-shaped bridge method, across all six apps, must answer something.
 *
 * The audit that produced this found 86 methods resolving to `undefined` — the
 * editor looked like it accepted an edit (the command "succeeded") while nothing
 * happened. Measured on slides: `addSlide()` resolved and the deck stayed 1/1.
 *
 * The rule now enforced: a name that promises to write either performs, answers
 * a value the caller can act on, or rejects with a reason. Never `undefined`.
 * "Rejects" is a legitimate answer for a desktop-only capability; the entry
 * points here are the actions, and the diagnostics that the app fires without
 * awaiting are implemented as neutral acks instead.
 *
 * The method lists are read from each app's own interface declaration, so adding
 * a method there automatically puts it under this test.
 */

const REPO = process.cwd()

const APPS = [
  { app: 'docs', port: 5199, file: 'apps/docs/src/shared/ipc.ts', iface: 'DesktopApi', global: 'desktop' },
  { app: 'sheets', port: 5201, file: 'apps/sheets/src/shared/desktop-api.ts', iface: 'DesktopApi', global: 'desktopApi' },
  { app: 'slides', port: 5202, file: 'apps/slides/src/shared/ipc.ts', iface: 'SlidesApi', global: 'slidesApi' },
  { app: 'pdf', port: 5203, file: 'apps/pdf/src/shared/ipc.ts', iface: 'PdfApi', global: 'pdfApi' },
  { app: 'markdown', port: 5204, file: 'apps/markdown/src/shared/ipc.ts', iface: 'MarkdownApi', global: 'markdownApi' },
  { app: 'html', port: 5205, file: 'apps/html/src/shared/ipc.ts', iface: 'HtmlApi', global: 'htmlApi' },
]

/** Names that claim to change state. */
const WRITEISH =
  /^(save|write|set|delete|remove|apply|commit|update|put|insert|add|create|rename|convert|export|import|move|copy|replace|discard|reset|clear|print|take|report|respond|signal|crop|split|merge|extract|reduce|sign|ocr|auto|paste|redo|undo)/i

/** Method names declared in an interface. */
function declaredMethods(t: (typeof APPS)[number]): string[] {
  const lines = readFileSync(join(REPO, t.file), 'utf8').split('\n')
  const start = lines.findIndex((l) => l.includes('export interface ' + t.iface))
  if (start < 0) return []
  const names: string[] = []
  let depth = 0
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++
      else if (ch === '}') depth--
    }
    const m = /^\s{2}([a-zA-Z_]\w*)\s*[(:<?]/.exec(lines[i])
    if (m && i > start) names.push(m[1])
    if (depth === 0 && i > start) break
  }
  return names
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

for (const target of APPS) {
  test(`${target.app}: no write-shaped method resolves to nothing`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${target.port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(3_000)

    const candidates = declaredMethods(target).filter((n) => WRITEISH.test(n))
    // a wrong interface path would silently test nothing
    expect(candidates.length, `${target.app} declared methods`).toBeGreaterThan(5)

    const silent = await page.evaluate(
      async ({ ns, names }) => {
        const api = (window as unknown as Record<string, Record<string, () => Promise<unknown>>>)[ns]
        const offenders: string[] = []
        for (const name of names) {
          const fn = api?.[name]
          if (typeof fn !== 'function') continue
          try {
            if ((await fn()) === undefined) offenders.push(name)
          } catch {
            // a rejection is a legitimate answer
          }
        }
        return offenders
      },
      { ns: target.global, names: candidates },
    )

    expect(silent, `${target.app} resolved without saying anything: ${silent.join(', ')}`).toEqual([])
  })
}
