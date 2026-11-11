import { describe, expect, it } from 'vitest'
import { OPENABLE_DOC_RE, KNOWN_UNSUPPORTED_DOC_RE } from '@genoffice/electron-utils'
import { TEXT_RE, appForPath } from '../src/main/app-routing'
import { TREE_FILE_EXTENSIONS } from '../src/main/folder-tree'

/**
 * The drift this guards against, for real: `.json` was openable by double-click
 * (it had a file association and the router knew it) but the drop bridge's own
 * pattern did not list it, so dragging the file did nothing. Every list that
 * decides "can we open this" now derives from one place, and these assertions
 * are what keep it that way.
 */

/** Extensions the suite opens as plain text / source code. */
const SOURCE_SAMPLE = [
  'json',
  'jsonc',
  'txt',
  'log',
  'xml',
  'svg',
  'yaml',
  'toml',
  'css',
  'scss',
  'js',
  'ts',
  'tsx',
  'py',
  'rb',
  'php',
  'java',
  'kt',
  'c',
  'cpp',
  'h',
  'cs',
  'go',
  'rs',
  'swift',
  'lua',
  'sh',
  'ps1',
  'bat',
  'sql',
  'r',
  'tex',
]

describe('the drop bridge opens every source format the app routes', () => {
  it('accepts each sampled source extension', () => {
    for (const ext of SOURCE_SAMPLE) {
      expect(OPENABLE_DOC_RE.test(`/tmp/file.${ext}`), `.${ext} on drop`).toBe(true)
    }
  })

  it('still refuses the formats it advertises as unsupported', () => {
    for (const ext of ['pages', 'key', 'numbers', 'rtf']) {
      expect(KNOWN_UNSUPPORTED_DOC_RE.test(`/tmp/file.${ext}`), `.${ext} unsupported`).toBe(true)
    }
  })

  it('leaves non-documents alone', () => {
    for (const name of ['/tmp/photo.png', '/tmp/clip.mp4', '/tmp/archive.zip']) {
      expect(OPENABLE_DOC_RE.test(name), name).toBe(false)
    }
  })
})

describe('the launch, drop, route, tree and dialog lists agree', () => {
  it('routes every source extension to the markdown app', () => {
    for (const ext of SOURCE_SAMPLE) {
      expect(appForPath(`/x/file.${ext}`), `.${ext}`).toBe('markdown')
    }
  })

  it('shows every source extension in the folder tree', () => {
    for (const ext of SOURCE_SAMPLE) {
      expect(TREE_FILE_EXTENSIONS.has(ext), `.${ext}`).toBe(true)
    }
  })

  it('routes every text extension through TEXT_RE, and nothing else', () => {
    for (const ext of ['md', 'markdown', 'json', 'txt', 'rs', 'py', 'yaml']) {
      expect(TEXT_RE.test(`/x/file.${ext}`), `.${ext}`).toBe(true)
    }
    // html keeps its own rich app
    for (const ext of ['html', 'htm', 'docx', 'pdf', 'png']) {
      expect(TEXT_RE.test(`/x/file.${ext}`), `.${ext}`).toBe(false)
    }
  })
})
