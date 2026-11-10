import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

/**
 * Doc as last seen by the AI pipeline (context build / read / own write); a
 * differing doc means the user edited in between.
 *
 * Kept out of `ai/` on purpose: the ordinary edit paths (load, save, recovery)
 * only need to carry or reset this marker, and importing it from the tool
 * registry would pull the whole agent toolchain into those bundles.
 */
const docBaseline = new WeakMap<Editor, ProseMirrorNode>()

export function markDocSeen(editor: Editor): void {
  docBaseline.set(editor, editor.state.doc)
}

/** A streamed load tail is not a user edit: appending at the end keeps every block index the model saw valid. */
export function carryDocSeen(editor: Editor, before: ProseMirrorNode): void {
  if (docBaseline.get(editor) === before) docBaseline.set(editor, editor.state.doc)
}

export function editedExternally(editor: Editor): boolean {
  const seen = docBaseline.get(editor)
  return seen !== undefined && seen !== editor.state.doc
}
