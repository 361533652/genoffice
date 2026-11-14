import { expect, test } from '@playwright/test'

/**
 * Dark mode on a phone.
 *
 * Every other spec runs with the default colour scheme, which is light. Phones
 * commonly follow the system setting, and this suite runs in a container where the
 * system scheme is light — so dark mode had never been exercised at all, in an app
 * whose theme tokens were rewritten recently enough to have their own CI check.
 *
 * What can go wrong is specific and visible: a surface left on a hardcoded white,
 * text that keeps its dark ink on a dark page, a border that disappears. The
 * assertion here is coarse on purpose — the page must actually change, and its
 * text must remain readable against its background.
 *
 * Verified the check can fail before trusting it to pass: injecting
 * `body { background: #fff }` in dark mode gives luminance 1.0, which trips the
 * dark-background assertion. A test that cannot fail would have reported all six
 * apps as fine regardless.
 */

const APPS = [
  { name: 'docs', port: 5199 },
  { name: 'sheets', port: 5201 },
  { name: 'slides', port: 5202 },
  { name: 'pdf', port: 5203 },
  { name: 'markdown', port: 5204 },
  { name: 'html', port: 5205 },
]

/** Relative luminance of an "rgb(r, g, b)" / "rgba(...)" colour string. */
function luminanceOf(rgb: string): number {
  const m = /rgba?\(([^)]+)\)/.exec(rgb)
  if (!m) return NaN
  const [r, g, b] = m[1].split(',').map((v) => Number(v.trim()) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

for (const app of APPS) {
  test(`${app.name}: renders in dark mode with readable contrast`, async ({ browser }) => {
    // emulate a phone that follows a dark system theme
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      colorScheme: 'dark',
    })
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))

    await page.goto(`http://127.0.0.1:${app.port}/`, { waitUntil: 'load' })
    await page.waitForTimeout(3_000)

    const paint = await page.evaluate(() => {
      const read = (sel: string) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const cs = getComputedStyle(el)
        return { bg: cs.backgroundColor, fg: cs.color }
      }
      return {
        scheme: matchMedia('(prefers-color-scheme: dark)').matches,
        body: read('body'),
        text: (document.body.innerText ?? '').slice(0, 40),
        textLength: document.body.innerText.trim().length,
      }
    })

    // the emulation must reach the page, or the test proves nothing
    expect(paint.scheme, 'prefers-color-scheme did not apply').toBe(true)
    expect(paint.body, 'body has computed styles').not.toBeNull()

    const bg = luminanceOf(paint.body!.bg)
    const fg = luminanceOf(paint.body!.fg)

    // a page still painted light in dark mode is the exact defect this catches
    if (paint.textLength > 20) {
      expect(bg, 'body background is still light in dark mode: ' + paint.body!.bg).toBeLessThan(0.5)
    }

    // and the ink must not be dark-on-dark
    if (!Number.isNaN(bg) && !Number.isNaN(fg)) {
      const ratio = (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)
      expect(ratio, 'text contrast in dark mode: ' + ratio.toFixed(2)).toBeGreaterThan(3)
    }

    expect(errors).toEqual([])
    await context.close()
  })
}
