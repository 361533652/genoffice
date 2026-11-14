import { test } from '@playwright/test'
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
test('probe long press event count', async ({ page }) => {
  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'load' })
  await page.waitForTimeout(3000)
  await page.evaluate(() => {
    const w = window
    w.__ctx = []
    document.addEventListener('contextmenu', (e) => {
      w.__ctx.push({ x: Math.round(e.clientX ?? -1), y: Math.round(e.clientY ?? -1), t: (e.target?.className || '').toString().slice(0, 30) })
    }, true)
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 420 }] })
  await page.waitForTimeout(900)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(600)
  const ev = await page.evaluate(() => window.__ctx)
  console.log('LP:' + JSON.stringify({ count: ev.length, events: ev.slice(0, 3) }))
})
