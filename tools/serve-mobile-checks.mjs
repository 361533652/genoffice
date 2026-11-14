/**
 * Serve the phone-facing checks on the LAN.
 *
 * Two things a real device needs to try, and the dev servers cannot help with
 * either: they bind 127.0.0.1, which a phone cannot reach.
 *
 *   5390  the IME/soft-keyboard self-check page (tools/mobile-ime-probe.html)
 *   5391  the docs editor, built and served as production output
 *
 * Both bind 0.0.0.0 and print the addresses to type into the phone. Ctrl-C stops
 * them.
 *
 * Usage: node tools/serve-mobile-checks.mjs [--build]
 *        --build  rebuild apps/docs before serving (default: use the last build)
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const DOCS = join(ROOT, 'apps', 'docs')
const TOOLS = join(ROOT, 'tools')
// vite is hoisted to the workspace root; the app has no node_modules of its own
const VITE_ENTRY = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')

const PROBE_PORT = 5390
const DOCS_PORT = 5391

/** Every non-loopback IPv4 address, which is what the phone should use. */
function lanAddresses() {
  const out = []
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address)
    }
  }
  return out
}

/** Serve tools/ statically; the probe page is the only entry. */
function startProbeServer() {
  const server = createServer(async (req, res) => {
    const name = req.url === '/' ? '/mobile-ime-probe.html' : req.url.split('?')[0]
    try {
      const body = await readFile(join(TOOLS, name))
      res.writeHead(200, {
        'Content-Type': name.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream',
      })
      res.end(body)
    } catch {
      res.writeHead(404)
      res.end('not found')
    }
  })
  server.listen(PROBE_PORT, '0.0.0.0')
  return server
}

function runBuild() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [VITE_ENTRY, 'build', '--config', 'vite.renderer.config.ts'], {
      cwd: DOCS,
      stdio: 'ignore',
    })
    child.on('close', (code) => resolve(code ?? 1))
  })
}

async function main() {
  if (process.argv.includes('--build')) {
    process.stdout.write('building apps/docs… ')
    const code = await runBuild()
    console.log(code === 0 ? 'ok' : 'FAILED')
    if (code !== 0) process.exit(1)
  }

  startProbeServer()
  const preview = spawn(
    process.execPath,
    [VITE_ENTRY, 'preview', '--config', 'vite.renderer.config.ts', '--host', '0.0.0.0', '--port', String(DOCS_PORT)],
    { cwd: DOCS, stdio: 'ignore' },
  )

  // give preview a moment so the printed URLs are usable
  await new Promise((r) => setTimeout(r, 2_500))

  const hosts = lanAddresses()
  console.log('\n手机上打开下面的地址（需与电脑同一 Wi-Fi）：\n')
  for (const host of hosts) {
    console.log('  输入法自检  http://' + host + ':' + PROBE_PORT + '/')
    console.log('  文档编辑器  http://' + host + ':' + DOCS_PORT + '/')
    console.log('')
  }
  if (hosts.length === 0) console.log('  未找到局域网地址，请检查网络连接。\n')
  console.log('Ctrl-C 结束。\n')

  const stop = () => {
    preview.kill()
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

await main()
