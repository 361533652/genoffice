/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { formatSource, hasPrettier, tidyWhitespace } from '../src/renderer/source/format-source'

describe('tidyWhitespace', () => {
  it('trims trailing whitespace on every line', () => {
    expect(tidyWhitespace('a   \nb\t\nc')).toBe('a\nb\nc')
  })

  it('collapses runs of blank lines to one', () => {
    expect(tidyWhitespace('a\n\n\n\nb\n')).toBe('a\n\nb\n')
  })

  it('drops trailing blank lines but keeps the file newline', () => {
    expect(tidyWhitespace('a\n\n\n')).toBe('a\n')
    expect(tidyWhitespace('a\n\n\nb')).toBe('a\n\nb')
  })

  it('never invents or removes the final newline', () => {
    expect(tidyWhitespace('a')).toBe('a')
    expect(tidyWhitespace('a\n')).toBe('a\n')
  })

  it('keeps the file’s own line endings', () => {
    expect(tidyWhitespace('a  \r\nb\r\n')).toBe('a\r\nb\r\n')
  })

  it('leaves indentation depth alone — only trailing space is safe to touch', () => {
    const indented = 'def f():\n    return 1\n'
    expect(tidyWhitespace(indented)).toBe(indented)
  })

  it('is idempotent', () => {
    const messy = 'a  \n\n\n\n  b   \n\n\n'
    const once = tidyWhitespace(messy)
    expect(tidyWhitespace(once)).toBe(once)
  })
})

describe('hasPrettier', () => {
  it('claims the families Prettier actually parses', () => {
    for (const language of [
      'json',
      'xml',
      'html',
      'css',
      'javascript',
      'typescript',
      'yaml',
    ] as const) {
      expect(hasPrettier(language), language).toBe(true)
    }
  })

  it('declines the ones it has no parser for', () => {
    for (const language of ['python', 'rust', 'go', 'java', 'shell', 'sql', 'plain'] as const) {
      expect(hasPrettier(language), language).toBe(false)
    }
  })
})

describe('formatSource', () => {
  it('formats JSON through Prettier', async () => {
    const outcome = await formatSource({ text: '{"a":1,"b":[2,3]}', language: 'json' })
    expect(outcome.parsed).toBe(true)
    expect(outcome.text).toBe('{ "a": 1, "b": [2, 3] }\n')
  })

  it('formats CSS through Prettier', async () => {
    const outcome = await formatSource({ text: 'a{color:red}', language: 'css' })
    expect(outcome.parsed).toBe(true)
    expect(outcome.text).toContain('color: red;')
  })

  it('reports a syntax error instead of throwing or corrupting the file', async () => {
    const outcome = await formatSource({ text: '{"a": ', language: 'json' })
    expect(outcome.text).toBeNull()
    expect(outcome.reason).toBe('parse-error')
  })

  it('falls back to whitespace tidying where Prettier has no parser', async () => {
    const outcome = await formatSource({ text: 'x = 1   \n\n\n\ny = 2\n', language: 'python' })
    expect(outcome.reason).toBe('unsupported')
    expect(outcome.text).toBe('x = 1\n\ny = 2\n')
  })
})
