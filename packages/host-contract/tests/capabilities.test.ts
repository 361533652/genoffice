import { describe, expect, it } from 'vitest'
import {
  BROWSER_CAPABILITIES,
  DESKTOP_CAPABILITIES,
  NO_CAPABILITIES,
  supports,
  type HostCapabilities,
} from '../src/index.js'

describe('capability flags', () => {
  it('defaults every flag to false', () => {
    for (const value of Object.values(NO_CAPABILITIES)) expect(value).toBe(false)
  })

  it('declares the desktop host as fully capable', () => {
    for (const value of Object.values(DESKTOP_CAPABILITIES)) expect(value).toBe(true)
  })

  it('keeps local paths off in a browser', () => {
    // a browser never sees a real path; this flag gates every path-shaped API
    expect(BROWSER_CAPABILITIES.localPaths).toBe(false)
    expect(supports(BROWSER_CAPABILITIES, 'localPaths')).toBe(false)
  })

  it('answers supports() only when every requested flag is on', () => {
    expect(supports(BROWSER_CAPABILITIES, 'openFile', 'saveFile')).toBe(true)
    expect(supports(BROWSER_CAPABILITIES, 'openFile', 'saveInPlace')).toBe(false)
    expect(supports(DESKTOP_CAPABILITIES, 'localPaths', 'tabs', 'runCli')).toBe(true)
  })

  it('treats an empty requirement list as satisfied', () => {
    expect(supports(NO_CAPABILITIES)).toBe(true)
  })

  it('keeps the flag set identical across hosts', () => {
    const keys = Object.keys(NO_CAPABILITIES).sort()
    expect(Object.keys(DESKTOP_CAPABILITIES).sort()).toEqual(keys)
    expect(Object.keys(BROWSER_CAPABILITIES).sort()).toEqual(keys)
  })

  it('types the capability record as a closed set', () => {
    const caps: HostCapabilities = { ...NO_CAPABILITIES, openFile: true }
    expect(caps.openFile).toBe(true)
  })
})
