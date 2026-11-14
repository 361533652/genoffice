/**
 * Package the six editors + the xlsx wasm engine into the Android app's assets.
 *
 * The APK ships the SAME production bundles the browser host runs — that is
 * the point of the web route: one codebase, and the 5.7–14.7 MB first-load
 * download becomes a one-time install cost.
 *
 * Usage:
 *   node apps/mobile/scripts/copy-web-assets.mjs            # build + copy
 *   node apps/mobile/scripts/copy-web-assets.mjs --skip-build
 *
 * Builds use --base=./ so asset URLs resolve relative to each app's
 * index.html under /assets/web/<app>/ (the WebViewAssetLoader path).
 */
import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..', '..')
const mobile = join(here, '..')
const assets = join(mobile, 'app', 'src', 'main', 'assets')
const APPS = ['docs', 'sheets', 'slides', 'pdf', 'markdown', 'html']
const VITE_ENTRY = join(repo, 'node_modules', 'vite', 'bin', 'vite.js')
const WASM = join(
  repo, 'apps', 'sheets', 'native', 'xlsx-engine',
  'target', 'wasm32-wasip1', 'release', 'xlsx_sidecar.wasm',
)
const skipBuild = process.argv.includes('--skip-build')

function run(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`exit ${code}: ${args.join(' ')}`))))
  })
}

if (!existsSync(WASM)) {
  console.error('wasm engine missing. Build it first:')
  console.error('  cd apps/sheets/native/xlsx-engine && cargo build --target wasm32-wasip1 --release')
  process.exit(1)
}

for (const app of APPS) {
  const cwd = join(repo, 'apps', app)
  const dist = join(cwd, 'src', 'renderer', 'dist')
  if (!skipBuild) {
    console.log(`building ${app}…`)
    await run([VITE_ENTRY, 'build', '--config', 'vite.renderer.config.ts', '--base=./'], cwd)
  }
  if (!existsSync(join(dist, 'index.html'))) {
    console.error(`${app}: no dist/index.html — build it first (or drop --skip-build)`)
    process.exit(1)
  }
  const target = join(assets, 'web', app)
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  cpSync(dist, target, { recursive: true })
  console.log(`copied ${app} → assets/web/${app}`)
}

const wasmTarget = join(assets, 'wasm')
mkdirSync(wasmTarget, { recursive: true })
cpSync(WASM, join(wasmTarget, 'xlsx_sidecar.wasm'))
console.log(`copied wasm engine (${(statSync(WASM).size / 1024 / 1024).toFixed(1)} MB) → assets/wasm/`)
console.log('done. Build the APK: gradle -p apps/mobile assembleDebug')
