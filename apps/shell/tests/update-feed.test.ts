/**
 * Auto-update wiring (fork build): the release page IS the update feed.
 *
 * These assertions are about the *packaging contract* — what electron-builder
 * bakes into app-update.yml and latest.yml — because that is the half that goes
 * wrong silently. An app with no feed never updates and never says so.
 */
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const configPath = resolve(import.meta.dirname, '../electron-builder.cjs')

/** Evaluate electron-builder.cjs with a controlled env (packaging is CLI-side) */
function loadConfig(env: Record<string, string> = {}) {
  const module = { exports: {} as Record<string, unknown> }
  runInNewContext(readFileSync(configPath, 'utf8'), {
    module,
    __dirname: resolve(import.meta.dirname, '..'),
    process: { platform: 'linux', arch: 'x64', env },
    require: (id: string) =>
      id === 'node:fs' ? { ...require(id), existsSync: () => true } : require(id),
  })
  return module.exports as {
    publish?: Array<Record<string, unknown>>
    nsis?: { artifactName?: string }
    extraMetadata?: { version?: string }
  }
}

describe('the release version', () => {
  /**
   * The bug this pins down: the workflow used to pass
   * `-c.extraMetadata.version=...`, which loses its leading dash through
   * cmd/npx on Windows. electron-builder then read the flag as a config FILE
   * path and every release build died with
   *   ENOENT ... apps\shell\.extraMetadata.version=0.12.6
   * The version now travels in an env var, which has no parsing to lose.
   */
  it('comes from GENOFFICE_APP_VERSION when the workflow sets it', () => {
    const config = loadConfig({ GENOFFICE_APP_VERSION: '0.12.42' })
    expect(config.extraMetadata?.version).toBe('0.12.42')
  })

  it('leaves the packaged version alone for a plain local build', () => {
    expect(loadConfig({}).extraMetadata?.version).toBeUndefined()
  })

  it('is not passed on the command line by the workflow', () => {
    const workflow = readFileSync(
      resolve(import.meta.dirname, '../../../.github/workflows/release-win.yml'),
      'utf8',
    )
    // the exact shape that failed: -c.extraMetadata.version=...
    // comments may mention it (the file explains the trap), run lines may not
    const runLines = workflow
      .split('\n')
      .filter((line) => !/^\s*#/.test(line))
      .join('\n')
    expect(runLines).not.toMatch(/-c\.extraMetadata/)
    expect(workflow).toContain('GENOFFICE_APP_VERSION')
  })
})

describe('the GitHub release feed', () => {
  it('bakes a github publish config when GENOFFICE_UPDATE_REPO is set', () => {
    const config = loadConfig({ GENOFFICE_UPDATE_REPO: 'someone/genoffice' })
    expect(config.publish).toEqual([
      {
        provider: 'github',
        owner: 'someone',
        repo: 'genoffice',
        releaseType: 'release',
      },
    ])
  })

  it('leaves publish unset for a plain local build, so no feed is advertised', () => {
    expect(loadConfig({}).publish).toBeUndefined()
  })

  it('prefers an explicit CDN URL over the repo, since it is the more specific ask', () => {
    const config = loadConfig({
      GENOFFICE_UPDATE_REPO: 'someone/genoffice',
      GENOFFICE_UPDATE_URL: 'https://cdn.example.com/updates',
    })
    expect(config.publish?.[0]?.provider).toBe('generic')
  })
})

describe('the installer artifact name', () => {
  /**
   * electron-builder's default is "GenOffice Setup <v>.exe" while the latest.yml
   * it writes lists the URL-escaped "GenOffice-Setup-<v>.exe" — so the feed
   * advertised a file that does not exist and every download 404'd. Pinning the
   * name is what keeps the artifact and its feed entry identical.
   */
  it('is pinned, so latest.yml and the uploaded asset agree', () => {
    const config = loadConfig({ GENOFFICE_UPDATE_REPO: 'o/r' })
    expect(config.nsis?.artifactName).toBe('GenOffice-Setup-${version}.${ext}')
  })

  it('resolves to a name with no space in it', () => {
    const template = loadConfig({}).nsis?.artifactName ?? ''
    expect(template.replace('${version}', '1.2.3').replace('${ext}', 'exe')).toBe(
      'GenOffice-Setup-1.2.3.exe',
    )
  })
})

describe('the release workflow publishes the feed', () => {
  const workflow = readFileSync(
    resolve(import.meta.dirname, '../../../.github/workflows/release-win.yml'),
    'utf8',
  )

  it('passes the repository to the packager', () => {
    expect(workflow).toContain('GENOFFICE_UPDATE_REPO: ${{ github.repository }}')
  })

  it('uploads latest.yml alongside the installer', () => {
    expect(workflow).toContain('latest.yml')
  })

  it('fails loudly when the feed file is missing', () => {
    // a silent skip here ships an app that can never update
    expect(workflow).toMatch(/latest\.yml missing/)
  })
})

describe('release artifacts on disk (only when a local package exists)', () => {
  const releaseDir = resolve(import.meta.dirname, '../release')
  const latestYml = resolve(releaseDir, 'latest.yml')

  it.skipIf(!existsSync(latestYml))('names a file that is actually there', () => {
    const yml = readFileSync(latestYml, 'utf8')
    const url = /^\s*-\s*url:\s*(\S+)$/m.exec(yml)?.[1]
    expect(url, 'latest.yml lists no artifact').toBeTruthy()
    expect(existsSync(resolve(releaseDir, url!)), `${url} is not in release/`).toBe(true)
  })
})
