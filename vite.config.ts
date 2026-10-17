import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { CREDITS_FILE, creditsText } from './scripts/credits.ts'

// GitHub Pages serves the app at https://ls11ae.github.io/ruler-of-the-plane/.
const base = '/ruler-of-the-plane/'

function commit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return 'local'
  }
}

/** Writes `credits.txt` (CREDITS.md and every licence text) next to the app; the credits screen shows it. */
function credits(): Plugin {
  const root = fileURLToPath(new URL('.', import.meta.url))
  return {
    name: 'credits',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: CREDITS_FILE, source: creditsText(root) })
    },
    configureServer(server) {
      server.middlewares.use(`${base}${CREDITS_FILE}`, (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(creditsText(root))
      })
    },
  }
}

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

export default defineConfig({
  base,
  plugins: [
    react(),
    credits(),
    // Offline after the first visit (booth laptops, phones): a service worker precaches the app,
    // fonts, art and all level JSON. A new version installs in the background and waits until the app
    // activates it and reloads, on the start map or the attract screen (src/main.tsx, shell/update.ts).
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Ruler of the Plane',
        short_name: 'Ruler',
        description: 'Spiele zur algorithmischen Geometrie (TU Dortmund)',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        background_color: '#ead6a8',
        theme_color: '#ead6a8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ttf,woff2,json,txt}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // The first install controls the open page at once (offline right away); later versions wait.
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: 'index.html',
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(`${version}+${commit()}`),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'),
  },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
