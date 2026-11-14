/**
 * Verify that every app's production bundle actually runs.
 *
 * The dev server resolves bare specifiers through its own graph and injects
 * polyfills on demand; a production bundle resolves everything at build time and
 * inlines only what it traced. "Works in dev" therefore does not imply "works in
 * a WebView" — and the Android host ships the built output.
 *
 * For each app: build it, serve dist/ with vite preview, load it in a 390px
 * viewport with no preload, and require the UI to render with no page errors.
 *
 * Usage: node tools/verify-mobile-builds.mjs [app...]
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const APPS = ['docs', 'sheets', 'slides', 'pdf', 'markdown', 'html']
const selected = process.argv.slice(2).length ? process.argv.slice(2) : APPS

/**
 * Resolve vite's own binary instead of going through npx.
 *
 * Spawning `npx` needs `shell: true` on Windows (it is npx.cmd there), and that
 * shell mode concatenates arguments unescaped — a deprecation warning now and a
 * quoting hazard later. The binary is in the workspace's node_modules.
 */
// Windows cannot spawn a .cmd without a shell, so run vite's JS entry directly
// with the current node binary. Cross-platform and no shell quoting involved.
const VITE_ENTRY = join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js')

/** Run a command to completion, resolving with its exit code. */
function run(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VITE_ENTRY, ...args], { cwd, stdio: 'ignore' })
    child.on('error', () => resolve(1))
    child.on('close', (code) => resolve(code ?? 1))
  })
}

/** Start a process and resolve once its port answers. */
async function startPreview(cwd, port) {
  const child = spawn(
    process.execPath,
    [VITE_ENTRY, 'preview', '--config', 'vite.renderer.config.ts', '--host', '127.0.0.1', '--port', String(port)],
    { cwd, stdio: 'ignore' },
  )
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250))
    try {
      const res = await fetch('http://127.0.0.1:' + port + '/')
      if (res.ok) return child
    } catch {
      /* not up yet */
    }
  }
  throw new Error('preview did not start on ' + port)
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const failures = []
let port = 5301

for (const app of selected) {
  const cwd = join(process.cwd(), 'apps', app)
  if (!existsSync(join(cwd, 'package.json'))) {
    failures.push(app + ': no such app')
    continue
  }

  const built = await run(['build', '--config', 'vite.renderer.config.ts'], cwd)
  if (built !== 0) {
    failures.push(app + ': build failed')
    continue
  }

  let preview
  try {
    preview = await startPreview(cwd, port)
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load', timeout: 60_000 })
    await page.waitForTimeout(4_000)
    const state = await page.evaluate(() => ({
      title: document.title,
      text: document.body.innerText.length,
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    await context.close()

    // A bundle that failed to trace a dependency white-screens: an empty body and
    // a page error. The character threshold must stay low — the PDF app's correct
    // empty state is the eight characters "没有要打开的文件", so anything higher
    // reports a healthy build as broken.
    if (state.text < 4) failures.push(app + ': rendered no UI')
    else if (state.innerWidth !== 390) failures.push(app + ': viewport ' + state.innerWidth)
    else if (state.scrollWidth > 390) failures.push(app + ': overflows at ' + state.scrollWidth)
    else if (errors.length) failures.push(app + ': ' + errors[0].slice(0, 120))
    else console.log('ok   ' + app.padEnd(9) + state.title)
  } finally {
    preview?.kill()
    port++
  }
}

await browser.close()
if (failures.length) {
  console.error('\nFAILED:')
  for (const f of failures) console.error('  ' + f)
  process.exit(1)
}
console.log('\nall production bundles run')
