/**
 * Plain-text source formats the suite opens in its source editor.
 *
 * One list, not five: the drop bridge, the shell's path router, the open-dialog
 * filter, the folder tree and the markdown app's text-mode picker all have to
 * agree on what "a text file we open" means. They drifted once (JSON was
 * openable by double-click but silently swallowed on drop), so the list lives
 * here and everything else derives from it.
 *
 * Everything named here has a grammar in the source editor
 * (apps/markdown/src/renderer/source/grammars.ts) — an extension is only listed
 * once it highlights as something. `.txt`/`.log` are the deliberate exception:
 * openable, no grammar.
 */

/** JSON family */
export const JSON_EXTS = ['json', 'jsonc', 'json5', 'webmanifest', 'map'] as const

/** XML family */
export const XML_EXTS = [
  'xml',
  'xsl',
  'xslt',
  'svg',
  'plist',
  'csproj',
  'xaml',
  'rss',
  'atom',
] as const

/** HTML family. Rich-app owned: `apps/html` opens .html/.htm, so they are not
 *  part of SOURCE_CODE_EXTS. */
export const HTML_EXTS = ['html', 'htm', 'xhtml'] as const

/** CSS family */
export const CSS_EXTS = ['css', 'scss', 'less'] as const

/** JavaScript / TypeScript family */
export const JS_EXTS = [
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'tsx',
  'mts',
  'cts',
  'vue',
  'svelte',
  'astro',
] as const

/** Python / Ruby / PHP / Perl / Lua */
export const SCRIPT_EXTS = ['py', 'pyi', 'pyw', 'rb', 'php', 'pl', 'pm', 'lua'] as const

/** JVM family */
export const JVM_EXTS = [
  'java',
  'kt',
  'kts',
  'scala',
  'groovy',
  'gradle',
  'clj',
  'cljs',
  'edn',
] as const

/** C family */
export const C_EXTS = [
  'c',
  'h',
  'cc',
  'cpp',
  'cxx',
  'hpp',
  'hh',
  'hxx',
  'cs',
  'm',
  'mm',
  'swift',
] as const

/** Systems languages */
export const SYSTEMS_EXTS = ['go', 'rs', 'dart', 'd'] as const

/** Functional family */
export const FUNCTIONAL_EXTS = ['hs', 'erl', 'hrl', 'jl', 'cr'] as const

/** Shell / PowerShell / batch */
export const SHELL_EXTS = ['sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1', 'bat', 'cmd'] as const

/** Data / config / query */
export const DATA_EXTS = [
  'yaml',
  'yml',
  'toml',
  'ini',
  'conf',
  'cfg',
  'env',
  'properties',
  'sql',
  'proto',
] as const

/** Other small languages worth highlighting */
export const OTHER_EXTS = ['r', 'tex'] as const

/** Markdown and everything the block editor keeps */
export const MARKDOWN_SOURCE_EXTS = ['md', 'markdown'] as const

/** Plain text: openable, no grammar. `.csv`/`.tsv` stay with the spreadsheet
 *  app, so they are deliberately absent. */
export const PLAIN_EXTS = ['txt', 'log', 'text'] as const

/** Every extension the source editor can show, in one flat list. HTML is left
 *  out on purpose: `.html`/`.htm` have their own rich app, so routing them here
 *  would take the file away from it. */
export const SOURCE_CODE_EXTS: readonly string[] = [
  ...JSON_EXTS,
  ...XML_EXTS,
  ...CSS_EXTS,
  ...JS_EXTS,
  ...SCRIPT_EXTS,
  ...JVM_EXTS,
  ...C_EXTS,
  ...SYSTEMS_EXTS,
  ...FUNCTIONAL_EXTS,
  ...SHELL_EXTS,
  ...DATA_EXTS,
  ...OTHER_EXTS,
  ...MARKDOWN_SOURCE_EXTS,
  ...PLAIN_EXTS,
]

/** `data.json` → `json` (lower-cased, no dot). Empty for an extensionless name. */
export function extOfName(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot < 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

export function isSourceExt(ext: string): boolean {
  return SOURCE_CODE_EXTS.includes(ext)
}

/** A regex alternation safe to embed in `\.(${...})` */
export const SOURCE_EXTS_RE_PART = SOURCE_CODE_EXTS.join('|')
