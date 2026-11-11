// plain text and source code open as source: the block editor would reinterpret
// `---`, `*x*`, `1.` and normalise line endings, rewriting an unedited file
import { languageForName, type SourceLanguage } from './source-language'

export type TextMode = 'markdown' | 'source'

const MARKDOWN_RE = /\.(md|markdown)$/i

/** 'markdown' for an untitled path: that is what New and AI auto-naming mean by it. */
export function textModeForPath(path: string | null | undefined): TextMode {
  if (!path) return 'markdown'
  if (MARKDOWN_RE.test(path)) return 'markdown'
  return 'source'
}

export function isSourceMode(mode: TextMode): boolean {
  return mode !== 'markdown'
}

/** The language a path's source view highlights as. */
export function sourceLanguageForPath(path: string | null | undefined): SourceLanguage {
  return path ? languageForName(path) : 'plain'
}
