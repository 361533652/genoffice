
import { describe, expect, it } from 'vitest'
import { BROWSER_HOST_LIMITATIONS } from '../src/limitations.js'

/**
 * The limitation list is a promise to the UI, so it has to stay truthful: each
 * entry must name the capability it refers to and say what is missing in terms a
 * user would recognise, not in internal jargon.
 */
describe('browser host limitations', () => {
  it('names a capability and a user-facing consequence for each entry', () => {
    expect(BROWSER_HOST_LIMITATIONS.length).toBeGreaterThan(0)
    for (const entry of BROWSER_HOST_LIMITATIONS) {
      expect(entry.capability, 'capability').toBeTruthy()
      expect(entry.missing, 'missing').toBeTruthy()
      expect(entry.needs, 'needs').toBeTruthy()
      // the consequence is written for a person, not for a stack trace
      expect(entry.missing).not.toMatch(/undefined|null|NaN/)
    }
  })

  it('does not list the same capability twice', () => {
    const seen = new Set<string>()
    for (const entry of BROWSER_HOST_LIMITATIONS) {
      expect(seen.has(entry.capability), entry.capability).toBe(false)
      seen.add(entry.capability)
    }
  })

  it('calls out the gaps that block the sheets editor, in the order they bite', () => {
    // opening comes first: without a session there is no workbook to show, so
    // saying "it can open but not save" was too generous
    const open = BROWSER_HOST_LIMITATIONS.find((l) => l.capability === 'selectWorkbook')
    const save = BROWSER_HOST_LIMITATIONS.find((l) => l.capability === 'saveWorkbookEdits')
    expect(open, 'opening a workbook').toBeDefined()
    expect(save, 'saving a workbook').toBeDefined()
    expect(open!.needs).toMatch(/session/)
    expect(save!.needs).toMatch(/session/)
    // and the list is ordered so the first blocker is the one a reader hits first
    const order = BROWSER_HOST_LIMITATIONS.map((l) => l.capability)
    expect(order.indexOf('selectWorkbook')).toBeLessThan(order.indexOf('saveWorkbookEdits'))
  })
})
