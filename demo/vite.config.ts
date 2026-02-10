import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
  publicDir: resolve(__dirname, '../packages/basis-universal-transcoder/public'),
  resolve: {
    alias: {
      '@h00w/basis-universal-transcoder': resolve(__dirname, '../packages/basis-universal-transcoder/src/index.ts'),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
})
