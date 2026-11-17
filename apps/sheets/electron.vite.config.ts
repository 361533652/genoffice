import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  main: {
    // @genoffice/* workspace packages ship TS source (no build step, no
    // compiled entry point) — externalizing them makes Node's ESM loader try
    // to resolve their relative imports at runtime and fail. Bundle those;
    // externalize everything else (Electron, zod, node builtins).
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          '@genoffice/ai-provider',
          '@genoffice/agent-core',
          '@genoffice/ai-search',
          '@genoffice/docx-engine',
          '@genoffice/file-parse',
          '@genoffice/electron-utils',
          '@genoffice/i18n',
          '@genoffice/pptx-render',
          '@genoffice/xlsx-gateway',
        ],
      }),
    ],
  },
  preload: {
    // Sandboxed preload scripts cannot require arbitrary npm packages at
    // runtime, so the drop-open bridge must be bundled, not externalized.
    plugins: [externalizeDepsPlugin({ exclude: ['@genoffice/electron-utils'] })],
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: [
        // The wasm workbook session pulls the gateway's streaming save pipeline
        // into the renderer. Its Node fallback (fs-node) must not enter the
        // browser graph: the session configures an in-memory host before any
        // gateway call, so the stub is never reached at runtime. The mobile
        // build has had this alias (vite.renderer.config.ts) since the session
        // landed; the Electron renderer build did not, and every desktop
        // Release since the session was added failed on node:fs/promises.
        {
          find: './fs-node',
          replacement: fileURLToPath(
            new URL('../../packages/xlsx-gateway/src/gateway/fs-browser-stub.ts', import.meta.url),
          ),
        },
      ],
    },
  },
})
