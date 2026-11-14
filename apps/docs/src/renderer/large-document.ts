import type { Block, TableModel } from '@genoffice/docx-engine'

/**
 * Opening tiers by document weight = blocks + characters / CHARS_PER_BLOCK.
 *
 * Measured 2026-09 (Apple silicon, renderer working set after pagination):
 * short synthetic paragraphs 30k blocks / 3 M chars → 1.26 GB, 1945 pages,
 * 17 s; long synthetic paragraphs 10k blocks / 7 M chars → 1.5 GB, 2038
 * pages, 11 s; 20k blocks / 14 M chars → 2.8 GB, 4080 pages, 32 s. That fits
 * about 300 MB + 17 KB per block + 150 B per character, so a block counts as
 * much as ~110 characters and the thresholds are expressed in that unit:
 * 60k short blocks (the earlier read-only line, ~1.1 GB) weigh ~115k.
 * The read-only tier keeps Read Mode's lighter path (the user can leave it);
 * past the refuse line the renderer would go down with the window instead.
 */
export const CHARS_PER_BLOCK = 110
export const LARGE_DOC_READ_ONLY_WEIGHT = 115_000
export const HUGE_DOC_REFUSE_WEIGHT = 230_000
/**
 * Above this the document opens with check-as-you-type spelling off: Chromium
 * re-checks whole paragraphs on every edit, which was 40% of the main-thread
 * time of a paragraph split on a 324-page report (weight ~17k) and nothing
 * measurable on an 81-page one (~4k). Review › Spelling turns it back on.
 */
export const LITE_DOC_WEIGHT = 4_000

export type OpenTier = 'normal' | 'lite' | 'readOnly' | 'refuse'

export function openTierFor(weight: number): OpenTier {
  if (weight > HUGE_DOC_REFUSE_WEIGHT) return 'refuse'
  if (weight > LARGE_DOC_READ_ONLY_WEIGHT) return 'readOnly'
  if (weight > LITE_DOC_WEIGHT) return 'lite'
  return 'normal'
}

export function docWeight(blocks: Block[]): number {
  return blocks.length + Math.round(docTextLength(blocks) / CHARS_PER_BLOCK)
}

/** characters of body text: paragraph runs and table cell text (nested tables included) */
export function docTextLength(blocks: Block[]): number {
  let n = 0
  for (const b of blocks) {
    if (b.runs) for (const r of b.runs) n += r.text.length
    if (b.table) n += tableTextLength(b.table)
  }
  return n
}

function tableTextLength(table: TableModel): number {
  let n = 0
  for (const row of table.rows) {
    for (const cell of row) {
      for (const p of cell.paras) n += p.length
      for (const nested of cell.nestedTables ?? []) n += tableTextLength(nested)
    }
  }
  return n
}
/**
 * Thresholds scaled to the device actually running the editor.
 *
 * The constants above were measured on Apple silicon: the read-only line assumes
 * a ~2.2 GB working set and the refuse line ~4 GB. A phone has a fraction of
 * that, so the fixed numbers would let a document through that the device cannot
 * hold — and the failure mode is not a slow document, it is the renderer being
 * killed.
 *
 * The model from the header is used directly: workingSet ≈ 300MB + 17KB/block +
 * 150B/char. Inverting it for a budget derived from the device gives the weight at
 * which that budget is exhausted.
 */

/** JS heap the renderer may use before the browser reclaims it, in MB. */
export interface DeviceBudget {
  /** usable heap in MB; null when the platform does not report one */
  heapMB: number | null
  /** navigator.deviceMemory in GB, when the platform reports it */
  memoryGB: number | null
  /** true when neither figure is available and the desktop constants apply */
  unknown: boolean
}

/** Read what the platform will say about memory. Never throws. */
export function deviceBudget(): DeviceBudget {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const perf = performance as Performance & {
    memory?: { jsHeapSizeLimit?: number }
  }
  const heapBytes = perf.memory?.jsHeapSizeLimit
  const heapMB = typeof heapBytes === 'number' && heapBytes > 0 ? Math.round(heapBytes / (1024 * 1024)) : null
  const memoryGB = typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : null
  return { heapMB, memoryGB, unknown: heapMB === null && memoryGB === null }
}

/** Weight at which a working set of `budgetMB` is reached, per the header's model. */
export function weightForBudget(budgetMB: number): number {
  // balanced doc: half the weight from blocks, half from characters
  const fixedMB = 300
  const perUnitMB = (0.5 * 17 * 1024) / (1024 * 1024) + (0.5 * CHARS_PER_BLOCK * 150) / (1024 * 1024)
  const available = Math.max(0, budgetMB - fixedMB)
  return Math.round(available / perUnitMB)
}

/**
 * Tiers for this device.
 *
 * A phone is given a smaller share of its heap than a desktop is: the editor is
 * one tab among several and the OS reclaims aggressively, so planning to use the
 * whole heap means being killed near the end of pagination rather than degrading
 * at the start.
 */
export function openTierForDevice(weight: number): OpenTier {
  const budget = deviceBudget()
  if (budget.unknown) return openTierFor(weight)

  // Use a third of the reported heap for the document: the rest is the editor
  // itself, fonts, the images already decoded, and headroom the OS expects.
  const usableMB = budget.heapMB !== null ? budget.heapMB / 3 : (budget.memoryGB ?? 1) * 1024 * 0.25
  const deviceReadOnly = weightForBudget(usableMB)
  const deviceRefuse = weightForBudget(usableMB * 1.8)

  // never allow more than the desktop constants: a device that reports a huge heap
  // still should not open a document known to need 2 GB
  const readOnlyAt = Math.min(LARGE_DOC_READ_ONLY_WEIGHT, deviceReadOnly)
  const refuseAt = Math.min(HUGE_DOC_REFUSE_WEIGHT, deviceRefuse)

  if (weight > refuseAt) return 'refuse'
  if (weight > readOnlyAt) return 'readOnly'
  if (weight > LITE_DOC_WEIGHT) return 'lite'
  return 'normal'
}
