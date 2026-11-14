import { expect, test } from '@playwright/test'
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
test('what does an undefined getAiSettings do to the panel', async ({ page }) => {
  const errs = []
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)))
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' })
  await page.waitForTimeout(3500)

  const st = await page.evaluate(async () => {
    const api = window.desktop
    const settings = await api.getAiSettings()
    return {
      settingsValue: String(settings),
      isUndefined: settings === undefined,
    }
  })
  // 打开 AI 面板看看是否报错
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /AI|助手/.test(b.textContent || '') || /ai/i.test(b.className))
    btn?.click()
  })
  await page.waitForTimeout(1500)
  const after = await page.evaluate(() => ({ bodyLen: document.body.innerText.length, hasUndefined: /undefined/.test(document.body.innerText) }))
  console.log('AISET:' + JSON.stringify({ st, after, errs: errs.slice(0, 3) }))
})
