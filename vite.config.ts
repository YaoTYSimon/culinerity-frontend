/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: process.env.DEV_SERVER_HOST || '127.0.0.1',
    port: parseInt(process.env.PORT || '8443'),
    strictPort: true,
    // Dev only: /api goes to the local Culinerity server (npm run server).
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8787' },
  },
  preview: {
    host: process.env.DEV_SERVER_HOST || '127.0.0.1',
    port: parseInt(process.env.PORT || '8443'),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    globals: true,
  },
})
