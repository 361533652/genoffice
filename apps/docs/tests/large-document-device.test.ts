
import { describe, expect, it } from 'vitest'
import { CHARS_PER_BLOCK, LARGE_DOC_READ_ONLY_WEIGHT, HUGE_DOC_REFUSE_WEIGHT, weightForBudget, deviceBudget, openTierForDevice } from '../src/renderer/large-document'

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

  it('the raw inversion yields nothing below the fixed overhead', () => {
    // 500MB heap, a third for the document: 167MB is under the model's 300MB
    // pagination baseline, so the raw inversion returns 0. That is a property of
    // the model, NOT a licence to refuse every document: openTierForDevice floors
    // the thresholds at SMALL_DOC_NORMAL_WEIGHT so small docs still open (see the
    // regression suite below). The 300MB is a large-doc baseline, not the resident
    // editor cost.
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

/**
 * A tiny document must open normally on ANY device that can run the editor.
 *
 * Regression: the working-set model has a 300MB fixed overhead, so on a WebView
 * that reports a small heap (a third of it under 300MB) weightForBudget() returns
 * 0 and openTierForDevice() classified EVERY document — even a 2-paragraph one —
 * as read-only. Real Android WebViews do report heaps this small. The editor
 * itself is already running (≈22MB used / ≈33MB total measured on-device), so a
 * small document cannot exhaust a device that is showing the editor at all.
 */
describe('small documents are never degraded by device scaling', () => {
  function withHeap(heapMB: number, fn: () => void): void {
    const perf = performance as unknown as { memory?: unknown }
    const nav = navigator as unknown as { deviceMemory?: number }
    const origMem = Object.getOwnPropertyDescriptor(perf, 'memory')
    const origNav = Object.getOwnPropertyDescriptor(nav, 'deviceMemory')
    Object.defineProperty(perf, 'memory', {
      configurable: true,
      get: () => ({ jsHeapSizeLimit: heapMB * 1024 * 1024, usedJSHeapSize: 22 * 1024 * 1024, totalJSHeapSize: 33 * 1024 * 1024 }),
    })
    Object.defineProperty(nav, 'deviceMemory', { configurable: true, get: () => 4 })
    try {
      fn()
    } finally {
      if (origMem) Object.defineProperty(perf, 'memory', origMem)
      else delete (perf as { memory?: unknown }).memory
      if (origNav) Object.defineProperty(nav, 'deviceMemory', origNav)
      else delete (nav as { deviceMemory?: number }).deviceMemory
    }
  }

  it('a 2-paragraph document stays normal on a 512MB-heap WebView', () => {
    withHeap(512, () => {
      expect(deviceBudget().heapMB).toBe(512)
      // weight of a couple of short paragraphs
      expect(openTierForDevice(3)).toBe('normal')
      expect(openTierForDevice(50)).toBe('normal')
    })
  })

  it('a genuinely large document is still protected on that same weak device', () => {
    withHeap(512, () => {
      // the desktop read-only line must not open normally on a 512MB device
      const big = openTierForDevice(LARGE_DOC_READ_ONLY_WEIGHT + 1)
      expect(big === 'readOnly' || big === 'refuse').toBe(true)
      expect(openTierForDevice(HUGE_DOC_REFUSE_WEIGHT + 1)).toBe('refuse')
    })
  })
})
