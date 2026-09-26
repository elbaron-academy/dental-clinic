/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// The backend is proxied so the browser talks to a single origin, exactly
// like production where /api and /admin are routed to Django.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Shown in the UI: the package version plus the git commit the server built from.
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  const target = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000'
  const proxy = {
    '/api': { target, changeOrigin: false },
    '/admin': { target, changeOrigin: false },
    '/static': { target, changeOrigin: false },
  }

  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_COMMIT__: JSON.stringify(env.VITE_APP_COMMIT ?? ''),
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Dental Clinic',
          short_name: 'Dental Clinic',
          description: 'Patients, appointments, visits and payments for a small dental clinic.',
          lang: 'en',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'any',
          theme_color: '#0f766e',
          background_color: '#f4f7f7',
          categories: ['medical', 'productivity'],
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App shell only: clinical data always comes fresh from the API.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/admin\//, /^\/static\//],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
    },
  }
})
