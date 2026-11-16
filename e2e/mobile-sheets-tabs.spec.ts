import { expect, test } from '@playwright/test'

/**
 * R1 guard — clicking every sheets ribbon tab must never white-screen the app.
 *
 * The Data tab used to throw `TypeError: Cannot read properties of undefined
 * (reading 'length')` from `queryConnections.length` when the host answered a
 * connection list without the `connections` field: the whole app root unmounted
 * and the workbook view (with unsaved edits) disappeared. The list is now
 * normalized to an array; this spec clicks each tab and asserts the root stays
 * mounted with zero page errors.
 */

const SHEETS_URL = process.env.MOBILE_SHEETS_URL ?? 'http://127.0.0.1:5201'
const PHONE = { width: 390, height: 844 }
const TABS = ['开始', '插入', '页面布局', '公式', '数据', '审阅', '视图']

test.use({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })

test.describe('sheets ribbon tabs never crash', () => {
  test('every tab renders and the app root survives', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(SHEETS_URL, { waitUntil: 'load' })
    await expect(page.locator('.ribbon-tabs').first()).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1_500)

    for (const label of TABS) {
      const clicked = await page.evaluate((tab) => {
        const button = Array.from(document.querySelectorAll('.ribbon-tabs button')).find(
          (b) => (b.textContent || '').trim() === tab,
        ) as HTMLElement | undefined
        if (!button) return false
        button.click()
        return true
      }, label)
      expect(clicked, `tab "${label}" exists`).toBe(true)
      await page.waitForTimeout(250)

      const state = await page.evaluate(() => ({
        rootChildren: document.getElementById('root')?.children.length ?? -1,
        ribbonButtons: document.querySelectorAll('.ribbon-body button, .ribbon button').length,
      }))
      expect(state.rootChildren, `root mounted after "${label}"`).toBeGreaterThan(0)
      expect(state.ribbonButtons, `ribbon rendered after "${label}"`).toBeGreaterThan(0)
    }

    // the Data tab specifically: click it once more (the loop ended on 视图) and
    // assert its own controls paint, not just the band
    const clickedData = await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('.ribbon-tabs button')).find(
        (b) => (b.textContent || '').trim() === '数据',
      ) as HTMLElement | undefined
      if (!button) return false
      button.click()
      return true
    })
    expect(clickedData).toBe(true)
    await page.waitForTimeout(400)
    const dataControls = await page.evaluate(() => {
      const body = document.body.innerText
      return ['数据透视表', '合并工作簿', '查询和连接', '删除重复值'].filter((s) => body.includes(s)).length
    })
    expect(dataControls).toBeGreaterThanOrEqual(3)
    expect(errors, 'no page errors across every tab').toEqual([])
  })
})