/**
 * CodeMirror grammars, one per source language.
 *
 * Two tiers on purpose:
 *  - first-party `@codemirror/lang-*` parsers where they exist (real incremental
 *    parsing, brackets, indentation)
 *  - `@codemirror/legacy-modes` StreamLanguage wrappers for the long tail. Those
 *    are the mature CodeMirror 5 grammars re-exported; carrying a full parser
 *    for every language would add megabytes to the bundle for highlighting
 *    nobody expects to be authoritative.
 *
 * Grammars are immutable, so each is built once and shared by every editor
 * mount —a fresh instance per file would only cost memory.
 */
import type { Extension } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { javascript } from '@codemirror/lang-javascript'
import { xml } from '@codemirror/lang-xml'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { sql } from '@codemirror/lang-sql'
import { yaml } from '@codemirror/lang-yaml'
import { php } from '@codemirror/lang-php'
import { clojure } from '@codemirror/legacy-modes/mode/clojure'
import { cmake } from '@codemirror/legacy-modes/mode/cmake'
import { crystal } from '@codemirror/legacy-modes/mode/crystal'
import { d } from '@codemirror/legacy-modes/mode/d'
import { erlang } from '@codemirror/legacy-modes/mode/erlang'
import { fortran } from '@codemirror/legacy-modes/mode/fortran'
import { gas } from '@codemirror/legacy-modes/mode/gas'
import { groovy } from '@codemirror/legacy-modes/mode/groovy'
import { haskell } from '@codemirror/legacy-modes/mode/haskell'
import { julia } from '@codemirror/legacy-modes/mode/julia'
import { lua } from '@codemirror/legacy-modes/mode/lua'
import { pascal } from '@codemirror/legacy-modes/mode/pascal'
import { perl } from '@codemirror/legacy-modes/mode/perl'
import { powerShell } from '@codemirror/legacy-modes/mode/powershell'
import { properties } from '@codemirror/legacy-modes/mode/properties'
import { protobuf } from '@codemirror/legacy-modes/mode/protobuf'
import { r } from '@codemirror/legacy-modes/mode/r'
import { ruby } from '@codemirror/legacy-modes/mode/ruby'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { swift } from '@codemirror/legacy-modes/mode/swift'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import { vb } from '@codemirror/legacy-modes/mode/vb'
import type { SourceLanguage } from '../../shared/source-language'

const cFamily = () => cpp()

const BUILDERS: Partial<Record<SourceLanguage, () => Extension>> = {
  json: () => json(),
  xml: () => xml(),
  html: () => html(),
  css: () => css(),
  javascript: () => javascript(),
  typescript: () => javascript({ jsx: true, typescript: true }),
  python: () => python(),
  java: () => java(),
  c: cFamily,
  cpp: cFamily,
  csharp: cFamily,
  objectivec: cFamily,
  rust: () => rust(),
  go: () => go(),
  sql: () => sql(),
  yaml: () => yaml(),
  php: () => php(),
  ruby: () => streamMode(ruby),
  lua: () => streamMode(lua),
  perl: () => streamMode(perl),
  shell: () => streamMode(shell),
  powershell: () => streamMode(powerShell),
  // cmd.exe batch is close enough to PowerShell's tokenizer for keywords and
  // strings; CodeMirror ships no batch grammar and the alternative is nothing
  batch: () => streamMode(powerShell),
  toml: () => streamMode(toml),
  ini: () => streamMode(properties),
  cmake: () => streamMode(cmake),
  groovy: () => streamMode(groovy),
  clojure: () => streamMode(clojure),
  haskell: () => streamMode(haskell),
  erlang: () => streamMode(erlang),
  swift: () => streamMode(swift),
  julia: () => streamMode(julia),
  crystal: () => streamMode(crystal),
  fortran: () => streamMode(fortran),
  pascal: () => streamMode(pascal),
  vb: () => streamMode(vb),
  d: () => streamMode(d),
  protobuf: () => streamMode(protobuf),
  tex: () => streamMode(stex),
  assembly: () => streamMode(gas),
  r: () => streamMode(r),
}

const cache = new Map<SourceLanguage, Extension>()

/**
 * `@codemirror/legacy-modes` is typed against `@codemirror/streamparser`, a
 * package that no longer ships with the CM6 line. The runtime objects are the
 * same shape —StreamLanguage.define is exactly what that package did —so the
 * cast is over a version skew in the .d.ts files, not a behavioural lie.
 */
function streamMode(mode: unknown): Extension {
  return StreamLanguage.define(mode as Parameters<typeof StreamLanguage.define>[0])
}

/** The grammar extension for a language, or null when it has none (plain text). */
export function grammarFor(language: SourceLanguage): Extension | null {
  const hit = cache.get(language)
  if (hit) return hit
  const build = BUILDERS[language]
  if (!build) return null
  const built = build()
  cache.set(language, built)
  return built
}
