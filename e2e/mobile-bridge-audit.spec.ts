import { expect, test } from '@playwright/test'

/**
 * The legacy shim's blind spot, and the audit that makes it visible.
 *
 * ~950 renderer call sites still go through `window.desktop.*`. That is not a
 * defect on mobile: installLegacyDesktopBridge() answers them so the app boots.
 * The real risk is that an unknown method resolves to undefined, and a caller
 * cannot tell "this host has no answer" from "the answer is empty". For a
 * save-shaped call that difference is lost work.
 *
 * The fallback stays — refusing everything would stop the app booting. What
 * changes is that the names which fell through are recorded, so a real device
 * session can be audited afterwards instead of guessed at.
 */

const APPS = [
  { name: 'docs', port: 5199 },
  { name: 'sheets', port: 5201 },
  { name: 'slides', port: 5202 },
  { name: 'pdf', port: 5203 },
  { name: 'markdown', port: 5204 },
  { name: 'html', port: 5205 },
]

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

for (const app of APPS) {
  test(`${app.name}: the bridge records what it could not answer`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(3_000)

    const audit = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>
      const a = w.__genofficeBridgeAudit as
        | { called: () => string[]; unmapped: () => string[] }
        | undefined
      if (!a) return null
      return { called: a.called(), unmapped: a.unmapped() }
    })

    // the audit must exist, or nothing else here means anything
    expect(audit, 'the bridge exposes an audit').not.toBeNull()

    test.info().annotations.push({
      type: 'bridge-audit',
      description:
        audit!.called.length + ' distinct methods called, ' + audit!.unmapped.length + ' unanswered' +
        (audit!.unmapped.length ? ': ' + audit!.unmapped.slice(0, 8).join(', ') : ''),
    })

    // a booted app necessarily exercised the bridge; an empty audit means the
    // recorder is not wired up
    expect(audit!.called.length, 'the app used the bridge during boot').toBeGreaterThan(0)

    // Boot must not leave any call resolving to undefined.
    //
    // Every name here is a method the renderer called and the shim answered with
    // nothing. The shim's fallback exists so an app can boot on a host without a
    // capability, but "no answer" and "the answer is empty" are indistinguishable
    // to the caller, and for a save-shaped call that is lost work. Each entry was
    // given an honest empty answer instead ({} for object reads, [] for lists,
    // false for yes/no probes), so boot is now unambiguous.
    expect(
      audit!.unmapped,
      'bridge methods left unanswered during boot: ' + audit!.unmapped.join(', '),
    ).toEqual([])
  })
}
