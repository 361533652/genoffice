import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Annotation, Compartment, EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightSpecialChars,
  highlightActiveLineGutter,
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from '@codemirror/commands'
import {
  HighlightStyle,
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import type { FindTarget } from '@genoffice/ui'
import type { SourceLanguage } from '../../shared/source-language'
import { grammarFor } from './grammars'
import { buildFindTarget, findHighlight } from './plain-find'

/** Marks the load dispatch so replacing the buffer is not read back as a user edit */
const Loaded = Annotation.define<boolean>()

export interface PlainTextEditorHandle {
  /** replace the buffer without marking the document dirty (the initial file load) */
  setDoc(text: string): void
  focus(): void
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  findTarget(): FindTarget | null
  /** current buffer text (format reads it, then writes back through replaceAll) */
  getText(): string
  /** replace the whole buffer as one undoable edit, marking it a real user edit */
  replaceAll(text: string): void
}

interface Props {
  initialText: string
  /** the grammar to highlight with; the caller resolves it from the file name */
  language: SourceLanguage
  onChange: (text: string) => void
  className?: string
  spellcheck: boolean
}

/** Colors come from the app's own tokens so the source view follows the light/dark theme.
 *
 *  The tag list covers both parser families: Lezer grammars emit the structural
 *  tags (keyword/typeName/className), legacy StreamLanguage modes emit the
 *  CM5-style ones (atom/propertyName/variableName/operator). One style serving
 *  both is why every row below is repeated for a second tag rather than split
 *  into two HighlightStyles — CodeMirror applies the last matching rule, so a
 *  second `syntaxHighlighting(...)` would silently drop the first. */
const highlight = HighlightStyle.define([
  { tag: [tags.propertyName, tags.attributeName], color: 'var(--accent)' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--success)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--danger)' },
  {
    tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword, tags.operatorKeyword],
    color: 'var(--accent)',
  },
  {
    tag: [tags.typeName, tags.className, tags.namespace, tags.standard(tags.name)],
    color: 'var(--accent)',
  },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: 'var(--accent)',
  },
  {
    tag: [tags.definition(tags.variableName), tags.definition(tags.propertyName)],
    color: 'var(--text)',
  },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  { tag: [tags.meta, tags.processingInstruction, tags.annotation], color: 'var(--text-muted)' },
  { tag: [tags.tagName, tags.angleBracket], color: 'var(--accent)' },
  {
    tag: [tags.bracket, tags.punctuation, tags.separator, tags.operator],
    color: 'var(--text-muted)',
  },
  { tag: [tags.variableName, tags.labelName], color: 'var(--text)' },
  { tag: [tags.heading, tags.strong], fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: [tags.link, tags.url], color: 'var(--accent)', textDecoration: 'underline' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.invalid, color: 'var(--danger)' },
])

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--surface)', color: 'var(--text)' },
  '.cm-scroller': {
    fontFamily: "'SF Mono', Menlo, Consolas, monospace",
    fontSize: '13px',
    lineHeight: '1.6',
  },
  '.cm-content': { caretColor: 'var(--text)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text)' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground':
    { backgroundColor: 'var(--accent-soft)' },
  '.cm-activeLine': { backgroundColor: 'var(--hover)' },
  '.cm-gutters': {
    backgroundColor: 'var(--surface)',
    color: 'var(--text-muted)',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLineGutter': { backgroundColor: 'var(--hover)' },
})

function extensionsFor(language: SourceLanguage) {
  // the grammar for this file, or nothing for plain text — prose highlighted as
  // if it were code is worse than not highlighted at all
  const grammar = grammarFor(language)
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    syntaxHighlighting(highlight),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
    ...(grammar ? [grammar] : []),
    findHighlight,
    theme,
    EditorView.lineWrapping,
  ]
}

export const PlainTextEditor = forwardRef<PlainTextEditorHandle, Props>(function PlainTextEditor(
  { initialText, language, onChange, className, spellcheck },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const spellRef = useRef<Compartment | null>(null)
  const findTargetRef = useRef<FindTarget | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const listeners = new Set<() => void>()
    // spellcheck is a live preference, so it lives in a compartment rather
    // than in the extension set that identifies this editor
    const spellCompartment = new Compartment()
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialText,
        extensions: [
          ...extensionsFor(language),
          spellCompartment.of(EditorView.contentAttributes.of({ spellcheck: String(spellcheck) })),
          EditorView.updateListener.of((update) => {
            // the load dispatch must not read back as a user edit
            if (update.transactions.some((tr) => tr.annotation(Loaded))) return
            if (!update.docChanged) return
            onChangeRef.current(view.state.doc.toString())
            for (const listener of listeners) listener()
          }),
        ],
      }),
    })
    viewRef.current = view
    spellRef.current = spellCompartment
    findTargetRef.current = buildFindTarget(view, (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    })
    return () => {
      view.destroy()
      viewRef.current = null
      spellRef.current = null
      findTargetRef.current = null
    }
    // the buffer is seeded once; later external replacements go through setDoc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  useEffect(() => {
    const view = viewRef.current
    const compartment = spellRef.current
    if (!view || !compartment) return
    view.dispatch({
      effects: compartment.reconfigure(
        EditorView.contentAttributes.of({ spellcheck: String(spellcheck) }),
      ),
    })
  }, [spellcheck])

  useImperativeHandle(ref, () => ({
    setDoc(text) {
      const view = viewRef.current
      if (!view || view.state.doc.toString() === text) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
        annotations: Loaded.of(true),
      })
    },
    focus: () => viewRef.current?.focus(),
    undo: () => (viewRef.current ? undo(viewRef.current) : false),
    redo: () => (viewRef.current ? redo(viewRef.current) : false),
    canUndo: () => (viewRef.current ? undoDepth(viewRef.current.state) > 0 : false),
    canRedo: () => (viewRef.current ? redoDepth(viewRef.current.state) > 0 : false),
    findTarget: () => findTargetRef.current,
    getText: () => viewRef.current?.state.doc.toString() ?? '',
    replaceAll(text) {
      const view = viewRef.current
      if (!view || view.state.doc.toString() === text) return
      // no Loaded annotation: a format IS a user edit, so it must mark the
      // document dirty and be undoable as one step
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
    },
  }))

  return <div ref={hostRef} className={className} />
})
