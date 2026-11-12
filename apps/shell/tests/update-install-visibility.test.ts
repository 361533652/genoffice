import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * How an update gets installed, which the user has to be able to see.
 *
 * Two settings used to make installation invisible: `quitAndInstall(true, …)`
 * ran the installer silently, and `autoInstallOnAppQuit = true` ran it while
 * the app was closing. Combined with the NSIS uninstall-then-extract flow
 * (~160 MB, a couple of minutes) that reads as "the app uninstalled itself".
 * The assertions below pin the visible hand-off in place.
 */
const updaterSrc = readFileSync(resolve(import.meta.dirname, '../src/main/updater.ts'), 'utf8')

describe('installing an update is visible to the user', () => {
  it('never launches the installer silently', () => {
    expect(updaterSrc).not.toMatch(/quitAndInstall\(\s*true/)
  })

  it('asks for the installer’s own window instead', () => {
    expect(updaterSrc).toMatch(/quitAndInstall\(\s*false\s*,\s*true\s*\)/)
  })

  it('never installs behind the user’s back when the app quits', () => {
    // the only acceptable value is the explicit `false`
    expect(updaterSrc).not.toMatch(/autoInstallOnAppQuit\s*=\s*true/)
    expect(updaterSrc).toMatch(/autoInstallOnAppQuit\s*=\s*false/)
  })

  it('explains the hand-off in the dialog, in every locale', () => {
    const hints = updaterSrc.match(/updInstallHint:/g) ?? []
    // one per locale entry in the tUpd table
    expect(hints.length).toBe(22)
  })
})

describe('the update dialog shows the hand-off note', () => {
  const html = readFileSync(resolve(import.meta.dirname, '../src/renderer/update.html'), 'utf8')
  const script = readFileSync(resolve(import.meta.dirname, '../src/renderer/src/update.ts'), 'utf8')

  it('reserves a slot for it in the card', () => {
    expect(html).toContain('id="install-hint"')
  })

  it('only reveals it once the download is ready to install', () => {
    expect(script).toContain('installHint.textContent = s.installHint')
    // the note must not leak into other phases
    expect(script).toContain("installHint.classList.remove('visible')")
  })

  it('styles it as secondary text, not an action', () => {
    expect(html).toContain('#install-hint')
    expect(html).toMatch(/#install-hint\s*\{[^}]*display:\s*none/s)
  })
})
