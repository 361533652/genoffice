/**
 * The deck session host: desktop `slides-main.ts` session semantics on a
 * mobile host, backed by the pure-TS pptx engine stack.
 *
 * Unlike sheets (which needed the Rust sidecar compiled to wasm), slides is
 * portable as-is: pptx-engine (parse/save/edit primitives), pptx-ops (the
 * runTxn transaction executor with 70 registered ops) and pptx-render (the
 * RenderSlide builder) have no Node dependencies. This module ports the main
 * process's session orchestration:
 *
 *  - open / newBlank: openPptx(bytes) → session → RenderSlide[]
 *  - edits: the same op shims the desktop handlers use (setText, setFont,
 *    addElement, slide ops…), run through runTxn with snapshot undo/redo
 *  - save: savePptx(opened) → bytes → the host's FileHost, then commitSaved
 *  - media: archive bytes become blob: URLs (the desktop uses a custom
 *    Electron protocol; a WebView cannot register one)
 *
 * v1 degradations (documented, honest):
 *  - font metrics use pptx-render's deterministic HeuristicMetrics instead of
 *    the desktop's system-font scan (no font enumeration in a WebView); a
 *    canvas-measurement provider is the next step
 *  - TIFF decode / JPEG orientation / SVG theme retint are display-only
 *    conversions the desktop applies; v1 serves the raw bytes
 *  - single tab: no cross-window deck broadcast, no slide clipboard sharing
 */
import type { FileHandle, FileHost } from '@genoffice/host-contract'
import {
  commitSaved,
  createBlankPptx,
  findGroupChild,
  materializeSlide,
  openPptx,
  parseTheme,
  patchBodyPrAutofit,
  savePptx,
  setSlideSize,
  slideDurableId,
  type OpenedPptx,
  type Slide,
  type TextElement,
} from '@genoffice/pptx-engine'
import { matchesElementRef } from '@genoffice/pptx-engine/identity'
import {
  resolveGroupChildId,
  runTxn,
  type Op,
  type OpRecord,
  type TxnRequest,
  type TxnResult,
} from '@genoffice/pptx-ops'
import {
  buildRenderSlide,
  layoutText,
  makeViewport,
  HeuristicMetrics,
  EMU_PER_PX_96,
  type FontMetricsProvider,
  type RenderSlide,
  type RenderTextLayout,
} from '@genoffice/pptx-render'

const MAX_HISTORY = 50

interface HistorySnapshot {
  slides: Slide[]
  entries: Map<string, Uint8Array>
  size: { cx: number; cy: number }
  metaDirty: boolean
}

export interface DeckSession {
  /** null = an unsaved new deck (the desktop's path: '') */
  handle: FileHandle | null
  opened: OpenedPptx
  fitWidthPx: number
  undoStack: HistorySnapshot[]
  redoStack: HistorySnapshot[]
  metaDirty: boolean
  transformPreview?: boolean
  previewRedo?: HistorySnapshot[]
}

/** What the renderer's open/newBlank/save paths consume (desktop OpenResult). */
export interface DeckOpenResult {
  path: string
  slides: RenderSlide[]
  size: { cx: number; cy: number }
  defaultFont?: string | undefined
}

export interface DeckSaveResult {
  ok: boolean
  path?: string
  slides?: RenderSlide[]
  error?: string
}

type HistoryListener = (state: { canUndo: boolean; canRedo: boolean }) => void

// ── media: archive bytes → blob URLs ─────────────────────────────────────

const byteIds = new WeakMap<Uint8Array, number>()
let nextByteId = 1
function byteVersion(bytes: Uint8Array | null | undefined): number {
  if (!bytes) return 0
  let id = byteIds.get(bytes)
  if (id === undefined) {
    id = nextByteId++
    byteIds.set(bytes, id)
  }
  return id
}

/** Magic-byte sniff with an extension fallback (the desktop's displayMime subset). */
export function sniffMediaMime(ref: string, bytes: Uint8Array): string {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return 'image/bmp'
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 256)).trimStart()
  if (head.startsWith('<svg') || head.startsWith('<?xml') && head.includes('<svg')) return 'image/svg+xml'
  const ext = ref.slice(ref.lastIndexOf('.') + 1).toLowerCase()
  const byExt: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', tif: 'image/tiff',
    tiff: 'image/tiff', emf: 'image/emf', wmf: 'image/wmf', mp4: 'video/mp4',
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
  }
  return byExt[ext] ?? 'application/octet-stream'
}

// ── the host ──────────────────────────────────────────────────────────────

export class DeckSessionHost {
  private session: DeckSession | null = null
  private readonly historyListeners = new Set<HistoryListener>()
  private readonly mediaUrls = new Map<string, string>()

  constructor(
    private readonly files: FileHost,
    /** optional override; v1 default is pptx-render's HeuristicMetrics */
    metrics?: FontMetricsProvider,
  ) {
    this.metrics = metrics ?? new HeuristicMetrics()
  }

  private readonly metrics: FontMetricsProvider

  // ---- session lifecycle ---------------------------------------------------

  async newBlank(fitWidthPx: number, size?: { cx?: unknown; cy?: unknown }): Promise<DeckOpenResult> {
    const opened = await openPptx(await createBlankPptx())
    const side = (v: unknown): v is number =>
      typeof v === 'number' && Number.isInteger(v) && v >= 914400 && v <= 51206400
    if (size && side(size.cx) && side(size.cy)) setSlideSize(opened, size.cx, size.cy)
    this.session = { handle: null, opened, fitWidthPx, undoStack: [], redoStack: [], metaDirty: false }
    this.notifyHistory()
    return this.openResult()
  }

  /** openPptx(fitWidthPx): pick a deck through the host and open a session. */
  async open(fitWidthPx: number): Promise<DeckOpenResult | null> {
    const picked = await this.files.open('pptx')
    if (!picked.ok) return null
    return this.openBytes(picked.data, picked.handle, fitWidthPx)
  }

  async openBytes(bytes: Uint8Array, handle: FileHandle | null, fitWidthPx: number): Promise<DeckOpenResult> {
    this.releaseMedia()
    const opened = await openPptx(bytes)
    this.session = { handle, opened, fitWidthPx, undoStack: [], redoStack: [], metaDirty: false }
    this.notifyHistory()
    return this.openResult()
  }

  private requireSession(): DeckSession {
    if (!this.session) throw new Error('no deck open')
    return this.session
  }

  private openResult(): DeckOpenResult {
    const s = this.requireSession()
    return {
      path: s.handle?.id ?? '',
      slides: this.buildAllRenderSlides(),
      size: { cx: s.opened.deck.size.cx, cy: s.opened.deck.size.cy },
      defaultFont: this.deckDefaultFont(),
    }
  }

  private deckDefaultFont(): string | undefined {
    try {
      const opened = this.requireSession().opened
      const slidePath = opened.archive.readPresentation().slidePaths[0]
      if (!slidePath) return undefined
      const themePath = opened.archive.resolveSlideChain(slidePath).themePath
      const xml = themePath ? opened.archive.readText(themePath) : undefined
      return xml ? parseTheme(xml).minorFont : undefined
    } catch {
      return undefined
    }
  }

  // ---- save ----------------------------------------------------------------

  async save(): Promise<DeckSaveResult> {
    const s = this.session
    if (!s) return { ok: false, error: 'no file open' }
    try {
      const bytes = await savePptx(s.opened)
      let handle = s.handle
      if (!handle || handle.writable === false) {
        // unsaved new deck, or a read-only handle: the host picks a destination
        const name = handle?.name ?? 'presentation.pptx'
        const saved = await this.files.saveAs(bytes, name)
        if (!saved.ok) return { ok: false }
        handle = saved.handle
      } else {
        const written = await this.files.saveInPlace(handle, bytes)
        if (!written.ok) {
          const saved = await this.files.saveAs(bytes, handle.name)
          if (!saved.ok) return { ok: false }
          handle = saved.handle
        }
      }
      s.handle = handle
      commitSaved(s.opened)
      s.metaDirty = false
      return { ok: true, path: handle.id, slides: this.buildAllRenderSlides() }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  async saveAs(defaultName?: string): Promise<DeckSaveResult> {
    const s = this.session
    if (!s) return { ok: false, error: 'no file open' }
    try {
      const bytes = await savePptx(s.opened)
      const name = defaultName || s.handle?.name || 'presentation.pptx'
      const saved = await this.files.saveAs(bytes, name)
      if (!saved.ok) return { ok: false }
      s.handle = saved.handle
      commitSaved(s.opened)
      s.metaDirty = false
      return { ok: true, path: saved.handle.id, slides: this.buildAllRenderSlides() }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }

  // ---- history ---------------------------------------------------------------

  onHistoryChanged(listener: HistoryListener): () => void {
    this.historyListeners.add(listener)
    return () => this.historyListeners.delete(listener)
  }

  private notifyHistory(): void {
    const s = this.session
    const state = { canUndo: (s?.undoStack.length ?? 0) > 0, canRedo: (s?.redoStack.length ?? 0) > 0 }
    for (const listener of this.historyListeners) listener(state)
  }

  private takeSnapshot(): HistorySnapshot {
    const s = this.requireSession()
    return {
      slides: structuredClone(s.opened.deck.slides),
      entries: new Map(s.opened.archive.entries),
      size: { ...s.opened.deck.size },
      metaDirty: s.metaDirty,
    }
  }

  private restoreSnapshot(snap: HistorySnapshot): void {
    const s = this.requireSession()
    const fresh = {
      slides: structuredClone(snap.slides),
      entries: new Map(snap.entries),
      size: { ...snap.size },
      metaDirty: snap.metaDirty,
    }
    s.opened.deck.slides = fresh.slides
    s.opened.deck.size = fresh.size
    s.metaDirty = fresh.metaDirty
    const entries = s.opened.archive.entries
    entries.clear()
    for (const [k, v] of fresh.entries) entries.set(k, v)
  }

  pushHistory(): void {
    const s = this.requireSession()
    s.undoStack.push(this.takeSnapshot())
    while (s.undoStack.length > MAX_HISTORY) s.undoStack.shift()
    s.redoStack = []
    this.notifyHistory()
  }

  undo(): RenderSlide[] | null {
    const s = this.session
    if (!s || s.undoStack.length === 0) return null
    s.redoStack.push(this.takeSnapshot())
    this.restoreSnapshot(s.undoStack.pop()!)
    this.notifyHistory()
    return this.buildAllRenderSlides()
  }

  redo(): RenderSlide[] | null {
    const s = this.session
    if (!s || s.redoStack.length === 0) return null
    s.undoStack.push(this.takeSnapshot())
    this.restoreSnapshot(s.redoStack.pop()!)
    this.notifyHistory()
    return this.buildAllRenderSlides()
  }

  isDirty(): boolean {
    const s = this.session
    if (!s) return false
    return (
      s.metaDirty ||
      s.opened.deck.slides.some(
        (slide) => slide.structureDirty || slide.elements.some((el) => el.dirty || el.dirtyTransform),
      )
    )
  }

  markMetaDirty(): void {
    const s = this.requireSession()
    s.metaDirty = true
  }

  /** Drop the just-pushed snapshot after a failed/no-op edit (desktop parity:
   *  the state never changed, so this is NOT an undo — no redo entry). */
  popHistory(): void {
    const s = this.requireSession()
    s.undoStack.pop()
    this.notifyHistory()
  }

  /** Swap the deck model (applyTheme reparses in place). */
  replaceOpened(opened: OpenedPptx): void {
    const s = this.requireSession()
    s.opened = opened
  }

  // ---- transactions -----------------------------------------------------------

  /** sessionTxn: plan first, push history only when the plan can apply. */
  tx(req: TxnRequest): TxnResult | null {
    const s = this.requireSession()
    const plan = runTxn(s.opened, { ...req, dryRun: true })
    const invalid = plan.failures?.length ?? 0
    if ((req.isolation ?? 'atomic') === 'atomic' ? invalid > 0 : invalid >= req.ops.length) return null
    this.pushHistory()
    const r = runTxn(s.opened, req)
    if (!r.applied) {
      s.undoStack.pop()
      this.notifyHistory()
      return null
    }
    return r
  }

  /** applySessionTxn: the AI/batch surface, with the autofit render post-pass. */
  applyTxn(req: { ops?: unknown; isolation?: string; dryRun?: boolean }): unknown {
    const s = this.session
    if (!s) return null
    const ops = Array.isArray(req?.ops) ? (req.ops as Op[]) : []
    if (ops.length === 0 || ops.length > 50) {
      return {
        applied: false,
        failures: [{ index: 0, error: 'ops must be a non-empty array (at most 50 per transaction).' }],
      }
    }
    const isolation = req.isolation === 'per_op' ? ('per_op' as const) : ('atomic' as const)
    const compact = (fails?: Array<{ index: number; error: string }>) =>
      fails?.map((f) => ({ index: f.index, error: f.error }))
    if (req.dryRun) {
      const r = runTxn(s.opened, { ops, isolation, dryRun: true })
      return {
        applied: false,
        dryRun: true,
        plan: r.plan ?? [],
        ...(r.failures?.length ? { failures: compact(r.failures) } : {}),
      }
    }
    const plan = runTxn(s.opened, { ops, isolation, dryRun: true })
    const invalid = plan.failures?.length ?? 0
    if (isolation === 'atomic' ? invalid > 0 : invalid >= ops.length) {
      return { applied: false, failures: compact(plan.failures) }
    }
    this.pushHistory()
    const r = runTxn(s.opened, { ops, isolation })
    if (!r.applied) {
      s.undoStack.pop()
      this.notifyHistory()
      return { applied: false, failures: compact(r.failures) }
    }
    this.markMetaDirty()
    // autofit post-pass (mirrors the desktop): text ops resize/refit, XML-patching
    // ops reparse. Slides re-found by durable id (numeric indexes drift).
    const slideIdxOf = (rec: OpRecord): number => {
      if (rec.slideId) return s.opened.deck.slides.findIndex((sl) => slideDurableId(sl) === rec.slideId)
      return -1
    }
    const renderedByIdx = new Map<number, RenderSlide | null>()
    for (const rec of r.records ?? []) {
      const o = rec.op
      const idx = slideIdxOf(rec)
      if (idx < 0) continue
      if (o.op === 'setTableStyle' || o.op === 'setChart') {
        this.rebuildSlideWithReparse(idx)
        renderedByIdx.delete(idx)
        continue
      }
      const id = o.target?.el
      if (!id || o.group) continue
      if (o.op !== 'setText' && o.op !== 'setFont' && o.op !== 'setParagraphFormat') continue
      if (o.op === 'setText' && (rec.after as { levelDirty?: boolean } | undefined)?.levelDirty) continue
      if (o.op === 'setParagraphFormat' && (o.format as { indentDelta?: number } | undefined)?.indentDelta) {
        materializeSlide(s.opened, idx)
        renderedByIdx.delete(idx)
        continue
      }
      let rendered = renderedByIdx.has(idx) ? renderedByIdx.get(idx)! : this.rebuildSlide(idx)
      rendered = this.applyAutofitResize(idx, id, rendered)
      rendered = this.syncAutofitScale(idx, id, rendered)
      renderedByIdx.set(idx, rendered)
    }
    return {
      applied: true,
      records: (r.records ?? []).map((rec) => ({
        op: rec.op.op,
        ...(rec.op.target
          ? { target: `${rec.op.target.slide}${rec.op.target.el ? `/${rec.op.target.el}` : ''}` }
          : {}),
        ...(rec.created ? { created: rec.created } : {}),
        ...((rec.after as { note?: string } | undefined)?.note
          ? { note: (rec.after as { note?: string }).note }
          : {}),
      })),
      ...(r.failures?.length ? { failures: compact(r.failures) } : {}),
      slides: this.buildAllRenderSlides(),
    }
  }

  // ---- rendering ----------------------------------------------------------------

  private makeMediaResolver(opened: OpenedPptx): (mediaRef: string) => string | undefined {
    return (mediaRef: string): string | undefined => {
      const bytes = opened.archive.readBytes(mediaRef)
      if (!bytes) return undefined
      const mime = sniffMediaMime(mediaRef, bytes)
      const key = `${byteVersion(bytes)}:${mime}:${mediaRef}`
      let url = this.mediaUrls.get(key)
      if (!url) {
        url = URL.createObjectURL(new Blob([bytes.slice()], { type: mime }))
        this.mediaUrls.set(key, url)
      }
      return url
    }
  }

  private releaseMedia(): void {
    for (const url of this.mediaUrls.values()) URL.revokeObjectURL(url)
    this.mediaUrls.clear()
  }

  buildAllRenderSlides(): RenderSlide[] {
    const s = this.requireSession()
    return s.opened.deck.slides.map((slide, i) =>
      buildRenderSlide(slide, s.opened.deck.size, {
        fitWidthPx: s.fitWidthPx,
        media: this.makeMediaResolver(s.opened),
        metrics: this.metrics,
        slideNo: i + 1,
      }),
    )
  }

  rebuildSlide(slideIndex: number): RenderSlide | null {
    const s = this.requireSession()
    const slide = s.opened.deck.slides[slideIndex]
    if (!slide) return null
    return buildRenderSlide(slide, s.opened.deck.size, {
      fitWidthPx: s.fitWidthPx,
      media: this.makeMediaResolver(s.opened),
      ...(this.metrics ? { metrics: this.metrics } : {}),
      slideNo: slideIndex + 1,
    })
  }

  rebuildSlideWithReparse(slideIndex: number): RenderSlide | null {
    const s = this.requireSession()
    const fresh = materializeSlide(s.opened, slideIndex)
    if (!fresh) return null
    return buildRenderSlide(fresh, s.opened.deck.size, {
      fitWidthPx: s.fitWidthPx,
      media: this.makeMediaResolver(s.opened),
      ...(this.metrics ? { metrics: this.metrics } : {}),
      slideNo: slideIndex + 1,
    })
  }

  /** buildSlideUpdate: order + only the changed render trees (desktop parity). */
  buildSlideUpdate(before: string[], changed: number[] = []): { order: string[]; slides: RenderSlide[] } {
    const s = this.requireSession()
    const previous = new Map(before.map((path, i) => [path, i]))
    const order = s.opened.deck.slides.map((sl) => sl.path)
    const changedPaths = new Set(changed.map((i) => s.opened.deck.slides[i]?.path).filter(Boolean))
    const slides: RenderSlide[] = []
    s.opened.deck.slides.forEach((slide, i) => {
      const oldIndex = previous.get(slide.path)
      if (oldIndex === undefined || oldIndex !== i || changedPaths.has(slide.path) || slide.structureDirty) {
        const rendered = this.rebuildSlide(i)
        if (rendered) slides.push(rendered)
      }
    })
    return { order, slides }
  }

  setFitWidth(fitWidthPx: number): void {
    if (this.session) this.session.fitWidthPx = fitWidthPx
  }

  // ---- autofit post-pass (ported from slides-main.ts) ----------------------------

  private findEl(slide: Slide, sourceId: string): TextElement | undefined {
    const el = slide.elements.find((e) => matchesElementRef(e, sourceId))
    if (el && (el.type === 'text' || el.type === 'shape')) return el as TextElement
    return undefined
  }

  applyAutofitResize(slideIndex: number, sourceId: string, rendered: RenderSlide | null): RenderSlide | null {
    if (!rendered) return rendered
    const s = this.requireSession()
    const slide = s.opened.deck.slides[slideIndex]
    const el = slide ? this.findEl(slide, sourceId) : undefined
    if (!el?.text || el.text.autofit !== 'resize') return rendered
    const node = rendered.nodes.find((n) => n.sourceId === el.id)
    if (!node || (node.type !== 'shape' && node.type !== 'text') || !node.text) return rendered
    const text = node.text
    const needH = text.contentHeight + text.insets.t + text.insets.b
    const needW = !text.wrap && !text.vert ? this.nowrapContentWidth(text) : node.box.w
    if (Math.abs(needH - node.box.h) < 1 && Math.abs(needW - node.box.w) < 1) return rendered
    const baseWidthPx = s.opened.deck.size.cx / EMU_PER_PX_96
    const scale = s.fitWidthPx / baseWidthPx
    const toEmu = (px: number) => Math.max(Math.round((px / scale) * EMU_PER_PX_96), 1)
    const align = text.lines[0]?.align
    const shiftX = align === 'right' ? node.box.w - needW : align === 'center' ? (node.box.w - needW) / 2 : 0
    el.transform = {
      ...el.transform,
      offset: {
        ...el.transform.offset,
        x: el.transform.offset.x + Math.round((shiftX / scale) * EMU_PER_PX_96),
        cx: toEmu(needW),
        cy: toEmu(needH),
      },
    }
    el.dirtyTransform = true
    return this.rebuildSlide(slideIndex)
  }

  private nowrapContentWidth(text: RenderTextLayout): number {
    let left = Infinity
    let right = -Infinity
    for (const line of text.lines)
      for (const run of line.runs) {
        left = Math.min(left, run.x)
        right = Math.max(right, run.x + run.widthPx)
      }
    const content = right > left ? right - left : 0
    return content + text.insets.l + text.insets.r
  }

  syncAutofitScale(slideIndex: number, sourceId: string, rendered: RenderSlide | null): RenderSlide | null {
    if (!rendered) return rendered
    const s = this.requireSession()
    const slide = s.opened.deck.slides[slideIndex]
    const el = slide ? this.findEl(slide, sourceId) : undefined
    if (!el?.text || el.text.autofit !== 'shrink') return rendered
    const node = rendered.nodes.find((n) => n.sourceId === el.id)
    if (!node || (node.type !== 'shape' && node.type !== 'text') || !node.text) return rendered
    const refit = layoutText({
      body: el.text,
      boxWidthPx: node.box.w,
      boxHeightPx: node.box.h,
      metrics: this.metrics,
      vp: makeViewport(s.opened.deck.size, s.fitWidthPx),
      refitAutofit: true,
    })
    const effective = refit.fontScale
    const effectiveRed = refit.lnSpcReduction ?? 0
    if (
      Math.abs(effective - (el.text.fontScale ?? 1)) < 0.005 &&
      Math.abs(effectiveRed - (el.text.lnSpcReduction ?? 0)) < 0.005
    )
      return rendered
    el.text.fontScale = effective
    if (effectiveRed) el.text.lnSpcReduction = effectiveRed
    else delete el.text.lnSpcReduction
    el.anchor.originalXml = patchBodyPrAutofit(el.anchor.originalXml, effective, effectiveRed)
    slide!.structureDirty = true
    return this.rebuildSlide(slideIndex) ?? rendered
  }

  // ---- shared helpers for the method shims ----------------------------------------

  /** px→EMU setTransform payload (group-child coords handled), desktop parity. */
  transformPayload(
    slideIndex: number,
    fitWidthPx: number,
    item: { sourceId: string; groupId?: string; xPx: number; yPx: number; wPx: number; hPx: number; rotationDeg?: number },
  ): Op | null {
    const s = this.requireSession()
    const slide = s.opened.deck.slides[slideIndex]
    if (!slide) return null
    const childId = item.groupId ? resolveGroupChildId(slide, item.groupId, item.sourceId) : item.sourceId
    const grpChild = item.groupId ? findGroupChild(slide, item.groupId, childId) : null
    if (item.groupId && !grpChild) return null
    const baseWidthPx = s.opened.deck.size.cx / EMU_PER_PX_96
    const scale = fitWidthPx / baseWidthPx
    const toEmu = (px: number) => Math.round((px / scale) * EMU_PER_PX_96)
    let box: { x: number; y: number; cx: number; cy: number }
    if (grpChild) {
      const ch = grpChild.grp.childOffset
      const chX = ch?.x ?? grpChild.grp.transform.offset.x
      const chY = ch?.y ?? grpChild.grp.transform.offset.y
      const gExt = grpChild.grp.transform.offset
      const gsx = ch?.cx ? gExt.cx / ch.cx : 1
      const gsy = ch?.cy ? gExt.cy / ch.cy : 1
      box = {
        x: toEmu(item.xPx / gsx) + chX,
        y: toEmu(item.yPx / gsy) + chY,
        cx: toEmu(item.wPx / gsx),
        cy: toEmu(item.hPx / gsy),
      }
    } else {
      box = { x: toEmu(item.xPx), y: toEmu(item.yPx), cx: toEmu(item.wPx), cy: toEmu(item.hPx) }
    }
    return {
      op: 'setTransform',
      target: { slide: slideIndex, el: item.sourceId },
      box,
      rotDeg: item.rotationDeg,
      ...(item.groupId ? { group: item.groupId } : { resizeTableGrid: true }),
    }
  }

  toEmuConverter(fitWidthPx: number): (px: number) => number {
    const s = this.requireSession()
    const baseWidthPx = s.opened.deck.size.cx / EMU_PER_PX_96
    const scale = fitWidthPx / baseWidthPx
    return (px: number) => Math.round((px / scale) * EMU_PER_PX_96)
  }

  /** The live deck model (read access for the method shims). */
  get opened(): OpenedPptx | null {
    return this.session?.opened ?? null
  }

  /**
   * Gesture-undo contract (edit-transform / set-shape-adjust / edit-points):
   * one whole drag = one undo step. The first preview pushes the pre-gesture
   * snapshot; later previews and the final commit do not. Validation runs
   * BEFORE the bookkeeping so a failed first preview leaves no stuck flag.
   */
  gestureOp(op: Op, preview: boolean, slideIndex: number): RenderSlide | null {
    const s = this.requireSession()
    if (runTxn(s.opened, { dryRun: true, ops: [op] }).failures?.length) return null
    let pushed = false
    if (preview) {
      if (!s.transformPreview) {
        s.previewRedo = s.redoStack
        this.pushHistory()
        pushed = true
        s.transformPreview = true
      }
    } else if (s.transformPreview) {
      s.transformPreview = false
      s.previewRedo = undefined
    } else {
      this.pushHistory()
      pushed = true
    }
    const r = runTxn(s.opened, { ops: [op] })
    if (!r.applied) {
      if (pushed) {
        s.undoStack.pop()
        if (preview) {
          s.transformPreview = false
          if (s.previewRedo) s.redoStack = s.previewRedo
          s.previewRedo = undefined
        }
        this.notifyHistory()
      }
      return null
    }
    return this.rebuildSlide(slideIndex)
  }

  /** Escape mid-gesture: restore the pre-gesture snapshot, leave no trace. */
  cancelGesture(slideIndex: number): RenderSlide | null {
    const s = this.session
    if (!s || !s.transformPreview) return null
    s.transformPreview = false
    const snap = s.undoStack.pop()
    if (snap) this.restoreSnapshot(snap)
    if (s.previewRedo) s.redoStack = s.previewRedo
    s.previewRedo = undefined
    this.notifyHistory()
    return this.rebuildSlide(slideIndex)
  }

  /** Close the session and release its media URLs. */
  close(): void {
    this.releaseMedia()
    this.session = null
    this.notifyHistory()
  }

  /** Diagnostic (tests, host debugging). */
  debugState(): { open: boolean; slides: number; canUndo: boolean; canRedo: boolean; dirty: boolean } {
    const s = this.session
    return {
      open: !!s,
      slides: s?.opened.deck.slides.length ?? 0,
      canUndo: (s?.undoStack.length ?? 0) > 0,
      canRedo: (s?.redoStack.length ?? 0) > 0,
      dirty: this.isDirty(),
    }
  }
}
