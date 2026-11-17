import { expect, test } from '@playwright/test'

/**
 * P0-3 — the sheets tool band must stay horizontally scrollable on a phone.
 *
 * Regression guard for the mobile.css clip bug: `.ribbon` IS the scroll
 * container in sheets (overflow-x: scroll), and a shared `overflow-x: clip`
 * rule froze 79% of the tools off-screen — scrollLeft writes read back 0. This
 * spec asserts the band scrolls, the last group is reachable, and the document
 * itself never grows past the device width.
 */

const SHEETS_URL = process.env.MOBILE_SHEETS_URL ?? 'http://127.0.0.1:5201'
const PHONE = { width: 390, height: 844 }

test.use({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

/** A phone starts with the command band collapsed; this spec is about the band. */
async function expandBand(page: import('@playwright/test').Page): Promise<void> {
  if (!(await page.locator('.ribbon').first().isVisible())) {
    await page
      .locator('.ribbon-tabs button')
      .filter({ hasText: /开始|Home/ })
      .first()
      .click()
    await expect(page.locator('.ribbon').first()).toBeVisible({ timeout: 15_000 })
  }
  // a phone band shows only the first two groups; this spec measures the FULL
  // band's reachability, so reveal every group first
  const more = page.locator('.ribbon-more-btn')
  if (await more.isVisible().catch(() => false)) await more.click()
  await expect(page.locator('.ribbon-group').last()).toBeVisible({ timeout: 10_000 })
}

test.describe('sheets ribbon reach on a portrait phone', () => {
  test('the band scrolls and the last group is reachable', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(SHEETS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ribbon-tabs').first()).toBeVisible({ timeout: 30_000 })
    await expandBand(page)
    await page.waitForTimeout(1_000)

    const metrics = await page.evaluate(() => {
      const ribbon = document.querySelector('.ribbon') as HTMLElement | null
      if (!ribbon) return null
      const overflowX = getComputedStyle(ribbon).overflowX
      // a write must survive: clip would snap it back to 0
      ribbon.scrollLeft = 500
      const readBack = ribbon.scrollLeft
      const maxScroll = ribbon.scrollWidth - ribbon.clientWidth
      // park at the far right so the last group is on screen
      ribbon.scrollLeft = maxScroll
      const groups = ribbon.querySelectorAll('.ribbon-group')
      const last = groups[groups.length - 1] as HTMLElement | undefined
      const lastRect = last ? last.getBoundingClientRect() : null
      return {
        overflowX,
        readBack,
        scrollWidth: ribbon.scrollWidth,
        clientWidth: ribbon.clientWidth,
        maxScroll,
        lastRight: lastRect ? lastRect.right : null,
        lastLeft: lastRect ? lastRect.left : null,
        vw: window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth,
      }
    })

    expect(metrics).not.toBeNull()
    // a phone band WRAPS its groups: everything fits without a sideways scroll
    // (the old guard asserted scrollLeft survived a write, from the era when the
    // band was a horizontal scroller — the user asked us to remove that drag)
    expect(metrics!.overflowX, 'band no longer scrolls sideways').toBe('hidden')
    expect(metrics!.scrollWidth, 'no horizontal overflow to hide tools').toBeLessThanOrEqual(
      metrics!.clientWidth + 4,
    )
    expect(metrics!.lastRight, 'last group right edge').toBeLessThanOrEqual(metrics!.vw + 1)
    // the document never grows past the device width
    expect(metrics!.docScrollWidth, 'document scroll width').toBeLessThanOrEqual(PHONE.width)
    expect(errors).toEqual([])
  })

  test('a far-right tool button can be scrolled into view and clicked', async ({ page }) => {
    await page.goto(SHEETS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ribbon-tabs').first()).toBeVisible({ timeout: 30_000 })
    await expandBand(page)
    await page.waitForTimeout(1_000)

    // the last group's first button: scroll it into view within the band, then
    // confirm it is hit-testable at its own coordinates (not clipped away)
    const hit = await page.evaluate(() => {
      const ribbon = document.querySelector('.ribbon') as HTMLElement | null
      if (!ribbon) return null
      const groups = ribbon.querySelectorAll('.ribbon-group')
      const last = groups[groups.length - 1] as HTMLElement | undefined
      const btn = last?.querySelector('button') as HTMLElement | undefined
      if (!btn) return null
      btn.scrollIntoView({ inline: 'center', block: 'nearest' })
      const r = btn.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const top = document.elementFromPoint(cx, cy)
      return {
        reachable: r.right <= window.innerWidth + 1 && r.left >= -1 && r.width > 0,
        hitSelf: !!top && (top === btn || btn.contains(top)),
      }
    })
    expect(hit).not.toBeNull()
    expect(hit!.reachable, 'last-group button scrolled into view').toBe(true)
    expect(hit!.hitSelf, 'last-group button hit-testable').toBe(true)
  })
})
