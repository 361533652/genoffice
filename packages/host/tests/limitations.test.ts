
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

  it('calls out the one gap that blocks the sheets editor', () => {
    // saving a workbook needs a host-side session; without it the sheets app can
    // open and edit but cannot write the result back
    const save = BROWSER_HOST_LIMITATIONS.find((l) => l.capability === 'saveWorkbookEdits')
    expect(save).toBeDefined()
    expect(save!.needs).toMatch(/session/)
  })
})
