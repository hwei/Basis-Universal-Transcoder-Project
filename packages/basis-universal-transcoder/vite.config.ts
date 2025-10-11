import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    dts({
      tsconfigPath: './tsconfig.lib.json',
      rollupTypes: true
    })
  ],
  // 让资源使用相对路径引用
  base: './',
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name]-[hash].mjs',
      }
    }
  },
  
  server: {
    port: 3150,
    fs: {
      allow: ['..', '../..']
    },
    open: '/demo/index.html'
  },
  publicDir: 'public',
  optimizeDeps: {
    include: ['three']
  }
})