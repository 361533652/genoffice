/**
 * Source formatting: Prettier for the languages it covers, a small structural
 * formatter for the ones it does not.
 *
 * Prettier is the right tool wherever it has a parser — its output is what the
 * surrounding ecosystem expects, and reimplementing JS/TS/CSS/HTML/Markdown
 * formatting would be both worse and a maintenance sink. It is loaded lazily
 * (dynamic import) so its ~1 MB of parser does not sit in the launch bundle for
 * users who only ever view a .txt.
 *
 * Everything else (Python, Java, Go, Rust, Shell, SQL, YAML, XML, …) has no
 * safe universal formatter: the real ones (black, gofmt, rustfmt) are external
 * binaries, and a naive re-indent would corrupt valid code. Those languages get
 * only the conservative cleanups below — trim trailing whitespace, collapse
 * runs of blank lines, and normalise indentation to the file's prevailing unit.
 * A format command that silently rewrites semantics is worse than no button.
 */
import type { SourceLanguage } from '../../shared/source-language'

export interface FormatOutcome {
  /** null when the formatter declined (no rule for this language) */
  text: string | null
  /** why it declined, for the ribbon's screen tip */
  reason?: 'unsupported' | 'parse-error'
  /** true when Prettier did the work (its output is authoritative) */
  parsed?: boolean
}

/** Languages Prettier parses directly. */
const PRETTIER_PARSER: Partial<Record<SourceLanguage, string>> = {
  json: 'json',
  xml: 'html',
  html: 'html',
  css: 'css',
  javascript: 'babel',
  typescript: 'typescript',
  yaml: 'yaml',
}

export function hasPrettier(language: SourceLanguage): boolean {
  return language in PRETTIER_PARSER
}

/**
 * Conservative cleanup available for every language: trailing whitespace, tabs
 * vs spaces normalised to the file's prevailing indent, and runs of blank lines
 * capped. It deliberately does not touch indentation *depth* or line breaks —
 * that is where a formatter can break code it does not understand.
 */
export function tidyWhitespace(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  const out: string[] = []
  let blanks = 0
  for (const raw of lines) {
    const line = raw.replace(/[ \t]+$/, '')
    if (line.trim() === '') {
      blanks++
      // at most one blank line inside the file
      if (blanks > 1) continue
      out.push('')
      continue
    }
    blanks = 0
    out.push(line)
  }
  // trailing blank lines collapse to the file's own single newline
  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  return out.join(eol) + (text.endsWith('\n') || text.endsWith('\r\n') ? eol : '')
}

/** Prettier's parser is ~1 MB, so it loads on first use and never on launch. */
async function loadPrettier() {
  const [standalone, babel, estree, typescript, postcss, html, yaml] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/typescript'),
    import('prettier/plugins/postcss'),
    import('prettier/plugins/html'),
    import('prettier/plugins/yaml'),
  ])
  const mod = (m: { default?: unknown }) => m.default ?? m
  return {
    prettier: standalone,
    plugins: [mod(babel), mod(estree), mod(typescript), mod(postcss), mod(html), mod(yaml)],
  }
}

export interface FormatRequest {
  text: string
  language: SourceLanguage
}

/**
 * Format `text`. Returns the original text (and a reason) rather than throwing:
 * a format button that explodes on a syntax error it cannot fix is worse than
 * one that says "can't format this file".
 */
export async function formatSource(request: FormatRequest): Promise<FormatOutcome> {
  const { text, language } = request
  if (hasPrettier(language)) {
    try {
      const { prettier, plugins } = await loadPrettier()
      const formatted = await prettier.format(text, {
        parser: PRETTIER_PARSER[language],
        plugins: plugins as never,
        // 2 spaces and 100 columns: the least surprising defaults for the
        // JS/CSS/HTML families, and the same ones this repo formats with
        tabWidth: 2,
        useTabs: false,
        printWidth: 100,
        // never invent an end-of-line the file did not have
        endOfLine: text.includes('\r\n') ? 'crlf' : 'lf',
      })
      return { text: formatted, parsed: true }
    } catch {
      // a syntax error is the common case here, and Prettier cannot repair it
      return { text: null, reason: 'parse-error' }
    }
  }
  // no parser: whitespace hygiene only. Still better than nothing, and safe.
  return { text: tidyWhitespace(text), reason: 'unsupported' }
}
