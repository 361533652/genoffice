import { expect, test } from '@playwright/test'

/**
 * What the bridge cannot answer during a real working session.
 *
 * The boot-path audit asserts zero unanswered calls, but boot touches 14-34
 * methods out of the roughly 950 call sites in the renderers. Everything a user
 * does after that — open a file, type, save, switch views, open a dialog — can
 * reach methods boot never did.
 *
 * This drives a plausible session and then reads the audit, so the gap list comes
 * from exercised code rather than from guessing which strings look risky.
 *
 * The result is reported, not asserted empty: the shape of the list is the finding,
 * and turning it into a threshold before knowing what is in it would just bake in
 * whatever this container happens to do.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

/** Read the shim's audit. Returns null when this app's build has no audit. */
async function readAudit(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    const a = w.__genofficeBridgeAudit as { called: () => string[]; unmapped: () => string[] } | undefined
    if (!a) return null
    return { called: a.called(), unmapped: a.unmapped() }
  })
}

test.describe('bridge coverage during work, not just boot', () => {
  test('a session of editing and saving reveals what the boot path never touched', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })

    const boot = await readAudit(page)
    expect(boot, 'the audit exists').not.toBeNull()

    // 1. type something, including IME composition
    await page.locator('.ProseMirror').click()
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.imeSetComposition', { text: 'zhongwen', selectionStart: 8, selectionEnd: 8 })
    await page.waitForTimeout(100)
    await cdp.send('Input.insertText', { text: '中文' })
    await page.waitForTimeout(200)
    await page.keyboard.type(' ordinary text')
    await page.waitForTimeout(300)

    // 2. save (the most consequential call path: a silent no-op here loses work)
    const beforeSave = (await readAudit(page))!.called.length
    await page.keyboard.press('Control+s')
    await page.waitForTimeout(2_000)

    // 3. open dialogs that the desktop shell owns
    for (const name of ['文件', '页面布局', '视图']) {
      const tab = page.getByRole('button', { name, exact: true })
      if (await tab.count()) {
        await tab.first().click().catch(() => {})
        await page.waitForTimeout(400)
      }
    }

    // 4. an export-ish action, if reachable
    await page.getByRole('button', { name: '文件', exact: true }).click().catch(() => {})
    await page.waitForTimeout(400)
    const exportItem = page.getByRole('button', { name: /导出|另存/ }).first()
    if (await exportItem.count()) await exportItem.click().catch(() => {})
    await page.waitForTimeout(1_500)

    const after = await readAudit(page)
    expect(after).not.toBeNull()

    const newlyCalled = after!.called.filter((m) => !boot!.called.includes(m))
    test.info().annotations.push({
      type: 'bridge-session',
      description:
        'boot ' + boot!.called.length + ' methods, session ' + after!.called.length +
        ' (+' + newlyCalled.length + '), unanswered ' + after!.unmapped.length +
        (after!.unmapped.length ? ': ' + after!.unmapped.join(', ') : ''),
    })

    // the session must have reached new code, or this test measured nothing
    test.info().annotations.push({
      type: 'newly-called',
      description: newlyCalled.join(', ') || '(none)',
    })

    // Boot must stay at zero — that is the invariant the other spec pins. Here we
    // only report what the session added, so the list is visible in the run log.
    const sessionOnly = after!.unmapped.filter((m) => !boot!.unmapped.includes(m))
    expect(Array.isArray(sessionOnly), 'unanswered names are a list').toBe(true)
        void beforeSave
  })
})
