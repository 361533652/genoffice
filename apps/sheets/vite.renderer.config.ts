import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// renderer-only dev server (embedded by the shell via SHEETS_RENDERER_URL for HMR; no standalone Electron)
export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  resolve: {
    alias: [
      // The wasm workbook session pulls the gateway's streaming save pipeline
      // into the renderer. Its Node fallback (fs-node) must not enter the
      // browser graph: the session configures an in-memory host before any
      // gateway call, so the stub is never reached at runtime.
      {
        find: './fs-node',
        replacement: fileURLToPath(
          new URL('../../packages/xlsx-gateway/src/gateway/fs-browser-stub.ts', import.meta.url),
        ),
      },
    ],
  },
  server: {
    port: Number(process.env.SHEETS_DEV_PORT) || 5174,
    strictPort: true,
  },
})
