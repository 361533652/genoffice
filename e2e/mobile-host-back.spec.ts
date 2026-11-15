import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * R2 guard — the native-BACK contract of the Android host injection.
 *
 * `MainActivity` routes BACK through `window.__genofficeHandleBack` before it
 * navigates. The contract, exercised here against the real asset file:
 *  1. with nothing open, BACK is NOT consumed (native then leaves the editor);
 *  2. with a focused input/editable, the first BACK blurs it and is consumed
 *     (this is the press the WebView input connection used to swallow);
 *  3. with a dialog/panel open, BACK is consumed AND closes it — drawers
 *     dismiss through their scrim, panes through their own close button, and
 *     Escape-driven panels receive a synthetic Escape inside the panel;
 *  4. the round-1 overlays (pdf thumb drawer, slides rail, docs panes, AI dock)
 *     are in the selector, so BACK no longer jumps straight home leaving them
 *     open behind a hidden WebView.
 */

const HOST_JS = readFileSync(
  join(process.cwd(), 'apps', 'mobile', 'app', 'src', 'main', 'assets', 'host', 'genoffice-host.js'),
  'utf8',
)

async function loadHost(page: import('@playwright/test').Page) {
  await page.setContent('<!doctype html><html><body><div id="app"></div></body></html>')
  // the host is dependency-free at load time; nativeCall is only hit on demand
  await page.evaluate(HOST_JS)
}

test('BACK is not consumed when nothing is open', async ({ page }) => {
  await loadHost(page)
  const handled = await page.evaluate(() => (window as any).__genofficeHandleBack())
  expect(handled).toBe(false)
})

test('BACK blurs a focused input first (the swallowed press)', async ({ page }) => {
  await loadHost(page)
  await page.evaluate(() => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
  })
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('INPUT')

  const handled = await page.evaluate(() => (window as any).__genofficeHandleBack())
  expect(handled, 'the focused-input press is consumed').toBe(true)
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BODY')
})

test('BACK closes an Escape-driven panel (docs ribbon menus)', async ({ page }) => {
  await loadHost(page)
  await page.evaluate(() => {
    const panel = document.createElement('div')
    panel.className = 'file-menu'
    panel.innerHTML = '<button type="button">打开</button>'
    document.body.appendChild(panel)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') panel.remove()
    })
  })
  const handled = await page.evaluate(() => (window as any).__genofficeHandleBack())
  expect(handled, 'panel press consumed').toBe(true)
  expect(await page.evaluate(() => document.querySelector('.file-menu') === null)).toBe(true)
})

test('BACK closes the pdf thumbnail drawer through its scrim', async ({ page }) => {
  await loadHost(page)
  await page.evaluate(() => {
    const drawer = document.createElement('div')
    drawer.className = 'pdf-thumbs-drawer'
    const scrim = document.createElement('div')
    scrim.className = 'pdf-side-scrim'
    scrim.addEventListener('click', () => drawer.remove())
    document.body.appendChild(drawer)
    document.body.appendChild(scrim)
  })
  const handled = await page.evaluate(() => (window as any).__genofficeHandleBack())
  expect(handled, 'drawer press consumed').toBe(true)
  expect(await page.evaluate(() => document.querySelector('.pdf-thumbs-drawer') === null)).toBe(true)
})

test('BACK closes the AI dock through its own close control', async ({ page }) => {
  await loadHost(page)
  await page.evaluate(() => {
    const dock = document.createElement('aside')
    dock.className = 'ai-dock'
    const close = document.createElement('button')
    close.className = 'ai-panel-collapse'
    close.addEventListener('click', () => dock.remove())
    dock.appendChild(close)
    document.body.appendChild(dock)
  })
  const handled = await page.evaluate(() => (window as any).__genofficeHandleBack())
  expect(handled, 'dock press consumed').toBe(true)
  expect(await page.evaluate(() => document.querySelector('.ai-dock') === null)).toBe(true)
})