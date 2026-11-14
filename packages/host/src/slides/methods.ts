/**
 * The slides bridge methods: desktop `slides-main.ts` handlers ported onto the
 * DeckSessionHost. Every shim keeps the desktop's contract (op construction,
 * undo bookkeeping, return shapes); only the desktop-specific surface is
 * adapted:
 *
 *  - file dialogs → the host's FileHost (SAF / picker / download)
 *  - OS clipboard → in-memory clipboards (single-tab host)
 *  - nativeImage size probe → pptx-render's byte-level image size reader
 *
 * Methods NOT ported here keep the legacy bridge's honest desktop-only
 * refusal: master view, 3D models, ink, narration recording, print/export-PDF
 * dialogs, font install. They are listed in BROWSER_HOST_LIMITATIONS.
 */
import type { FileHost } from '@genoffice/host-contract'
import {
  copyElementData,
  copySlide,
  ensureBuiltinLayout,
  builtinLayoutInfos,
  shouldOfferBuiltinLayouts,
  listSlideLayouts,
  getElementLink,
  getSlideLinks,
  getRunLinks,
  getSlideComments,
  getSlideNotes,
  getSlideTransition,
  getSlideAdvanceTime,
  getSections,
  readHeaderFooter,
  reparseDeck,
  EMU_PER_PT,
  type ElementClipboardItem,
  type SlideBundle,
} from '@genoffice/pptx-engine'
import { mapScriptOps, runTxn, type Op } from '@genoffice/pptx-ops'
import { imageDpiFromBytes, imageSizeFromBytes, EMU_PER_PX_96 } from '@genoffice/pptx-render'
import { createSettingsStore } from '../settings.js'
import type { DeckSessionHost } from './deck-session.js'

// ── small ports from the desktop surface ─────────────────────────────────

const DEFAULT_PICTURE_DPI = 96
const OVERSIZE_FIT_WIDTH_EMU = 612 * EMU_PER_PT

/** picture-frame.ts: PowerPoint placement for an inserted picture. */
function pictureFrame(
  slide: { width: number; height: number },
  naturalPx: { width: number; height: number } | null,
  dpi: { x?: number; y?: number } | undefined,
  opts: { center?: { x: number; y: number }; minEmu?: number } = {},
): { x: number; y: number; cx: number; cy: number } {
  const boxW = Math.min(slide.width, OVERSIZE_FIT_WIDTH_EMU)
  const known = naturalPx !== null && naturalPx.width > 0 && naturalPx.height > 0
  const w = known ? (naturalPx!.width / (dpi?.x ?? DEFAULT_PICTURE_DPI)) * 72 * EMU_PER_PT : boxW
  const h = known ? (naturalPx!.height / (dpi?.y ?? DEFAULT_PICTURE_DPI)) * 72 * EMU_PER_PT : (boxW * 3) / 4
  const fit = Math.min(boxW / w, slide.height / h)
  let scale = Math.min(1, fit)
  const minEmu = opts.minEmu ?? 0
  const smaller = Math.min(w, h) * scale
  if (smaller < minEmu) scale = Math.min(fit, (scale * minEmu) / smaller)
  const cx = Math.round(w * scale)
  const cy = Math.round(h * scale)
  const c = opts.center ?? { x: slide.width / 2, y: slide.height / 2 }
  return { x: Math.round(c.x - cx / 2), y: Math.round(c.y - cy / 2), cx, cy }
}

const sortUnique = (xs: number[]): number[] => [...new Set(xs)].sort((a, b) => a - b)
type MoveStep = { from: number; to: number }

/** shared/slide-selection.ts: block move as pre-validated sequential steps. */
function planSlideMoves(count: number, selected: number[], insertAt: number): MoveStep[] {
  const block = sortUnique(selected)
  const picked = new Set(block)
  const rest = Array.from({ length: count }, (_, i) => i).filter((i) => !picked.has(i))
  const at = insertAt - block.filter((i) => i < insertAt).length
  const final = [...rest.slice(0, at), ...block, ...rest.slice(at)]
  const cur = Array.from({ length: count }, (_, i) => i)
  const steps: MoveStep[] = []
  final.forEach((id, t) => {
    const from = cur.indexOf(id)
    if (from === t) return
    steps.push({ from, to: t })
    cur.splice(from, 1)
    cur.splice(t, 0, id)
  })
  return steps
}

function planSlideDuplicates(selected: number[]): ({ duplicate: number } | MoveStep)[] {
  const block = sortUnique(selected)
  const last = block[block.length - 1]
  if (last == null) return []
  const steps: ({ duplicate: number } | MoveStep)[] = [{ duplicate: last }]
  block.slice(0, -1).forEach((i, j) => {
    steps.push({ duplicate: i }, { from: i + 1, to: last + 1 + j })
  })
  return steps
}

/** IPC gradient → engine stop list / path kind / focus insets. */
interface GradientSpec {
  stops?: { pos: number; color: string }[]
  from?: string
  to?: string
  angleDeg?: number
  path?: 'circle' | 'rect' | 'shape'
  radial?: boolean
  center?: { x: number; y: number }
}
const gradientStops = (g: GradientSpec) =>
  g.stops?.length ? g.stops : [{ pos: 0, color: g.from ?? '#000000' }, { pos: 1, color: g.to ?? '#FFFFFF' }]
const gradientPathKind = (g: GradientSpec) => g.path ?? (g.radial ? ('circle' as const) : undefined)
const gradientFillTo = (g: GradientSpec) =>
  g.center ? { l: g.center.x, t: g.center.y, r: 1 - g.center.x, b: 1 - g.center.y } : undefined

/** Link targets: only safe external protocols may be saved into the package. */
const DECK_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']
function safeDeckLink(target: unknown): boolean {
  const t = target as { kind?: string; url?: string } | null
  if (!t || t.kind !== 'url') return true
  try {
    return DECK_LINK_PROTOCOLS.includes(new URL(t.url ?? '').protocol)
  } catch {
    return false
  }
}

function b64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tif', 'tiff']

// ── the method table ──────────────────────────────────────────────────────

export function createDeckMethods(
  host: DeckSessionHost,
  files: FileHost,
): Record<string, (...args: never[]) => unknown> {
  const settings = createSettingsStore()
  // single-tab in-memory clipboards (the desktop shares these via the OS)
  let slideClipboard: { bundles: SlideBundle[]; pngs?: string[] } | null = null
  let elementClipboard: { items: ElementClipboardItem[]; lastPage: string; pastes: number } | null = null

  const methods: Record<string, (...args: never[]) => unknown> = {
    // ---- open / save / lifecycle -------------------------------------------
    newBlank: (fitWidthPx: number, size?: { cx?: number; cy?: number }) => host.newBlank(fitWidthPx, size),
    openPptx: (fitWidthPx: number) => host.open(fitWidthPx),
    open: (fitWidthPx: number) => host.open(fitWidthPx),
    consumePendingOpen: () => null,
    consumePending: () => null,
    save: () => host.save(),
    saveAs: (defaultName?: string) => host.saveAs(defaultName),
    isDirty: () => host.isDirty(),
    undo: () => host.undo(),
    redo: () => host.redo(),
    closeDeck: () => {
      host.close()
      return true
    },
    onHistoryChanged: (handler: (state: { canUndo: boolean; canRedo: boolean }) => void) =>
      host.onHistoryChanged(handler),
    getRenderSlides: () => (host.opened ? host.buildAllRenderSlides() : null),
    getSlideSize: () => (host.opened ? { ...host.opened.deck.size } : null),

    // ---- text ----------------------------------------------------------------
    editText: (op: {
      slideIndex: number
      sourceId: string
      paragraphs: unknown
      groupId?: string
    }) => {
      const r = host.tx({
        ops: [
          {
            op: 'setText',
            target: { slide: op.slideIndex, el: op.sourceId },
            paragraphs: op.paragraphs,
            ...(op.groupId ? { group: op.groupId } : {}),
          },
        ],
      })
      if (!r) return null
      const levelDirty = (r.records?.[0]?.after as { levelDirty?: boolean } | undefined)?.levelDirty
      if (op.groupId || levelDirty) return host.rebuildSlide(op.slideIndex)
      const rendered = host.applyAutofitResize(op.slideIndex, op.sourceId, host.rebuildSlide(op.slideIndex))
      return host.syncAutofitScale(op.slideIndex, op.sourceId, rendered)
    },

    setElementFont: (op: {
      slideIndex: number
      sourceIds: string[]
      groupId?: string
      fontFamily?: string
      fontSizePt?: number
      fontSizeStep?: number
      strike?: boolean
      bold?: boolean
      italic?: boolean
      underline?: boolean
      color?: string
    }) => {
      const font = {
        fontFamily: op.fontFamily,
        fontSizePt: op.fontSizePt,
        fontSizeStep: op.fontSizeStep,
        strike: op.strike,
        bold: op.bold,
        italic: op.italic,
        underline: op.underline,
        color: op.color,
      }
      const r = host.tx({
        isolation: 'per_op',
        ops: op.sourceIds.map((id) => ({
          op: 'setFont',
          target: { slide: op.slideIndex, el: id },
          font,
          ...(op.groupId ? { group: op.groupId } : {}),
        })),
      })
      if (!r) return null
      let rendered = host.rebuildSlide(op.slideIndex)
      for (const id of op.sourceIds) {
        rendered = host.applyAutofitResize(op.slideIndex, id, rendered)
        rendered = host.syncAutofitScale(op.slideIndex, id, rendered)
      }
      return rendered
    },

    setElementParagraphFormat: (op: Record<string, unknown> & {
      slideIndex: number
      sourceIds: string[]
      groupId?: string
      indentDelta?: number
    }) => {
      const format = {
        bullet: op.bullet,
        bulletChar: op.bulletChar,
        bulletFont: op.bulletFont,
        numType: op.numType,
        startAt: op.startAt,
        bulletImage: op.bulletImage,
        bulletHangEmu: op.bulletHangEmu,
        bulletSizePct: op.bulletSizePct,
        bulletColor: op.bulletColor,
        lineSpacingPct: op.lineSpacingPct,
        spaceBeforePt: op.spaceBeforePt,
        spaceAfterPt: op.spaceAfterPt,
        align: op.align,
        rtl: op.rtl,
        indentDelta: op.indentDelta,
      }
      const r = host.tx({
        isolation: 'per_op',
        ops: op.sourceIds.map((id) => ({
          op: 'setParagraphFormat',
          target: { slide: op.slideIndex, el: id },
          format,
          ...(op.groupId ? { group: op.groupId } : {}),
        })),
      })
      if (!r) return null
      if (op.indentDelta) {
        // level changes affect inherited defaults: bake into bytes, reparse
        return host.rebuildSlideWithReparse(op.slideIndex) ?? host.rebuildSlide(op.slideIndex)
      }
      let rendered = host.rebuildSlide(op.slideIndex)
      for (const id of op.sourceIds) {
        rendered = host.applyAutofitResize(op.slideIndex, id, rendered)
        rendered = host.syncAutofitScale(op.slideIndex, id, rendered)
      }
      return rendered
    },

    setTextAnchor: (op: { slideIndex: number; sourceId: string; anchor: string }) => {
      const r = host.tx({
        ops: [{ op: 'setTextAnchor', target: { slide: op.slideIndex, el: op.sourceId }, anchor: op.anchor }],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    setTextBodyProps: (op: { slideIndex: number; sourceId: string; props: unknown }) => {
      const r = host.tx({
        ops: [{ op: 'setTextBodyProps', target: { slide: op.slideIndex, el: op.sourceId }, props: op.props }],
      })
      if (!r) return null
      const rendered = host.applyAutofitResize(op.slideIndex, op.sourceId, host.rebuildSlide(op.slideIndex))
      return host.syncAutofitScale(op.slideIndex, op.sourceId, rendered)
    },

    // ---- elements -------------------------------------------------------------
    addElement: (op: {
      slideIndex: number
      fitWidthPx: number
      kind: string
      xPx: number
      yPx: number
      wPx: number
      hPx: number
      text?: string
      paragraphs?: unknown[]
      fillColor?: string
      stroke?: { color: string; widthPt: number }
      bodyPr?: unknown
    }) => {
      const toEmu = host.toEmuConverter(op.fitWidthPx)
      const paragraphs = op.paragraphs?.length
        ? op.paragraphs
        : op.text
          ? op.text.split('\n').map((line) => ({ runs: [{ text: line }] }))
          : undefined
      const r = host.tx({
        ops: [
          {
            op: 'addElement',
            target: { slide: op.slideIndex },
            kind: op.kind,
            offset: { x: toEmu(op.xPx), y: toEmu(op.yPx), cx: toEmu(op.wPx), cy: toEmu(op.hPx) },
            ...(paragraphs ? { paragraphs } : {}),
            ...(op.fillColor ? { fill: op.fillColor } : {}),
            ...(op.stroke
              ? { stroke: { color: op.stroke.color, widthEmu: Math.round(op.stroke.widthPt * EMU_PER_PT) } }
              : {}),
            ...(op.bodyPr ? { bodyPr: op.bodyPr } : {}),
          },
        ],
      })
      if (!r) return null
      const rebuilt = host.rebuildSlide(op.slideIndex)
      return rebuilt ? { slide: rebuilt, sourceId: r.records![0]!.created![0]! } : null
    },

    deleteElement: (op: { slideIndex: number; sourceId: string }) => {
      const r = host.tx({
        ops: [{ op: 'deleteElement', target: { slide: op.slideIndex, el: op.sourceId } }],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    deleteElements: (op: { slideIndex: number; sourceIds: string[] }) => {
      if (!op.sourceIds.length) return null
      const r = host.tx({
        isolation: 'per_op',
        ops: op.sourceIds.map((id) => ({ op: 'deleteElement', target: { slide: op.slideIndex, el: id } })),
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    editTransform: (op: {
      slideIndex: number
      fitWidthPx: number
      sourceId: string
      groupId?: string
      xPx: number
      yPx: number
      wPx: number
      hPx: number
      rotationDeg?: number
      preview?: boolean
    }) => {
      const payload = host.transformPayload(op.slideIndex, op.fitWidthPx, op)
      if (!payload) return null
      return host.gestureOp(payload, !!op.preview, op.slideIndex)
    },

    cancelTransformPreview: (op: { slideIndex: number }) => host.cancelGesture(op.slideIndex),

    editTransformMulti: (op: {
      slideIndex: number
      fitWidthPx: number
      items: { sourceId: string; groupId?: string; xPx: number; yPx: number; wPx: number; hPx: number; rotationDeg?: number }[]
    }) => {
      const ops: Op[] = []
      for (const item of op.items) {
        const payload = host.transformPayload(op.slideIndex, op.fitWidthPx, item)
        if (!payload) return null
        ops.push(payload)
      }
      if (!ops.length) return null
      const r = host.tx({ ops })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    batchEditTransform: (op: {
      slideIndex: number
      fitWidthPx: number
      items: { sourceId: string; xPx: number; yPx: number; wPx: number; hPx: number; rotationDeg?: number }[]
    }) => {
      const toEmu = host.toEmuConverter(op.fitWidthPx)
      const r = host.tx({
        ops: op.items.map((item) => ({
          op: 'setTransform',
          target: { slide: op.slideIndex, el: item.sourceId },
          box: { x: toEmu(item.xPx), y: toEmu(item.yPx), cx: toEmu(item.wPx), cy: toEmu(item.hPx) },
          rotDeg: item.rotationDeg,
        })),
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    editConnectorEndpoints: (op: {
      slideIndex: number
      fitWidthPx: number
      sourceId: string
      x1Px: number
      y1Px: number
      x2Px: number
      y2Px: number
      start?: unknown
      end?: unknown
    }) => {
      const toEmu = host.toEmuConverter(op.fitWidthPx)
      const r = host.tx({
        ops: [
          {
            op: 'setConnectorEndpoints',
            target: { slide: op.slideIndex, el: op.sourceId },
            p1: { x: toEmu(op.x1Px), y: toEmu(op.y1Px) },
            p2: { x: toEmu(op.x2Px), y: toEmu(op.y2Px) },
            start: op.start,
            end: op.end,
          },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    editStroke: (op: {
      slideIndex: number
      sourceId: string
      groupId?: string
      stroke: {
        color: string
        widthPt: number
        dash?: string
        cap?: string
        join?: string
        compound?: string
        gradient?: { stops: { pos: number; color: string }[]; angleDeg: number }
      } | null
    }) => {
      const patch = op.stroke
        ? {
            color: op.stroke.color,
            widthEmu: Math.round(op.stroke.widthPt * EMU_PER_PT),
            ...(op.stroke.dash ? { dash: op.stroke.dash } : {}),
            ...(op.stroke.cap ? { cap: op.stroke.cap } : {}),
            ...(op.stroke.join ? { join: op.stroke.join } : {}),
            ...(op.stroke.compound ? { compound: op.stroke.compound } : {}),
            ...(op.stroke.gradient
              ? {
                  gradient: {
                    stops: op.stroke.gradient.stops,
                    angle: Math.round(op.stroke.gradient.angleDeg * 60000),
                  },
                }
              : {}),
          }
        : null
      const r = host.tx({
        ops: [
          {
            op: 'setStroke',
            target: { slide: op.slideIndex, el: op.sourceId },
            stroke: patch,
            ...(op.groupId ? { group: op.groupId } : {}),
          },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    editFill: (op: {
      slideIndex: number
      sourceId: string
      groupId?: string
      fill: string | { gradient: GradientSpec }
    }) => {
      const fill =
        typeof op.fill === 'string'
          ? op.fill
          : {
              stops: gradientStops(op.fill.gradient),
              ...((pk) =>
                pk
                  ? {
                      path: pk,
                      ...((ft) => (ft ? { fillTo: ft } : {}))(gradientFillTo(op.fill.gradient)),
                    }
                  : { angle: Math.round((op.fill.gradient.angleDeg ?? 0) * 60000) })(
                gradientPathKind(op.fill.gradient),
              ),
            }
      const r = host.tx({
        ops: [
          {
            op: 'setFill',
            target: { slide: op.slideIndex, el: op.sourceId },
            fill,
            ...(op.groupId ? { group: op.groupId } : {}),
          },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    flipElements: (op: { slideIndex: number; sourceIds: string[]; axis: string; groupId?: string }) => {
      const r = host.tx({
        ops: [
          {
            op: 'flipElements',
            target: { slide: op.slideIndex },
            els: op.sourceIds,
            axis: op.axis,
            ...(op.groupId ? { group: op.groupId } : {}),
          },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    editPictureSrcRect: (op: {
      slideIndex: number
      sourceId: string
      srcRect: unknown
      boxPx?: { x: number; y: number; w: number; h: number }
      fitWidthPx?: number
    }) => {
      let box: { x: number; y: number; cx: number; cy: number } | undefined
      if (op.boxPx && op.fitWidthPx) {
        const toEmu = host.toEmuConverter(op.fitWidthPx)
        box = { x: toEmu(op.boxPx.x), y: toEmu(op.boxPx.y), cx: toEmu(op.boxPx.w), cy: toEmu(op.boxPx.h) }
      }
      const r = host.tx({
        ops: [
          {
            op: 'setPictureSrcRect',
            target: { slide: op.slideIndex, el: op.sourceId },
            srcRect: op.srcRect,
            ...(box ? { box } : {}),
          },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    groupElements: (op: { slideIndex: number; sourceIds: string[] }) => {
      const r = host.tx({
        ops: [{ op: 'groupElements', target: { slide: op.slideIndex }, els: op.sourceIds }],
      })
      if (!r) return null
      const slide = host.rebuildSlide(op.slideIndex)
      return slide ? { slide, groupId: r.records![0]!.created![0]! } : null
    },

    ungroupElement: (op: { slideIndex: number; sourceId: string }) => {
      const r = host.tx({
        ops: [{ op: 'ungroupElement', target: { slide: op.slideIndex, el: op.sourceId } }],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    reorderElement: (op: { slideIndex: number; sourceId: string; dir: string }) => {
      const r = host.tx({
        ops: [{ op: 'reorderElement', target: { slide: op.slideIndex, el: op.sourceId }, dir: op.dir }],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    changeShape: (op: { slideIndex: number; sourceId: string; prst: string; groupId?: string }) => {
      const r = host.tx({
        ops: [
          {
            op: 'setShapeGeometry',
            target: { slide: op.slideIndex, el: op.sourceId },
            prst: op.prst,
            ...(op.groupId ? { group: op.groupId } : {}),
          },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    setShapeAdjust: (op: {
      slideIndex: number
      sourceId: string
      adjust: Record<string, number>
      groupId?: string
      preview?: boolean
    }) => {
      const payload: Op = {
        op: 'setShapeAdjust',
        target: { slide: op.slideIndex, el: op.sourceId },
        adjust: op.adjust,
        ...(op.groupId ? { group: op.groupId } : {}),
      }
      return host.gestureOp(payload, !!op.preview, op.slideIndex)
    },

    setShapeGeometry: (op: {
      slideIndex: number
      sourceId: string
      fitWidthPx: number
      pathPx: { w: number; h: number; cmds: { op: string; pts: number[] }[] }
      groupId?: string
      preview?: boolean
    }) => {
      const toEmu = host.toEmuConverter(op.fitWidthPx)
      const payload: Op = {
        op: 'setShapeCustomGeometry',
        target: { slide: op.slideIndex, el: op.sourceId },
        path: {
          w: toEmu(op.pathPx.w),
          h: toEmu(op.pathPx.h),
          cmds: op.pathPx.cmds.map((c) => ({ op: c.op, pts: c.pts.map(toEmu) })),
        },
        ...(op.groupId ? { group: op.groupId } : {}),
      }
      return host.gestureOp(payload, !!op.preview, op.slideIndex)
    },

    setEffects: (op: { slideIndex: number; sourceId: string; effects: unknown }) => {
      const r = host.tx({
        ops: [{ op: 'setEffects', target: { slide: op.slideIndex, el: op.sourceId }, effects: op.effects }],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    setLink: (op: { slideIndex: number; sourceId: string; target: unknown }) => {
      if (!safeDeckLink(op.target)) return null
      const r = host.tx({
        ops: [{ op: 'setLink', target: { slide: op.slideIndex, el: op.sourceId }, link: op.target }],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    getLink: (slideIndex: number, sourceId: string) =>
      host.opened ? getElementLink(host.opened, slideIndex, sourceId) : null,
    getSlideLinks: (slideIndex: number) =>
      host.opened
        ? getSlideLinks(host.opened, slideIndex).map(({ elementId, target }) => ({ sourceId: elementId, target }))
        : [],
    getRunLinks: (slideIndex: number) =>
      host.opened
        ? getRunLinks(host.opened, slideIndex).map(({ elementId, ...rest }) => ({ sourceId: elementId, ...rest }))
        : [],

    // ---- element clipboard (in-memory) ------------------------------------------
    copyElements: (op: { slideIndex: number; sourceIds: string[]; cut?: boolean; clipboardToken?: string }) => {
      const opened = host.opened
      const slide = opened?.deck.slides[op.slideIndex]
      if (!opened || !slide) return 0
      const items = op.sourceIds
        .map((id) => slide.elements.find((el) => el.id === id))
        .filter((el): el is NonNullable<typeof el> => !!el)
        .map((el) => copyElementData(opened, slide, el))
      if (items.length) {
        elementClipboard = { items, lastPage: '', pastes: 0 }
      }
      return items.length
    },
    copyElementsImage: () => false,
    hasElementClipboard: () => (elementClipboard?.items.length ?? 0) > 0,
    pasteElements: (op: { slideIndex: number; fitWidthPx: number }) => {
      const opened = host.opened
      if (!opened || !elementClipboard?.items.length) return null
      if (!opened.deck.slides[op.slideIndex]) return null
      // simplified cascade: repeat pastes on the same page shift 16px each
      const page = String(op.slideIndex)
      const samePage = elementClipboard.lastPage === page
      const shiftPx = samePage ? 16 * elementClipboard.pastes : 0
      const toEmu = host.toEmuConverter(op.fitWidthPx)
      const shift = toEmu(shiftPx)
      const r = host.tx({
        ops: [
          {
            op: 'pasteElements',
            target: { slide: op.slideIndex },
            items: elementClipboard.items,
            dx: shift,
            dy: shift,
          },
        ],
      })
      if (!r) return null
      elementClipboard.pastes = samePage ? elementClipboard.pastes + 1 : 1
      elementClipboard.lastPage = page
      host.setFitWidth(op.fitWidthPx)
      const rebuilt = host.rebuildSlide(op.slideIndex)
      return rebuilt ? { slide: rebuilt, sourceIds: r.records![0]!.created! } : null
    },
    duplicateElements: (op: { slideIndex: number; fitWidthPx: number; sourceIds: string[]; dxPx: number; dyPx: number }) => {
      const opened = host.opened
      const slide = opened?.deck.slides[op.slideIndex]
      if (!opened || !slide) return null
      const items = op.sourceIds
        .map((id) => slide.elements.find((el) => el.id === id))
        .filter((el): el is NonNullable<typeof el> => !!el)
        .map((el) => copyElementData(opened, slide, el))
      if (!items.length) return null
      const toEmu = host.toEmuConverter(op.fitWidthPx)
      const r = host.tx({
        ops: [
          {
            op: 'pasteElements',
            target: { slide: op.slideIndex },
            items,
            dx: toEmu(op.dxPx),
            dy: toEmu(op.dyPx),
          },
        ],
      })
      if (!r) return null
      host.setFitWidth(op.fitWidthPx)
      const rebuilt = host.rebuildSlide(op.slideIndex)
      return rebuilt ? { slide: rebuilt, sourceIds: r.records![0]!.created! } : null
    },

    // ---- pictures / media ----------------------------------------------------------
    insertImage: async (slideIndex: number, fitWidthPx: number) => {
      const opened = host.opened
      const slide = opened?.deck.slides[slideIndex]
      if (!opened || !slide) return null
      const picked = await files.open()
      if (!picked.ok) return null
      const ext = picked.handle.name.split('.').pop()?.toLowerCase() ?? ''
      if (!IMAGE_EXTS.includes(ext)) return { error: 'unsupported' as const, ext }
      const bytes = picked.data
      const size = imageSizeFromBytes(bytes)
      const natural = size ? { width: size.w, height: size.h } : null
      const offset = pictureFrame(
        { width: opened.deck.size.cx, height: opened.deck.size.cy },
        natural,
        imageDpiFromBytes(bytes),
      )
      const txn = host.tx({
        ops: [{ op: 'addPicture', target: { slide: slideIndex }, bytes, ext, offset }],
      })
      if (!txn) return { error: 'unsupported' as const, ext }
      host.setFitWidth(fitWidthPx)
      const rebuilt = host.rebuildSlide(slideIndex)
      return rebuilt ? { slide: rebuilt, sourceId: txn.records![0]!.created![0]! } : null
    },

    insertImageUrl: async (op: { slideIndex: number; fitWidthPx: number; url: string }) => {
      const opened = host.opened
      if (!opened?.deck.slides[op.slideIndex]) return null
      const resp = await fetch(op.url).catch(() => null)
      if (!resp || !resp.ok) return null
      const bytes = new Uint8Array(await resp.arrayBuffer())
      const ext = (op.url.split('.').pop() ?? 'png').split(/[?#]/)[0]!.toLowerCase()
      const size = imageSizeFromBytes(bytes)
      const natural = size ? { width: size.w, height: size.h } : null
      const offset = pictureFrame(
        { width: opened.deck.size.cx, height: opened.deck.size.cy },
        natural,
        imageDpiFromBytes(bytes),
      )
      const txn = host.tx({
        ops: [{ op: 'addPicture', target: { slide: op.slideIndex }, bytes, ext: IMAGE_EXTS.includes(ext) ? ext : 'png', offset }],
      })
      if (!txn) return null
      host.setFitWidth(op.fitWidthPx)
      const rebuilt = host.rebuildSlide(op.slideIndex)
      return rebuilt ? { slide: rebuilt, sourceId: txn.records![0]!.created![0]! } : null
    },

    addImageBytes: (op: {
      slideIndex: number
      fitWidthPx: number
      base64: string
      ext: string
      name?: string
      naturalPx?: { width: number; height: number }
      centerPx?: { x: number; y: number }
      xPx?: number
      yPx?: number
      wPx?: number
      hPx?: number
    }) => {
      const opened = host.opened
      if (!opened?.deck.slides[op.slideIndex]) return null
      const toEmu = host.toEmuConverter(op.fitWidthPx)
      const bytes = b64ToBytes(op.base64)
      let offset: { x: number; y: number; cx: number; cy: number }
      if (op.naturalPx) {
        offset = pictureFrame(
          { width: opened.deck.size.cx, height: opened.deck.size.cy },
          op.naturalPx,
          imageDpiFromBytes(bytes),
          {
            center: op.centerPx ? { x: toEmu(op.centerPx.x), y: toEmu(op.centerPx.y) } : undefined,
            minEmu: toEmu(24),
          },
        )
      } else {
        offset = {
          x: toEmu(op.xPx ?? 0),
          y: toEmu(op.yPx ?? 0),
          cx: Math.max(1, toEmu(op.wPx ?? 100)),
          cy: Math.max(1, toEmu(op.hPx ?? 100)),
        }
      }
      const r = host.tx({
        ops: [
          {
            op: 'addPicture',
            target: { slide: op.slideIndex },
            bytes,
            ext: op.ext,
            offset,
            ...(op.name ? { name: op.name } : {}),
          },
        ],
      })
      if (!r) return { error: 'unsupported' as const, ext: op.ext }
      host.setFitWidth(op.fitWidthPx)
      const rebuilt = host.rebuildSlide(op.slideIndex)
      return rebuilt ? { slide: rebuilt, sourceId: r.records![0]!.created![0]! } : null
    },

    replacePictureBytes: (op: { slideIndex: number; sourceId: string; base64: string; ext: string }) => {
      const r = host.tx({
        ops: [
          {
            op: 'replacePicture',
            target: { slide: op.slideIndex, el: op.sourceId },
            bytes: b64ToBytes(op.base64),
            ext: op.ext,
          },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    editPictureOpacity: (op: { slideIndex: number; sourceId: string; opacity: number }) => {
      const r = host.tx({
        ops: [{ op: 'setPictureOpacity', target: { slide: op.slideIndex, el: op.sourceId }, opacity: op.opacity }],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    // ---- tables / charts -------------------------------------------------------------
    addTable: (op: {
      slideIndex: number
      fitWidthPx: number
      rows: number
      cols: number
      xPx: number
      yPx: number
      wPx: number
      hPx: number
      rowHeightEmu?: number
    }) => {
      if (!host.opened?.deck.slides[op.slideIndex]) return null
      const toEmu = host.toEmuConverter(op.fitWidthPx)
      const rowH = op.rowHeightEmu && op.rowHeightEmu > 0 ? Math.round(op.rowHeightEmu) : null
      const r = host.tx({
        ops: [
          {
            op: 'addTable',
            target: { slide: op.slideIndex },
            rows: op.rows,
            cols: op.cols,
            offset: {
              x: toEmu(op.xPx),
              y: toEmu(op.yPx),
              cx: toEmu(op.wPx),
              cy: rowH ? rowH * op.rows : toEmu(op.hPx),
            },
            ...(rowH ? { rowHeightsEmu: Array.from({ length: op.rows }, () => rowH) } : {}),
          },
        ],
      })
      if (!r) return null
      host.setFitWidth(op.fitWidthPx)
      const rebuilt = host.rebuildSlide(op.slideIndex)
      return rebuilt ? { slide: rebuilt, sourceId: r.records![0]!.created![0]! } : null
    },

    editTableCell: (op: { slideIndex: number; sourceId: string; row: number; col: number; paragraphs: unknown }) => {
      const r = host.tx({
        ops: [
          {
            op: 'setTableCell',
            target: { slide: op.slideIndex, el: op.sourceId },
            row: op.row,
            col: op.col,
            paragraphs: op.paragraphs,
          },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    setTableColWidth: (op: { slideIndex: number; sourceId: string; col: number; widthEmu: number }) => {
      const r = host.tx({
        ops: [
          { op: 'setTableColWidth', target: { slide: op.slideIndex, el: op.sourceId }, col: op.col, widthEmu: op.widthEmu },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    setTableRowHeight: (op: { slideIndex: number; sourceId: string; row: number; heightEmu: number }) => {
      const r = host.tx({
        ops: [
          { op: 'setTableRowHeight', target: { slide: op.slideIndex, el: op.sourceId }, row: op.row, heightEmu: op.heightEmu },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    setTableCellAnchor: (op: { slideIndex: number; sourceId: string; row: number; col: number; anchor: string }) => {
      const r = host.tx({
        ops: [
          {
            op: 'setTableCellAnchor',
            target: { slide: op.slideIndex, el: op.sourceId },
            row: op.row,
            col: op.col,
            anchor: op.anchor,
          },
        ],
      })
      return r ? host.rebuildSlide(op.slideIndex) : null
    },

    addChart: (op: {
      slideIndex: number
      fitWidthPx: number
      kind: string
      title?: string
      categories: unknown
      series: unknown
      xPx: number
      yPx: number
      wPx: number
      hPx: number
    }) => {
      if (!host.opened?.deck.slides[op.slideIndex]) return null
      const toEmu = host.toEmuConverter(op.fitWidthPx)
      const r = host.tx({
        ops: [
          {
            op: 'addChart',
            target: { slide: op.slideIndex },
            kind: op.kind === 'barH' ? 'bar' : op.kind,
            ...(op.kind === 'barH' ? { barDir: 'bar' as const } : {}),
            ...(op.title ? { title: op.title } : {}),
            categories: op.categories,
            series: op.series,
            offset: { x: toEmu(op.xPx), y: toEmu(op.yPx), cx: toEmu(op.wPx), cy: toEmu(op.hPx) },
          },
        ],
      })
      if (!r) return null
      host.setFitWidth(op.fitWidthPx)
      const rebuilt = host.rebuildSlide(op.slideIndex)
      return rebuilt ? { slide: rebuilt, sourceId: r.records![0]!.created![0]! } : null
    },

    // ---- slides ---------------------------------------------------------------------
    addSlide: (op: { sourceIndex: number; fitWidthPx: number; clearText?: boolean }) => {
      const opened = host.opened
      if (!opened) return null
      const before = opened.deck.slides.map((s) => s.path)
      const r = host.tx({
        ops: [
          {
            op: 'duplicateSlide',
            target: { slide: op.sourceIndex },
            ...(op.clearText ? { clearText: true } : {}),
          },
        ],
      })
      if (!r) return null
      host.setFitWidth(op.fitWidthPx)
      host.markMetaDirty()
      return { ...host.buildSlideUpdate(before), index: op.sourceIndex + 1 }
    },

    addBlankSlide: (op: { sourceIndex: number; fitWidthPx: number; before?: boolean }) => {
      const opened = host.opened
      if (!opened) return null
      const before = opened.deck.slides.map((s) => s.path)
      const r = host.tx({
        ops: [
          { op: 'addBlankSlide', target: { slide: op.sourceIndex } },
          ...(op.before
            ? [{ op: 'moveSlide', target: { slide: op.sourceIndex }, to: op.sourceIndex + 1 }]
            : []),
        ],
      })
      if (!r) return null
      host.setFitWidth(op.fitWidthPx)
      host.markMetaDirty()
      return { ...host.buildSlideUpdate(before), index: op.before ? op.sourceIndex : op.sourceIndex + 1 }
    },

    addSlideWithLayout: (op: { sourceIndex: number; fitWidthPx: number; layoutPath?: string }) => {
      const opened = host.opened
      if (!opened) return null
      const before = opened.deck.slides.map((s) => s.path)
      host.pushHistory()
      const layoutPath = op.layoutPath?.startsWith('builtin:')
        ? ensureBuiltinLayout(opened.archive, opened.deck.size, op.layoutPath.slice('builtin:'.length)) ?? undefined
        : op.layoutPath
      const r = layoutPath
        ? runTxn(opened, { ops: [{ op: 'addSlideWithLayout', target: { slide: op.sourceIndex }, layoutPath }] })
        : null
      if (!r?.applied) {
        host.popHistory()
        return null
      }
      host.setFitWidth(op.fitWidthPx)
      host.markMetaDirty()
      return { ...host.buildSlideUpdate(before), index: op.sourceIndex + 1 }
    },

    deleteSlide: (slideIndex: number) => {
      const opened = host.opened
      if (!opened) return null
      const before = opened.deck.slides.map((s) => s.path)
      const r = host.tx({ ops: [{ op: 'deleteSlide', target: { slide: slideIndex } }] })
      if (!r) return null
      host.markMetaDirty()
      return host.buildSlideUpdate(before)
    },

    deleteSlides: (op: { slideIndexes: number[] }) => {
      const opened = host.opened
      if (!opened) return null
      const before = opened.deck.slides.map((s) => s.path)
      const indexes = sortUnique(op.slideIndexes).reverse()
      if (!indexes.length || indexes.length >= opened.deck.slides.length) return null
      const r = host.tx({ ops: indexes.map((i) => ({ op: 'deleteSlide', target: { slide: i } })) })
      if (!r) return null
      host.markMetaDirty()
      return host.buildSlideUpdate(before)
    },

    duplicateSlides: (op: { slideIndexes: number[]; fitWidthPx: number }) => {
      const opened = host.opened
      if (!opened) return null
      const steps = planSlideDuplicates(op.slideIndexes)
      if (!steps.length) return null
      const before = opened.deck.slides.map((s) => s.path)
      const r = host.tx({
        ops: steps.map((st) =>
          'duplicate' in st
            ? { op: 'duplicateSlide', target: { slide: st.duplicate } }
            : { op: 'moveSlide', target: { slide: st.from }, to: st.to },
        ),
      })
      if (!r) return null
      host.setFitWidth(op.fitWidthPx)
      host.markMetaDirty()
      return { ...host.buildSlideUpdate(before), index: Math.max(...op.slideIndexes) + 1 }
    },

    moveSlide: (op: { fromIndex: number; toIndex: number }) => {
      const opened = host.opened
      if (!opened) return null
      const before = opened.deck.slides.map((s) => s.path)
      const r = host.tx({ ops: [{ op: 'moveSlide', target: { slide: op.fromIndex }, to: op.toIndex }] })
      if (!r) return null
      host.markMetaDirty()
      return { ...host.buildSlideUpdate(before), sections: getSections(opened) }
    },

    moveSlides: (op: { slideIndexes: number[]; insertAt: number }) => {
      const opened = host.opened
      if (!opened) return null
      const before = opened.deck.slides.map((s) => s.path)
      const steps = planSlideMoves(opened.deck.slides.length, op.slideIndexes, op.insertAt)
      if (!steps.length) return null
      const r = host.tx({ ops: steps.map((st) => ({ op: 'moveSlide', target: { slide: st.from }, to: st.to })) })
      if (!r) return null
      host.markMetaDirty()
      return { ...host.buildSlideUpdate(before), sections: getSections(opened) }
    },

    copySlides: (op: { slideIndexes: number[]; pngs?: string[] }) => {
      const opened = host.opened
      if (!opened || !op.slideIndexes.length) return false
      const bundles: SlideBundle[] = []
      for (const i of op.slideIndexes) {
        const bundle = copySlide(opened, i)
        if (!bundle) return false
        bundles.push(bundle)
      }
      const pngs = op.pngs?.length === bundles.length ? op.pngs : undefined
      slideClipboard = { bundles, ...(pngs ? { pngs } : {}) }
      return true
    },

    hasSlideClipboard: () => slideClipboard !== null,

    pasteSlide: (op: { afterIndex: number; fitWidthPx: number; mode?: string }) => {
      const opened = host.opened
      if (!opened || !slideClipboard) return null
      const before = opened.deck.slides.map((s) => s.path)
      const picture = op.mode === 'picture'
      const { bundles, pngs } = slideClipboard
      if (picture && !pngs) return null
      host.pushHistory()
      const r = runTxn(opened, {
        ops: bundles.map((bundle, j) => ({
          op: 'pasteSlide',
          afterIndex: picture ? op.afterIndex : op.afterIndex + j,
          mode: op.mode,
          ...(picture ? { png: pngs![j] } : { bundle }),
        })),
      })
      if (!r.applied) {
        host.popHistory()
        return null
      }
      host.setFitWidth(op.fitWidthPx)
      host.markMetaDirty()
      const index = (r.records![0]!.after as { index: number }).index
      const created = r.records!.flatMap((x) => x.created ?? [])
      return {
        ...host.buildSlideUpdate(before, Array.from({ length: picture ? 1 : bundles.length }, (_, j) => index + j)),
        index,
        count: picture ? 0 : bundles.length,
        ...(created.length ? { sourceIds: created } : {}),
      }
    },

    setSlideLayout: (op: { slideIndex: number; layoutPath?: string }) => {
      const opened = host.opened
      if (!opened) return null
      host.pushHistory()
      const layoutPath = op.layoutPath?.startsWith('builtin:')
        ? ensureBuiltinLayout(opened.archive, opened.deck.size, op.layoutPath.slice('builtin:'.length)) ?? undefined
        : op.layoutPath
      const r =
        op.layoutPath && !layoutPath
          ? null
          : runTxn(opened, {
              ops: [
                {
                  op: 'setSlideLayout',
                  target: { slide: op.slideIndex },
                  ...(layoutPath ? { layoutPath } : {}),
                },
              ],
            })
      if (!r?.applied) {
        host.popHistory()
        return null
      }
      return host.rebuildSlide(op.slideIndex)
    },

    setSlideSize: (op: { cx: number; cy: number }) => {
      const r = host.tx({ ops: [{ op: 'setSlideSize', cx: op.cx, cy: op.cy }] })
      if (!r) return null
      host.markMetaDirty()
      return host.buildAllRenderSlides()
    },

    setSlideHidden: (op: { slideIndex: number; hidden: boolean }) => {
      const opened = host.opened
      if (!opened) return null
      const before = opened.deck.slides.map((s) => s.path)
      const r = host.tx({
        ops: [{ op: 'setHidden', target: { slide: op.slideIndex }, hidden: op.hidden }],
      })
      return r ? host.buildSlideUpdate(before, [op.slideIndex]) : null
    },

    setSlidesHidden: (op: { slideIndexes: number[]; hidden: boolean }) => {
      const opened = host.opened
      if (!opened || !op.slideIndexes.length) return null
      const before = opened.deck.slides.map((s) => s.path)
      const r = host.tx({
        ops: op.slideIndexes.map((i) => ({ op: 'setHidden', target: { slide: i }, hidden: op.hidden })),
      })
      return r ? host.buildSlideUpdate(before, op.slideIndexes) : null
    },

    getLayouts: () => {
      const opened = host.opened
      if (!opened) return null
      const layouts = listSlideLayouts(opened.archive)
      if (shouldOfferBuiltinLayouts(layouts)) {
        layouts.push(...builtinLayoutInfos(opened.deck.size, new Set(layouts.map((l) => l.name))))
      }
      return { layouts, size: { ...opened.deck.size } }
    },

    findReplace: (op: {
      find: string
      replace: string
      matchCase?: boolean
      firstOnly?: boolean
      slideIndex?: number
      elementId?: string
    }) => {
      const opened = host.opened
      if (!opened) return null
      const before = opened.deck.slides.map((s) => s.path)
      const r = host.tx({
        ops: [
          {
            op: 'findReplace',
            find: op.find,
            replace: op.replace,
            matchCase: op.matchCase,
            firstOnly: op.firstOnly,
            slideIndex: op.slideIndex,
            elementId: op.elementId,
          },
        ],
      })
      if (!r) return { count: 0, update: null }
      const { count, changedSlides } = r.records![0]!.after as { count: number; changedSlides: number[] }
      return { count, update: host.buildSlideUpdate(before, changedSlides) }
    },

    // ---- deck-level: theme / header-footer / transitions / notes / comments ----------
    applyHeaderFooter: (op: { footer?: string; slideNum?: boolean; date?: string; dateAuto?: boolean; fitWidthPx: number }) => {
      const r = host.tx({
        ops: [
          {
            op: 'applyHeaderFooter',
            settings: {
              footer: op.footer ?? null,
              slideNum: !!op.slideNum,
              date: op.date ?? null,
              ...(op.dateAuto ? { dateAuto: true } : {}),
            },
          },
        ],
      })
      if (!r) return null
      host.setFitWidth(op.fitWidthPx)
      return host.buildAllRenderSlides()
    },

    getHeaderFooter: (slideIndex: number) => {
      const slide = host.opened?.deck.slides[slideIndex]
      return slide ? readHeaderFooter(slide) : { footer: null, slideNum: false, date: null }
    },

    applyTheme: (op: { name: string; colors: unknown; majorFont?: string; minorFont?: string; fitWidthPx: number }) => {
      const opened = host.opened
      if (!opened) return null
      const payload = {
        op: 'applyTheme',
        name: op.name,
        colors: op.colors,
        ...(op.majorFont ? { majorFont: op.majorFont } : {}),
        ...(op.minorFont ? { minorFont: op.minorFont } : {}),
      }
      const plan = runTxn(opened, { ops: [payload], dryRun: true })
      if (plan.failures?.length) return { error: plan.failures[0]!.error }
      host.pushHistory()
      const r = runTxn(opened, { ops: [payload] })
      if (!r.applied) {
        host.popHistory()
        return { error: r.failures?.[0]?.error ?? 'applyTheme failed' }
      }
      const after = r.records![0]!.after as { patched: number; remapped: number }
      if (after.patched === 0 && after.remapped === 0) {
        host.popHistory()
        return null
      }
      // reparse so resolved colors/fonts refresh (in-memory, no zip roundtrip)
      host.replaceOpened(reparseDeck(opened))
      host.markMetaDirty()
      host.setFitWidth(op.fitWidthPx)
      return host.buildAllRenderSlides()
    },

    setTransition: (op: { slideIndex: number; kind: string }) => {
      const opened = host.opened
      if (!opened) return false
      const slides = opened.deck.slides
      const idxs = op.slideIndex === -1 ? slides.map((_, i) => i) : slides[op.slideIndex] ? [op.slideIndex] : []
      if (idxs.length === 0) return false
      const r = host.tx({ ops: idxs.map((i) => ({ op: 'setTransition', target: { slide: i }, kind: op.kind })) })
      return r !== null
    },

    getTransition: (slideIndex: number) => {
      const slide = host.opened?.deck.slides[slideIndex]
      return slide ? getSlideTransition(slide) : 'none'
    },

    setAdvanceTimes: (op: { times: { slideIndex: number; ms: number | null }[] }) => {
      const opened = host.opened
      if (!opened) return false
      const targets = op.times.filter((t) => opened.deck.slides[t.slideIndex])
      if (targets.length === 0) return false
      const r = host.tx({
        ops: targets.map((t) => ({ op: 'setAdvanceTime', target: { slide: t.slideIndex }, ms: t.ms })),
      })
      return r !== null
    },

    getShowTiming: (slideIndex: number) => {
      const slide = host.opened?.deck.slides[slideIndex]
      if (!slide) return { advanceMs: null, narrationIds: [] }
      return { advanceMs: getSlideAdvanceTime(slide), narrationIds: [] }
    },

    setAnimations: (op: { slideIndex: number; animations: unknown }) => {
      const r = host.tx({
        ops: [{ op: 'setAnimations', target: { slide: op.slideIndex }, animations: op.animations }],
      })
      return r !== null
    },

    getNotes: (slideIndex: number) => {
      const opened = host.opened
      const slide = opened?.deck.slides[slideIndex]
      return opened && slide ? getSlideNotes(opened.archive, slide.path) : ''
    },

    setNotes: (op: { slideIndex: number; text: string }) => {
      const r = host.tx({ ops: [{ op: 'setNotes', target: { slide: op.slideIndex }, text: op.text }] })
      if (r) host.markMetaDirty()
      return r !== null
    },

    getComments: (slideIndex: number) => {
      const opened = host.opened
      const slide = opened?.deck.slides[slideIndex]
      return opened && slide ? getSlideComments(opened.archive, slide.path) : []
    },

    addComment: (op: { slideIndex: number; text: string }) => {
      const opened = host.opened
      const slide = opened?.deck.slides[op.slideIndex]
      if (!opened || !slide) return null
      const r = host.tx({
        ops: [
          {
            op: 'addComment',
            target: { slide: op.slideIndex },
            author: settings.read().authorName || 'GenOffice',
            text: op.text,
          },
        ],
      })
      if (!r) return null
      host.markMetaDirty()
      return getSlideComments(opened.archive, slide.path)
    },

    deleteComment: (op: { slideIndex: number; authorId: string; idx: number }) => {
      const opened = host.opened
      const slide = opened?.deck.slides[op.slideIndex]
      if (!opened || !slide) return null
      const r = host.tx({
        ops: [
          { op: 'deleteComment', target: { slide: op.slideIndex }, authorId: op.authorId, idx: op.idx },
        ],
      })
      if (!r) return null
      host.markMetaDirty()
      return getSlideComments(opened.archive, slide.path)
    },

    getSections: () => (host.opened ? getSections(host.opened) : []),

    // ---- transactions (AI / batch surfaces) -------------------------------------------
    applyTxn: (req: { ops?: unknown; isolation?: string; dryRun?: boolean }) => host.applyTxn(req),

    applyEditScript: (op: { slideIndex: number; ops?: unknown } & Record<string, unknown>) => {
      const opened = host.opened
      if (!opened) return null
      const ops = mapScriptOps(opened, op as unknown as Parameters<typeof mapScriptOps>[1])
      if (ops.length === 0) return null
      const plan = runTxn(opened, { ops, dryRun: true })
      if (plan.failures?.length) return { error: plan.failures[0]!.error }
      host.pushHistory()
      const r = runTxn(opened, { ops })
      if (!r.applied) {
        host.popHistory()
        return { error: r.failures?.[0]?.error ?? 'the transaction could not be applied' }
      }
      host.markMetaDirty()
      let rendered = host.rebuildSlide(op.slideIndex)
      for (const rec of r.records ?? []) {
        const o = rec.op
        const id = o.target?.el
        if (!id || o.group || !rendered) continue
        if (o.op === 'setText') {
          if ((rec.after as { levelDirty?: boolean } | undefined)?.levelDirty) continue
          rendered = host.applyAutofitResize(op.slideIndex, id, rendered)
          rendered = host.syncAutofitScale(op.slideIndex, id, rendered)
        } else if (o.op === 'setFont' || o.op === 'setParagraphFormat') {
          rendered = host.applyAutofitResize(op.slideIndex, id, rendered)
          rendered = host.syncAutofitScale(op.slideIndex, id, rendered)
        }
      }
      return rendered ? { slide: rendered } : null
    },
  }

  return methods
}
