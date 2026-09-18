import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
    watch: { ignored: ['**/playwright-report*/**', '**/test-results*/**'] },
    proxy: {
      '/api/v2': { target: 'http://127.0.0.1:5080', changeOrigin: true },
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
