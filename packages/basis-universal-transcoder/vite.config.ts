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
    // 最小化代码变换 - 只做 TS 到 JS 转换
    minify: false,
    target: 'esnext',
    rollupOptions: {
      output: {
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name]-[hash].mjs',
        format: 'es',
        // 保持原始代码结构，不进行额外的变换
        compact: false,
        indent: '  ',
      },
      // 保持所有依赖内联
      external: [],
      // 严格保持入口签名
      preserveEntrySignatures: 'strict',
    }
  },
  
  server: {
    port: 3150,
  },
  publicDir: 'public',
})