import { expect, test } from '@playwright/test'

/**
 * Chinese IME composition inside the editor.
 *
 * Typing 你好 with a pinyin IME is not one input event: the IME inserts "nihao" as
 * a *composition*, shows candidates, and only commits on compositionend. An editor
 * that treats composition text as ordinary input writes the pinyin into the
 * document, or puts one undo entry per keystroke into the history.
 *
 * The earlier touch spec proved a character can reach the document; this checks
 * what happens *during* composition, which is the part that breaks for CJK users.
 * Composition is driven through CDP's Input.imeSetComposition — real keydown
 * synthesis would not exercise this path.
 *
 * A correction, since it cost a run: my first version of the undo test typed into
 * an empty document and expected the first word to survive one undo. It does not,
 * and should not — undoing back to an empty document is correct. Measured on a
 * document with existing text, undo steps cleanly one commit at a time
 * (AAABBBCCC -> AAABBB -> AAA -> empty), so the granularity is fine and the
 * assertion was wrong.
 */

const DOCS_URL = process.env.MOBILE_DOCS_URL ?? 'http://127.0.0.1:5199'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

async function caretIntoEditor(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(DOCS_URL, { waitUntil: 'load' })
  await expect(page.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 })
  await page.locator('.ProseMirror').click()
  await page.waitForTimeout(300)
}

const textOf = (page: import('@playwright/test').Page): Promise<string> =>
  page.evaluate(() => document.querySelector('.ProseMirror')?.textContent ?? '')

test.describe('IME composition', () => {
  test('pinyin candidates never reach the document', async ({ page }) => {
    await caretIntoEditor(page)
    const cdp = await page.context().newCDPSession(page)

    await cdp.send('Input.imeSetComposition', { text: 'nihao', selectionStart: 5, selectionEnd: 5 })
    await page.waitForTimeout(120)
    const during = await textOf(page)

    await cdp.send('Input.insertText', { text: '你好' })
    await page.waitForTimeout(120)
    await cdp.send('Input.imeSetComposition', { text: 'shijie', selectionStart: 6, selectionEnd: 6 })
    await page.waitForTimeout(120)
    await cdp.send('Input.insertText', { text: '世界' })
    await page.waitForTimeout(400)

    const final = await textOf(page)
    test.info().annotations.push({ type: 'ime', description: 'during="' + during + '" final="' + final + '"' })

    // the composed characters are committed
    expect(final, 'the composed characters are in the document').toContain('你好世界')
    // and no pinyin survives — the defect that makes CJK typing unusable
    expect(final.toLowerCase(), 'pinyin leaked into the document').not.toContain('nihao')
    expect(final.toLowerCase(), 'pinyin leaked into the document').not.toContain('shijie')
  })

  test('one committed word is one undo step', async ({ page }) => {
    await caretIntoEditor(page)
    const cdp = await page.context().newCDPSession(page)

    // Baseline text, so an undo has somewhere to land other than "empty". Without
    // this the assertion is untestable: undoing everything on a blank document is
    // the correct behaviour, not a bug.
    await page.keyboard.type('BASE ')
    await page.waitForTimeout(1_000)
    const withBase = await textOf(page)
    expect(withBase.trim()).toBe('BASE')

    await cdp.send('Input.imeSetComposition', { text: 'nihao', selectionStart: 5, selectionEnd: 5 })
    await page.waitForTimeout(120)
    await cdp.send('Input.insertText', { text: '你好' })
    await page.waitForTimeout(600)
    const afterFirst = await textOf(page)

    await cdp.send('Input.imeSetComposition', { text: 'shijie', selectionStart: 6, selectionEnd: 6 })
    await page.waitForTimeout(120)
    await cdp.send('Input.insertText', { text: '世界' })
    await page.waitForTimeout(600)
    const afterSecond = await textOf(page)

    await page.keyboard.press('Control+z')
    await page.waitForTimeout(600)
    const afterUndo = await textOf(page)

    test.info().annotations.push({
      type: 'undo',
      description: afterFirst + ' | ' + afterSecond + ' | undo -> ' + afterUndo,
    })

    expect(afterFirst, 'first commit landed').toContain('你好')
    expect(afterSecond, 'second commit landed').toContain('世界')
    // one undo removes one commit; the first word and the baseline survive
    expect(afterUndo, 'one undo removed only the second commit').toContain('你好')
    expect(afterUndo, 'the second word was undone').not.toContain('世界')
  })
})
