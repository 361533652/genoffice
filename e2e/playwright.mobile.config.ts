import { defineConfig } from '@playwright/test'

/**
 * Mobile host E2E config.
 *
 * Unlike the root config (which launches the built Electron shell), this one
 * drives the renderer's plain Vite dev server — the same way the Android
 * WebView host loads it, with no preload bridge. Keep the two configs separate:
 * the Electron suite needs a full `npm run build:all`, this one needs nothing
 * but the dev server.
 *
 * Start the server first, e.g.:
 *   cd apps/docs && npx vite --config vite.renderer.config.ts --host 127.0.0.1 --port 5199
 */
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
})
