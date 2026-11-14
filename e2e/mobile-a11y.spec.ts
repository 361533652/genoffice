import { expect, test } from '@playwright/test'

/**
 * Whether a phone user can tell what the controls do.
 *
 * Every other spec checks that something works; this one checks the interface is
 * *describable*. A toolbar of icon-only buttons with no accessible name is
 * useless with a screen reader, and on a phone that is not a niche audience.
 *
 * Third-party chrome is excluded from the assertion and reported instead. Univer
 * renders the spreadsheet's toolbars inside #univer-container, and its buttons
 * carry no accessible names; that is a real gap but not one this repository can
 * close, and pretending otherwise would leave a permanently red test that
 * everyone learns to ignore.
 */

const APPS = [
  { name: 'docs', port: 5199, thirdParty: null as string | null },
  { name: 'sheets', port: 5201, thirdParty: '#univer-container' },
  { name: 'slides', port: 5202, thirdParty: null },
  { name: 'pdf', port: 5203, thirdParty: null },
  { name: 'markdown', port: 5204, thirdParty: null },
  { name: 'html', port: 5205, thirdParty: null },
]

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

for (const app of APPS) {
  test(`${app.name}: our controls have accessible names`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(3_000)

    const report = await page.evaluate((thirdParty) => {
      const named = (el: Element): boolean => {
        if ((el.textContent ?? '').trim().length > 0) return true
        for (const attr of ['aria-label', 'aria-labelledby', 'title', 'data-tip']) {
          if (el.getAttribute(attr)) return true
        }
        const id = el.getAttribute('id')
        if (id && document.querySelector('label[for="' + id + '"]')) return true
        return false
      }

      const visible = [...document.querySelectorAll('button, [role="button"], input, select, textarea')].filter(
        (el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0
        },
      )

      const ours = thirdParty ? visible.filter((el) => !el.closest(thirdParty)) : visible
      const theirs = thirdParty ? visible.filter((el) => el.closest(thirdParty)) : []

      const describe = (el: Element): string => {
        const r = el.getBoundingClientRect()
        return el.tagName + '.' + String(el.className).slice(0, 22) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)
      }

      return {
        total: ours.length,
        unnamed: ours.filter((el) => !named(el)).map(describe),
        thirdPartyUnnamed: theirs.filter((el) => !named(el)).length,
      }
    }, app.thirdParty)

    // An empty app can legitimately show no controls at all: the PDF viewer's
    // no-file state is one line of text. Asserting a floor there would fail on a
    // correct screen, so the floor only applies when something is rendered.
    const bodyText = await page.evaluate(() => document.body.innerText.trim().length)
    if (bodyText > 20) {
      expect(report.total, 'a rendered screen with no controls at all').toBeGreaterThan(0)
    }
    expect(report.unnamed, `${app.name} unnamed controls: ${report.unnamed.join(', ')}`).toEqual([])

    if (app.thirdParty) {
      // recorded so the gap is visible without failing the build for something
      // this repo cannot fix
      test.info().annotations.push({
        type: 'third-party-a11y',
        description: report.thirdPartyUnnamed + ' unnamed controls inside ' + app.thirdParty,
      })
    }
  })
}
