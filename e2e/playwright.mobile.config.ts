import { defineConfig } from '@playwright/test'
import { join } from 'node:path'

/**
 * Mobile host E2E config.
 *
 * Unlike the root config (which launches the built Electron shell), this one
 * drives each renderer's plain Vite dev server - the same way the Android
 * WebView host loads it, with no preload bridge.
 *
 * The six servers are declared here rather than expected to be running already.
 * Before this they were started by hand, and a forgotten one surfaced as
 * "connection refused" inside whichever test ran first, which reads like a test
 * bug rather than a setup one. Playwright now waits for all six, or fails with a
 * clear message naming the one that did not come up.
 *
 * Vite is resolved from the workspace root: it is hoisted, so apps/<app>/ has no
 * node_modules of its own.
 */

const ROOT = process.cwd()
const VITE_ENTRY = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')

/** dev servers, one per app: the specs assume these ports */
const APPS = [
  { name: 'docs', port: 5199 },
  { name: 'sheets', port: 5201 },
  { name: 'slides', port: 5202 },
  { name: 'pdf', port: 5203 },
  { name: 'markdown', port: 5204 },
  { name: 'html', port: 5205 },
]

export default defineConfig({
  testDir: '.',
  testMatch: /mobile-.*\.spec\.ts$/,
  outputDir: './test-results-mobile',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.MOBILE_BASE_URL ?? 'http://127.0.0.1:5199',
    browserName: 'chromium',
    channel: 'msedge',
  },
  webServer: APPS.map((app) => ({
    // During development the servers are often already up from a previous run;
    // in CI nothing listens and they get started here.
    command:
      '"' + process.execPath + '" "' + VITE_ENTRY + '" --config vite.renderer.config.ts --host 127.0.0.1 --port ' + app.port,
    cwd: join(ROOT, 'apps', app.name),
    url: 'http://127.0.0.1:' + app.port + '/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  })),
})
