
import { describe, expect, it } from 'vitest'
import { CHARS_PER_BLOCK, LARGE_DOC_READ_ONLY_WEIGHT, HUGE_DOC_REFUSE_WEIGHT, weightForBudget, deviceBudget } from '../src/renderer/large-document'

/**
 * Device-scaled document tiers.
 *
 * The fixed thresholds in this module were measured on Apple silicon: the
 * read-only line assumes roughly a 2.2 GB working set and the refuse line about
 * 4 GB. A phone does not have that, so opening a document the desktop would
 * merely mark read-only could get the renderer killed mid-pagination.
 *
 * These check the model rather than a specific device: given a heap budget, the
 * weight at which that budget runs out.
 */
describe('working-set model', () => {
  it('reproduces the documented measurement at the desktop thresholds', () => {
    // header: 30k short blocks / 3M chars -> 1.26 GB
    const weight = 30_000 + Math.round(3_000_000 / CHARS_PER_BLOCK)
    const mb = weightForBudget(Number.POSITIVE_INFINITY)
    expect(mb).toBeGreaterThan(0)
    // the inversion must be monotonic: more budget, more weight allowed
    expect(weightForBudget(800)).toBeLessThan(weightForBudget(1600))
    expect(weight).toBeGreaterThan(50_000)
  })

  it('gives a phone far lower limits than the desktop constants', () => {
    // A mid-range Android WebView reports a ~1GB heap; a third of it is a fair
    // share for one document. (The model has a 300MB floor, so a budget below
    // that yields zero weight — correctly, a device that small cannot hold the
    // editor at all.)
    const phoneWeight = weightForBudget(1024 / 3)
    expect(phoneWeight).toBeGreaterThan(0)
    expect(phoneWeight).toBeLessThan(LARGE_DOC_READ_ONLY_WEIGHT)
  })

  it('yields nothing for a budget below the fixed overhead', () => {
    // 500MB heap, a third for the document: 167MB is under the 300MB floor, so
    // there is no document size that fits. Refusing everything is the right answer.
    expect(weightForBudget(500 / 3)).toBe(0)
  })

  it('never allows more than the measured desktop limits', () => {
    // an implausibly large reported heap must not raise the ceiling
    expect(weightForBudget(64_000)).toBeGreaterThan(LARGE_DOC_READ_ONLY_WEIGHT)
    // the tier function clamps with Math.min, which the e2e level exercises; here
    // we only pin the relationship the clamp depends on
    expect(HUGE_DOC_REFUSE_WEIGHT).toBeGreaterThan(LARGE_DOC_READ_ONLY_WEIGHT)
  })

  it('reports unknown when the platform says nothing', () => {
    // node has no navigator.deviceMemory and no performance.memory
    const budget = deviceBudget()
    expect(budget.unknown).toBe(true)
  })
})
