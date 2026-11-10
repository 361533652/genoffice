// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { defaultAiSettings } from '@genoffice/ai-provider'
import { Home } from '../src/renderer/src/Home'
import { LocaleProvider } from '../src/renderer/src/locale'
import type { RecentEntry } from '../src/shared/home-api'

let root: Root
let container: HTMLDivElement
const files: RecentEntry[] = [
  {
    path: '/fixtures/brief.docx',
    name: 'brief.docx',
    ext: 'docx',
    mtimeMs: 1,
    sizeBytes: 10,
    starred: true,
  },
  {
    path: '/fixtures/budget.xlsx',
    name: 'budget.xlsx',
    ext: 'xlsx',
    mtimeMs: 2,
    sizeBytes: 20,
    starred: false,
  },
]
const page = (starred: boolean) =>
  vi.fn(async (query: { ext?: string; limit?: number }) => {
    const entries = files.filter(
      (file) => (!starred || file.starred) && (!query.ext || file.ext === query.ext),
    )
    return {
      entries: query.limit === 0 ? [] : entries,
      total: entries.length,
      totalAll: entries.length,
      offset: 0,
    }
  })

beforeEach(async () => {
  HTMLElement.prototype.scrollTo = vi.fn()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('No network in navigation tests')
    }),
  )
  window.aiOffice = {
    folderRoots: async () => [],
    onFolderChanged: () => () => {},
    recents: page(false),
    starred: page(true),
    starredGroups: async () => [],
    accountStatus: async () => ({ loggedIn: false }),
    onOpenSettings: () => () => {},
    onAccountLogin: () => () => {},
    kbList: async () => [],
    aiGetSettings: async () => defaultAiSettings(),
    aiGskStatus: async () => ({ loggedIn: false }),
    onAiSettingsChanged: () => () => {},
  } as unknown as Window['aiOffice']
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () =>
    root.render(createElement(LocaleProvider, { initial: 'en', children: createElement(Home) })),
  )
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})
function nav(label: string): HTMLButtonElement {
  return [...container.querySelectorAll<HTMLButtonElement>('.sidebar-nav button')].find(
    (button) => button.querySelector('.nav-label')?.textContent === label,
  )!
}
async function click(button: HTMLButtonElement) {
  expect(button).toBeTruthy()
  await act(async () => button.click())
}
function selected(): string[] {
  return [...container.querySelectorAll('.sidebar-nav .active .nav-label')].map(
    (label) => label.textContent!,
  )
}

describe('Home sidebar navigation', () => {
  // The Ask-AI nav entry and the Genspark cloud entry are gone from this build:
  // the sidebar only switches between Recent and Starred, and the type filter
  // survives the trip in both directions.
  it.each(['Recent', 'Starred'])('selects only %s and keeps the other entry unselected', async (from) => {
    await click(nav(from))
    expect(selected()).toEqual([from])
    expect(nav(from).getAttribute('aria-current')).toBe('page')
    const other = from === 'Recent' ? 'Starred' : 'Recent'
    expect(nav(other).hasAttribute('aria-current')).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('offers no Ask-AI or cloud nav entry', () => {
    expect(nav('Ask AI')).toBeUndefined()
    expect(nav('Cloud Projects')).toBeUndefined()
    expect(container.querySelectorAll('.sidebar-nav .nav-item')).toHaveLength(2)
  })

  it('keeps the file-type filter while switching views', async () => {
    const docs = [...container.querySelectorAll<HTMLButtonElement>('.filter-pill')].find(
      (button) => button.textContent === 'Docs',
    )!
    await click(docs)
    expect(container.querySelector('.content')?.textContent).toContain('brief.docx')
    expect(container.querySelector('.content')?.textContent).not.toContain('budget.xlsx')
    await click(nav('Starred'))
    expect(selected()).toEqual(['Starred'])
    await click(nav('Recent'))
    expect(container.querySelector('.filter-pill.active')?.textContent).toBe('Docs')
    expect(container.querySelector('.content')?.textContent).toContain('brief.docx')
    expect(container.querySelector('.content')?.textContent).not.toContain('budget.xlsx')
    expect(window.aiOffice.recents).toHaveBeenLastCalledWith(
      expect.objectContaining({ ext: 'docx' }),
    )
  })
})
