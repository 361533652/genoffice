import { test } from '@playwright/test'
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
test('probe band children', async ({ page }) => {
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  await page.locator('.ribbon-tabs-collapse-btn').click()
  await page.waitForTimeout(500)
  console.log(
    'DOCS',
    JSON.stringify(
      await page.evaluate(() => {
        const body = document.querySelector('[data-ribbon-body]') as HTMLElement | null
        return body ? [...body.children].map((c) => (c as HTMLElement).className) : null
      }),
    ),
  )
  await page.goto('http://127.0.0.1:5201/', { waitUntil: 'load' })
  await page.waitForTimeout(3000)
  try {
    await page
      .locator('.ribbon-tabs button')
      .filter({ hasText: /开始|Home/ })
      .first()
      .click()
  } catch {}
  await page.waitForTimeout(500)
  console.log(
    'SHEETS',
    JSON.stringify(
      await page.evaluate(() => {
        const body = document.querySelector('[data-ribbon-body]') as HTMLElement | null
        return body ? [...body.children].map((c) => (c as HTMLElement).className) : null
      }),
    ),
  )
})
