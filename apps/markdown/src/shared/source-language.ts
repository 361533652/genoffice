/**
 * Extension → language name. Pure data, no imports: the shell's main process
 * and the renderer both read it, and pulling CodeMirror into the main bundle
 * for a string table would be absurd. The grammars themselves live in
 * `renderer/source/grammars.ts`.
 */

export type SourceLanguage =
  | 'json'
  | 'xml'
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'ruby'
  | 'php'
  | 'java'
  | 'kotlin'
  | 'scala'
  | 'groovy'
  | 'clojure'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'objectivec'
  | 'swift'
  | 'go'
  | 'rust'
  | 'dart'
  | 'lua'
  | 'perl'
  | 'shell'
  | 'powershell'
  | 'batch'
  | 'sql'
  | 'yaml'
  | 'toml'
  | 'ini'
  | 'dockerfile'
  | 'cmake'
  | 'haskell'
  | 'erlang'
  | 'julia'
  | 'crystal'
  | 'fortran'
  | 'pascal'
  | 'vb'
  | 'd'
  | 'r'
  | 'tex'
  | 'protobuf'
  | 'assembly'
  | 'plain'

const EXT_LANGUAGE: Record<string, SourceLanguage> = {
  // data
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  webmanifest: 'json',
  map: 'json',
  // markup (html/htm route to the rich HTML app, but the source editor can
  // still be handed one — e.g. inside a folder tree preview)
  xml: 'xml',
  xsl: 'xml',
  xslt: 'xml',
  svg: 'xml',
  plist: 'xml',
  csproj: 'xml',
  xaml: 'xml',
  rss: 'xml',
  atom: 'xml',
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  // styles
  css: 'css',
  scss: 'css',
  less: 'css',
  // js / ts
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  vue: 'html',
  svelte: 'html',
  astro: 'html',
  // scripts
  py: 'python',
  pyi: 'python',
  pyw: 'python',
  rb: 'ruby',
  php: 'php',
  pl: 'perl',
  pm: 'perl',
  lua: 'lua',
  // JVM
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  groovy: 'groovy',
  gradle: 'groovy',
  clj: 'clojure',
  cljs: 'clojure',
  edn: 'clojure',
  // C family
  c: 'c',
  h: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  hxx: 'cpp',
  cs: 'csharp',
  m: 'objectivec',
  mm: 'objectivec',
  swift: 'swift',
  // systems
  go: 'go',
  rs: 'rust',
  dart: 'dart',
  d: 'd',
  // functional
  hs: 'haskell',
  erl: 'erlang',
  hrl: 'erlang',
  jl: 'julia',
  cr: 'crystal',
  // shells
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  psm1: 'powershell',
  bat: 'batch',
  cmd: 'batch',
  // data / config / query
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  conf: 'ini',
  cfg: 'ini',
  env: 'ini',
  properties: 'ini',
  sql: 'sql',
  proto: 'protobuf',
  // misc
  r: 'r',
  tex: 'tex',
  // plain text
  txt: 'plain',
  log: 'plain',
  text: 'plain',
  md: 'plain',
  markdown: 'plain',
}

/** `data.json` → 'json'; an unknown or extensionless name → 'plain'. */
export function languageForName(name: string): SourceLanguage {
  const dot = name.lastIndexOf('.')
  if (dot < 0 || dot === name.length - 1) return 'plain'
  return EXT_LANGUAGE[name.slice(dot + 1).toLowerCase()] ?? 'plain'
}

/** Human label for the status bar; algorithmic, so no locale table is needed. */
const LABELS: Record<SourceLanguage, string> = {
  json: 'JSON',
  xml: 'XML',
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  ruby: 'Ruby',
  php: 'PHP',
  java: 'Java',
  kotlin: 'Kotlin',
  scala: 'Scala',
  groovy: 'Groovy',
  clojure: 'Clojure',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  objectivec: 'Objective-C',
  swift: 'Swift',
  go: 'Go',
  rust: 'Rust',
  dart: 'Dart',
  lua: 'Lua',
  perl: 'Perl',
  shell: 'Shell',
  powershell: 'PowerShell',
  batch: 'Batch',
  sql: 'SQL',
  yaml: 'YAML',
  toml: 'TOML',
  ini: 'INI',
  dockerfile: 'Dockerfile',
  cmake: 'CMake',
  haskell: 'Haskell',
  erlang: 'Erlang',
  julia: 'Julia',
  crystal: 'Crystal',
  fortran: 'Fortran',
  pascal: 'Pascal',
  vb: 'Visual Basic',
  d: 'D',
  r: 'R',
  tex: 'TeX',
  protobuf: 'Protocol Buffers',
  assembly: 'Assembly',
  plain: 'Plain Text',
}

export function languageLabel(language: SourceLanguage): string {
  return LABELS[language]
}

/** Families the renderer can actually highlight (see renderer/source/grammars.ts). */
export const PARSED_LANGUAGES: readonly SourceLanguage[] = [
  'json',
  'xml',
  'html',
  'css',
  'javascript',
  'typescript',
  'python',
  'ruby',
  'php',
  'java',
  'kotlin',
  'scala',
  'groovy',
  'clojure',
  'c',
  'cpp',
  'csharp',
  'objectivec',
  'swift',
  'go',
  'rust',
  'dart',
  'lua',
  'perl',
  'shell',
  'powershell',
  'batch',
  'sql',
  'yaml',
  'toml',
  'ini',
  'haskell',
  'erlang',
  'julia',
  'crystal',
  'fortran',
  'pascal',
  'vb',
  'd',
  'r',
  'tex',
  'protobuf',
  'assembly',
] as const

export function hasGrammar(language: SourceLanguage): boolean {
  return PARSED_LANGUAGES.includes(language)
}
