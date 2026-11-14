/**
 * Legacy `window.desktop` bridge for hosts that have no Electron preload.
 *
 * The renderer has ~500 direct `window.desktop.*` call sites across six apps.
 * Rewriting them all before the mobile host can boot would mean shipping the
 * mobile app last instead of first, so this shim gives the existing call sites
 * a working object while the migration proceeds group by group:
 *
 *  - settings reads answer from the host's own store
 *  - file open/save use the File System Access API where available
 *  - event subscriptions (`onLanguageChanged`, `onThemeChanged`, …) return a
 *    no-op unsubscribe, because there is no shell to publish them
 *  - everything else resolves to `undefined` instead of throwing
 *
 * Every method here is a migration marker: delete the entry once the call site
 * has moved to `@genoffice/host`. The `console.debug` trace exists so a test can
 * assert which capabilities a screen actually reached for.
 */
import { grantFile, openViaPicker, rawFileFor, saveAnywhere, hasFilePicker } from './files.js'
import { createSettingsStore } from './settings.js'

/** Methods that return an unsubscribe function rather than a value. */
const SUBSCRIPTION_PATTERN = /^(on[A-Z]|arm[A-Z]|install[A-Z])/

/**
 * Methods whose answer the renderer feeds straight into `.length`.
 *
 * A host without an implementation cannot return `undefined` for these: the
 * renderer reads the result unguarded (`commentCount: comments.length`), so an
 * undefined answer is a blank screen rather than a missing feature. Name
 * prefixes are the honest signal we have — every list-shaped call in the six
 * apps is a `get*`/`list*` returning a collection.
 */
const LIST_LIKE_PATTERN = /^(get|list|fetch)[A-Z]/

/**
 * Names whose `get*` answer is an object, not a list. Derived from the call
 * sites that read fields off the result instead of iterating it.
 */
const OBJECT_LIKE_GETTERS = new Set([
  'getLayouts',
  'getPreviewInfo',
  'getRecentProjects',
  'getAiSettings',
  'getAiPanelPrefs',
  'getAutoSaveDefault',
  'getDocumentTheme',
  'getTheme',
  'getLanguage',
  'getSystemLocale',
  'getAuthorName',
  'getUserSettings',
  'getUserDisplayName',
  'getPathForFile',
  'getSlideSize',
  'getStatus',
  // font metrics and the "which faces are missing" report are read as objects by
  // the slides text layout path; undefined makes the caller guard for nothing
  'fontMetrics',
  'fontMissing',
  // the document's password-prompt intent: read as an object, and drawing a
  // revision number out of undefined is how the guard in the caller got added
  'docPasswordIntentRevision',
])

/**
 * Register a file the user picked, returning the handle the renderer stores.
 *
 * Delegates to the shared table in ./files.ts so that every file-facing piece
 * of the host — the legacy shim, FileAccess, the chunked PDF reader — resolves
 * the same handle. Two tables meant a handle readable through one path and
 * invisible through another.
 */
export function grantBrowserFile(file: File, handleId?: string): string {
  const id = grantFile(file, handleId)
  return id
}

/** The file behind a handle, if this session still has it. */
export function browserFileFor(handleId: string): File | null {
  return rawFileFor(handleId)
}

/**
 * Methods that must fail loudly rather than silently answer `undefined`.
 *
 * A generic no-op is right for a *probe* ("are there any recent files?") — the
 * honest answer is an empty list. It is wrong for an *action*: `splitPdf()`
 * returning undefined tells the UI its split succeeded when nothing happened,
 * and the user loses a file operation they believed they had performed.
 *
 * These are all desktop-only (native sidecars, certificates, printing, Zotero).
 * On a host without them the caller gets a rejected promise with a readable
 * message, which the app already surfaces as an error.
 */
const REQUIRES_DESKTOP = new Set([
  // pdf: file surgery runs in the main process
  'splitPdf',
  'mergePdf',
  'cropPages',
  'extractPages',
  'replacePages',
  'setPageSize',
  'mergePages',
  'reduceFileSize',
  'rewriteInPlace',
  'autoRename',
  'exportAttachment',
  'inspectCertificate',
  'listSystemCertificates',
  'pickCertificate',
  'releaseCertificate',
  'signWithCertificate',
  'addSavedSignature',
  'removeSavedSignature',
  'listStaticFormFills',
  'ocrPage',
  'convertOffice',
  'compareReadPdf',
  'compareReadOpen',
  // sheets: the workbook is written by the main process against a real file
  'saveWorkbookEdits',
  'writeWorkbookRecovery',
  'openWorkbooksForMerge',
  'exportImages',
  'saveMergedPdf',
  'saveImageAs',
  'writeExportImage',
  'saveRecording',
  'savePicture',
  'saveStyleSidecar',
  'saveStyleTemplate',
  // slides/pdf: the deck file is rewritten in the main process
  'slideSaveAs',
  'saveAs',
  // printing and native integrations
  'print',
  'printFile',
  'printPdfBuffer',
  // exportPdf is implemented above as a structured { ok: false } — callers read
  // result.ok, so a rejection there would lose the reason
  'runCli',
  'zoteroCommand',
  'openSourcePath',
  'openNewTab',
  'spellReplace',
  'spellAddWord',
  'spellIgnoreWord',
  // NB: respellKick / spellDiag / spellLanguages / spellSetLanguages are NOT
  // here. They are diagnostics and preference echoes the app fires without
  // awaiting, so rejecting them turned into unhandled rejections on every
  // document open. A neutral answer is correct for those.
  'focusDocsTab',
  'takeExportPdf',
  // slides: every edit goes through the main process, which owns the deck.
  // Resolving these to undefined made the editor look like it accepted an edit
  // (the command "succeeded") while nothing changed — measured: addSlide()
  // resolved, the deck stayed 1/1.
  'addElement', 'deleteElement', 'deleteElements',
  'addSlide', 'addBlankSlide', 'addSlideWithLayout',
  'copySlides', 'pasteSlide', 'deleteSlide', 'deleteSlides',
  'moveSlide', 'moveSlides', 'copyElements', 'copyElementsImage', 'pasteElements',
  'setSlideLayout', 'setSlideSize', 'setSlideHidden', 'setSlidesHidden',
  'setElementFont', 'setElementParagraphFormat', 'setShapeAdjust', 'setShapeGeometry',
  'setTextAnchor', 'setEffects', 'setTextBodyProps',
  'setTableColWidth', 'setTableRowHeight', 'setTableCellAnchor',
  'insertImage', 'insertImageUrl', 'insertMedia',
  'addImageBytes', 'addMediaBytes', 'addModel3d', 'setModel3dView',
  'replacePictureBytes', 'replacePictureUrl',
  'addTable', 'addInk', 'addChart', 'addSmartArt',
  'setLink', 'applyHeaderFooter', 'applyTheme',
  'setTransition', 'setAdvanceTimes', 'setAnimations', 'clearNarration',
  'setSections', 'addSection', 'renameSection', 'removeSection',
  'removeSectionSlides', 'moveSection',
  'setNotes', 'addComment', 'deleteComment',
  'applyEditScript', 'applyTxn', 'undo', 'redo',
  'printSlides', 'printerOptions',
  // sheets: the open path itself needs the main process — selectWorkbook()
  // returns a WorkbookFile carrying a sessionId the host creates. Without it the
  // app cannot open a workbook at all, and returning undefined left the open
  // button doing nothing with no message.
  'selectWorkbook',
  'openEncryptedWorkbook',
  'openWorkbookAtPath',
  // sheets: the remaining write path
  'updateWorkbookPassword', 'updateExternalLinks', 'autoRenameWorkbook',
  'printWorkbook', 'exportCsv',
  // pdf
  'insertPdf', 'insertBlankPage', 'splitPages',
  // markdown / html
  'createWikiNote', 'exportDocx', 'printHtml', 'setPresentFullScreen',

  // AI: every one of these proxies a request through the main process, which
  // holds the provider keys and does the streaming. Returning undefined made the
  // panel show "thinking" and then nothing, forever.
  'aiChat',
  'aiStream',
  'aiStreamCancel',
  'webSearch',
  'imageSearch',
  'fetchImage',
  'analyzeMedia',
  'aiGenerateImage',
  'generateImage',
  'aiGskStatus',
  'aiGskLogin',
  'setAiSettings',
  'openAiModelSettings',
  'openSkillsSettings',
  'createDocument',
  'kbList',
  'kbSearch',
  'kbRead',
  'skillsList',
  'skillText',
  'gskStatus',
  'runCli',
  'pickAttachments',
  'addAttachmentPaths',
  'addPastedImage',
  'readAttachment',
  'readAttachmentImage',
  'copyImageToClipboard',
])

/** What a call to a desktop-only method does on a host that lacks it. */
function desktopOnly(name: string): Promise<never> {
  return Promise.reject(
    new Error(
      `${name}() is only available in the GenOffice desktop app: it needs the main process, which a browser or WebView host does not have.`,
    ),
  )
}

/**
 * Names that ask a yes/no or "is there anything queued" question.
 *
 * Their honest answer on a host with no queue is `false`, and callers branch on
 * the value directly (`if (await hasQueuedWorkbook())`). Returning undefined also
 * takes the false branch, so this is not a bug fix — it makes the contract say
 * what it means instead of relying on every caller treating undefined as false.
 */
const BOOLEAN_PROBES = new Set([
  'hasQueuedWorkbook',
  'hasUnsavedChanges',
  'notifyPendingEdits',
  'consumeNewBlankWorkbook',
])

/** Names that return a collection without the usual get/list prefix. */
const EXTRA_LIST_ANSWERS = new Set(['privateFontFaces', 'listEditFonts', 'getComments'])

/** The empty value to answer with when an unknown method is called. */
function fallbackAnswer(name: string): unknown {
  if (EXTRA_LIST_ANSWERS.has(name)) return []
  if (OBJECT_LIKE_GETTERS.has(name)) return {}
  if (LIST_LIKE_PATTERN.test(name)) return []
  if (BOOLEAN_PROBES.has(name)) return false
  return undefined
}

type AnyFn = (...args: unknown[]) => unknown

export interface LegacyBridgeStats {
  /** number of distinct method names resolved so far */
  called: Set<string>
  /** method names that fell through to the default no-op */
  unmapped: Set<string>
}

/**
 * Global bridge names the six apps use today.
 *
 * Each app invented its own: docs reads `window.desktop`, sheets
 * `window.desktopApi`, slides `window.slidesApi`, and so on. The shim answers
 * all of them so an app can boot on a host that has none.
 */
export const LEGACY_BRIDGE_NAMES = [
  'desktop',
  'desktopApi',
  'aiOffice',
  'pdfApi',
  'sheetsApi',
  'slidesApi',
  'markdownApi',
  'htmlApi',
] as const

export function installLegacyDesktopBridge(
  target: Record<string, unknown> = globalThis as unknown as Record<string, unknown>,
  stats: LegacyBridgeStats = { called: new Set(), unmapped: new Set() },
  names: readonly string[] = LEGACY_BRIDGE_NAMES,
): LegacyBridgeStats {
  if (isLegacyDesktopBridge(target)) return stats

  const store = createSettingsStore()
  const noop = (): (() => void) => () => {}

  const explicit: Record<string, AnyFn> = {
    getLanguage: async () => store.read().language,
    getSystemLocale: async () => store.read().language,
    getTheme: async () => store.read().theme,
    getDocumentTheme: async () => store.read().documentTheme,
    getAuthorName: async () => store.read().authorName,
    // sheets shows this on comment threads; an empty string is the documented
    // "fall back to the built-in author" answer, undefined is not
    getUserDisplayName: async () => store.read().authorName,
    onUserDisplayNameChanged: noop,
    getAutoSaveDefault: async () => store.read().autoSave,
    getAiPanelPrefs: async () => store.read().aiPanelPrefs,
    setAiPanelPrefs: async (patch) => {
      const next = { ...store.read().aiPanelPrefs, ...(patch as Record<string, unknown>) }
      store.patch({ aiPanelPrefs: next })
      return next
    },
    openDocx: async () => {
      const picked = await openViaPicker('docx')
      if (!picked.ok) return null
      // prefer a blob over the bytes we already hold: no re-encode, no copy
      const granted = browserFileFor(picked.handle.id)
      return {
        path: picked.handle.id,
        name: picked.handle.name,
        dataUrl: granted
          ? URL.createObjectURL(granted)
          : bytesToDataUrl(picked.data),
        hash: picked.hash ?? '',
      }
    },
    /**
     * Save the open document back to where it came from.
     *
     * The desktop answer is `{ ok, path }` and every caller reads `result.ok`
     * first; returning undefined made them throw a TypeError whose message
     * ("Cannot read properties of undefined") then reached the user as a save
     * error. A structured failure says what actually happened.
     *
     * A real host supplies this through FileAccess.save(); the browser shim has
     * no writable destination for a document it only read, so it refuses.
     */
    saveDocx: async () => ({
      ok: false,
      reason: 'readonly',
      error: 'This host cannot save back to the original file. Use Save As.',
    }),
    saveDocxNew: async () => ({
      ok: false,
      reason: 'readonly',
      error: 'This host cannot create files without a picker. Use Save As.',
    }),
    saveDocxTo: async () => ({
      ok: false,
      reason: 'readonly',
      error: 'This host cannot write to a path. Use Save As.',
    }),
    exportHtml: async () => ({
      ok: false,
      error: 'HTML export needs the desktop app.',
    }),
    exportMarkdown: async () => ({
      ok: false,
      error: 'Markdown export needs the desktop app.',
    }),
    exportPdf: async () => ({
      ok: false,
      error: 'PDF export needs the desktop app.',
    }),
    setDocPassword: async () => ({
      ok: false,
      error: 'Document passwords need the desktop app.',
    }),
    saveDocxAs: async (_path: unknown, data: unknown) => {
      const bytes = toBytes(data)
      if (!bytes) return null
      // Preferred: the picker, which gives a writable handle for later saves. On an
      // Android browser or WebView there is no showSaveFilePicker, and refusing here
      // meant a user could edit a document and have nowhere to put it. A download is
      // a worse save (browser-chosen location, non-writable handle) but it is a save.
      const saved = await saveAnywhere(bytes, 'document.docx', 'docx')
      return saved.ok ? { path: saved.handle.id, name: saved.handle.name } : null
    },
    /**
     * "May I replace the open document?" — asked before an open discards the
     * current one.
     *
     * This cannot be a silent `true`. On the desktop the answer comes from a
     * dialog that also offers Save; answering true here means an open file would
     * throw away unsaved edits with no prompt and no chance to save, which is the
     * one outcome a confirmation must never produce. A host with no dialog
     * answers with the platform's own confirm when it has one, and refuses
     * otherwise.
     */
    confirmDocumentReplace: async () => {
      const ask = (globalThis as { confirm?: (message: string) => boolean }).confirm
      // a WebView always has one; a bare JS environment (tests) may not, and
      // then refusing is the safe answer rather than discarding silently
      if (typeof ask !== 'function') return false
      return ask('Open another document? Unsaved changes in this one will be lost.')
    },
    onLanguageChanged: noop,
    onThemeChanged: noop,
    onDocumentThemeChanged: noop,
    onAuthorNameChanged: noop,
    onAutoSaveDefaultChanged: noop,
    onAiPanelPrefsChanged: noop,
    onChromePressed: noop,
    onContextMenuRequest: noop,
    onViewImage: noop,
    onMenuCommand: noop,
    armContextMenu: () => undefined,
    claimContextMenu: () => undefined,
    listPrinters: async () => [],
    listDocsTabs: async () => [],

    // ---- write-shaped answers the app reads ---------------------------------
    // These all claim to write something. Resolving to undefined made callers
    // either throw on `result.ok` or silently believe the write happened.
    discardDocPasswordIntents: async () => ({ ok: false }),
    convertAltChunkHtml: async () => null,
    writeMergeOutput: async () => ({ ok: false, canceled: true }),
    respondToZotero: async () => ({ ok: false, error: 'Zotero needs the desktop app.' }),
    reportMcpResult: async () => ({ ok: false }),
    signalMcpReady: async () => ({ ok: false }),
    reportCloseCheck: async () => ({ ok: false }),
    reportCloseSaveResult: async () => ({ ok: false }),
    reportViewMenuState: async () => ({ ok: false }),
    // ---- state flag echoes --------------------------------------------------
    /**
     * The text editors' save (markdown, html).
     *
     * This was answered with { ok: false } on the reading that it is a fire-and-forget
     * "document is dirty" notification. It is not: no `desktop.save()` call exists in
     * any renderer, while markdown and html both `await save({ text, mode })` and read
     * `ok`/`path` from the answer. Measured before: editing a markdown file on a phone
     * and pressing Save produced { ok: false } with no message, and no way to keep the
     * work.
     *
     * The picker is absent on Android, so this writes through a download and returns a
     * synthetic path the caller can show. setDirty below really is a notification and
     * keeps its neutral ack.
     */
    save: async (request: unknown) => {
      const req = (request ?? {}) as { text?: unknown; suggestedName?: unknown }
      const text = typeof req.text === 'string' ? req.text : ''
      const suggested =
        typeof req.suggestedName === 'string' && req.suggestedName.trim()
          ? req.suggestedName.trim()
          : 'document.txt'
      const saved = await saveAnywhere(new TextEncoder().encode(text), suggested)
      return saved.ok
        ? { ok: true, path: saved.handle.id }
        : { ok: false, error: saved.error ?? 'Could not save this file.' }
    },
    setDirty: async () => ({ ok: false }),
    updatePreview: async () => ({ ok: false }),
    setProvisionalTitle: async () => ({ ok: false }),
    takeWikiFragment: async () => null,
    setShowFullScreen: async () => ({ ok: false }),
    saveImage: async () => ({ ok: false }),
    setMarkdownTheme: async () => ({ ok: false }),
    setImageHost: async () => ({ ok: false }),
    // a preference echo fired during mount, not awaited: a rejection here is an
    // unhandled error on every boot
    setAutoSavePref: async () => ({ ok: false }),

    // spelling diagnostics: fire-and-forget by the app, so they answer instead
    // of rejecting (a rejection here becomes an unhandled page error)
    respellKick: async () => ({ ok: false }),
    spellDiag: async () => ({ ok: false }),
    spellLanguages: async () => [],
    spellSetLanguages: async () => ({ ok: false }),
    // recovery copies are best-effort by design (the caller already catches),
    // but it must still answer so a future caller can tell
    writeRecoveryCopy: async () => ({ ok: false }),

    // ---- startup probes -------------------------------------------------
    // Every app asks "is there a document waiting to be opened?" on mount and
    // treats a thrown error as "this file is broken". On a host with no shell
    // the honest answer is "nothing pending", never undefined-for-a-value.
    consumePending: async () => null,
    consumePendingOpenDocx: async () => null,
    consumePendingOpen: async () => null,
    consumePendingOpenSheet: async () => null,
    consumeNewBlankDoc: async () => null,
    consumeAiDocContent: async () => null,
    consumeHeadlessExport: async () => null,
    getPreviewInfo: async () => ({ url: 'about:blank', version: 0 }),
    // markdown/html read the whole file as text once the host names it
    readFile: async (path: unknown) => {
      const file = typeof path === 'string' ? browserFileFor(path) : null
      return file ? await file.text() : ''
    },
    // ---- recent files / tabs -------------------------------------------
    getRecentFiles: async () => [],
    getRecentProjects: async () => ({ items: [], page: 0 }),
    getUserSettings: async () => ({}),

    // markdown / html: pick a text document and read it whole
    openMarkdown: async () => {
      const picked = await openViaPicker('markdown')
      if (!picked.ok) return null
      return picked.handle.id
    },
    openHtml: async () => {
      const picked = await openViaPicker('html')
      if (!picked.ok) return null
      return picked.handle.id
    },

    // the renderer asks for a path first, then reads it in chunks
    openPdf: async () => {
      const picked = await openViaPicker('pdf')
      if (!picked.ok) return null
      return { path: picked.handle.id, name: picked.handle.name }
    },

    // ---- pdf: chunked file reads ----------------------------------------
    // pdf.js streams through readFileChunk(path, offset, end) rather than
    // taking a whole buffer, so this returns real bytes when the handle names
    // a File the user granted, and an empty chunk otherwise.
    readFileChunk: async (path: unknown, offset: unknown, end: unknown) => {
      const file = typeof path === 'string' ? browserFileFor(path) : null
      if (!file) return { data: new Uint8Array(0), fileSize: 0 }
      const start = typeof offset === 'number' ? offset : 0
      const stop = typeof end === 'number' ? Math.min(end, file.size) : file.size
      const slice = file.slice(start, stop)
      return { data: new Uint8Array(await slice.arrayBuffer()), fileSize: file.size }
    },

    // ---- slides: a blank deck ------------------------------------------
    // slides boots by asking for a fresh deck when nothing is pending, and
    // `applyOpen(null)` is a no-op — so returning null here left the app stuck
    // on "Opening…" forever. A 16:9 slide at the requested fit width is what
    // the main process would have built.
    newBlank: async (fitWidthPx?: unknown) => ({
      path: '',
      slides: [blankRenderSlide(typeof fitWidthPx === 'number' ? fitWidthPx : 0)],
    }),

    // ---- clipboard / probe answers -------------------------------------
    clipboardProbe: async () => false,
    isDirty: async () => false,

    // ---- slides: list-shaped answers ------------------------------------
    // These feed `.length` straight into render state, so undefined crashes the
    // app rather than degrading it. Every method here is one the renderer reads
    // without a guard; add to this list when a crash points at one.
    getLayouts: async () => ({ layouts: [], themes: [] }),
    getAnimations: async () => [],
    getTransitions: async () => [],
    getInk: async () => [],
    getInkPresets: async () => [],
    getNotes: async () => '',
    getSlideComments: async () => [],
    getCustomShows: async () => [],
    getSections: async () => [],
    getMediaList: async () => [],
    listFonts: async () => [],
    getRecentFilesSlides: async () => [],
  }

  const bridge = new Proxy(explicit, {
    get(known, prop: string) {
      if (prop in known) {
        stats.called.add(prop)
        return known[prop]
      }
      if (typeof prop !== 'string') return undefined
      stats.called.add(prop)
      // Only report calls that resolve to `undefined`. A subscription is fully
      // answered by an unsubscribe function, an object-shaped getter by {}, a
      // list-shaped one by [], and a desktop-only action by a refusal — none of
      // those are gaps. Counting them made the audit read as 10-13 missing
      // capabilities when most were events that cannot fire on this host.
      const answered =
        SUBSCRIPTION_PATTERN.test(prop) ||
        OBJECT_LIKE_GETTERS.has(prop) ||
        REQUIRES_DESKTOP.has(prop) ||
        fallbackAnswer(prop) !== undefined
      if (!answered) stats.unmapped.add(prop)
      if (SUBSCRIPTION_PATTERN.test(prop)) {
        return (...args: unknown[]) => {
          const handler = args.find((a) => typeof a === 'function')
          if (handler) return () => {}
          return () => {}
        }
      }
      // an action the desktop owns fails loudly; a probe gets a neutral answer
      if (REQUIRES_DESKTOP.has(prop)) return () => desktopOnly(prop)
      // list-shaped answers come back as [], not undefined: the renderer reads
      // `.length` off them without a guard
      const answer = fallbackAnswer(prop)
      return async () => answer
    },
    has: () => true,
  })

  // brand the shim itself, not the window: a real preload assigned later must
  // read as a real preload without any extra bookkeeping
  Object.defineProperty(bridge, LEGACY_BRIDGE_BRAND, { value: true, enumerable: false })
  for (const name of names) {
    if (!target[name]) target[name] = bridge
  }

  // Expose what fell through, so a real device session can be audited afterwards.
  //
  // The fallback itself is deliberate: returning undefined lets an app boot on a
  // host that lacks a capability, which is why ~950 call sites keep working on a
  // phone. The cost is that a caller cannot tell "this host has no answer" from
  // "the answer is empty", and for a save-shaped method that difference is lost
  // user work. Recording the names does not change the behaviour; it makes the
  // gap observable — open the app, use it, then read this set.
  ;(target as Record<string, unknown>).__genofficeBridgeAudit = {
    called: () => [...stats.called],
    unmapped: () => [...stats.unmapped],
  }

  return stats
}

/** Marker property carried by the shim object itself. */
export const LEGACY_BRIDGE_BRAND = '__genofficeLegacyBridge'

/**
 * True when a global bridge namespace is our own fallback, not a real preload.
 *
 * Without this check the facade would mistake the shim for an Electron bridge
 * and report the desktop capability set on a phone (measured: the ribbon
 * reserved 150px of Windows caption-button space in a 390px browser viewport).
 */
export function isLegacyDesktopBridge(target: unknown = globalThis): boolean {
  const scope = target as Record<string, unknown> | null
  if (!scope) return false
  return Boolean(scope.desktop && (scope.desktop as Record<string, unknown>)[LEGACY_BRIDGE_BRAND] === true)
}

/** Does this host have any way to pick files at all? */
export function legacyBridgeHasFileAccess(): boolean {
  return hasFilePicker()
}

/**
 * A blank 16:9 slide, shaped like `RenderSlide` from @genoffice/pptx-render.
 *
 * The desktop main process builds this from a real .pptx template; a host with
 * no packager can describe the same geometry directly. 960x540 is PowerPoint's
 * widescreen baseline, which is what the renderer scales against.
 */
function blankRenderSlide(fitWidthPx: number): Record<string, unknown> {
  const baselineWidth = 960
  const scale = fitWidthPx > 0 ? fitWidthPx / baselineWidth : 1
  return {
    widthPx: baselineWidth * scale,
    heightPx: 540 * scale,
    scale,
    background: { kind: 'solid', color: '#ffffff' },
    nodes: [],
  }
}

function toBytes(data: unknown): Uint8Array | null {
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  return null
}

/**
 * Bytes as a URL the renderer can `fetch`.
 *
 * A blob URL, not a base64 data URL. Measured on a 20MB document: base64 took
 * 682ms and produced a 27.9MB string (1.33x the bytes, and every decoded copy
 * transiently doubles again) versus 5.6ms and a 63-character URL for a blob.
 * On a phone the data-URL route is an out-of-memory waiting to happen, and it
 * is also the wrong shape: `OpenFileResult.dataUrl` only ever says "fetch this
 * once", which a blob URL satisfies exactly.
 *
 * Callers that hold a File should prefer `URL.createObjectURL(file)` directly;
 * this exists for raw bytes.
 */
function bytesToDataUrl(bytes: Uint8Array): string {
  return URL.createObjectURL(new Blob([toArrayBuffer(bytes)]))
}

/** Copy bytes into a real ArrayBuffer (a view may sit on a SharedArrayBuffer). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}
