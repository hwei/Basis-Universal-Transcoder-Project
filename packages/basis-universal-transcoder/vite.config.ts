import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['demo/**/*'],
      rollupTypes: true
    })
  ],
  // 让资源使用相对路径引用
  base: './',
  build: {
    // 禁用资产内联（0 表示所有资产都不内联）
    assetsInlineLimit: 0,
    // 手动配置 Rollup 输出，模拟库模式
    rollupOptions: {
      // 指定入口（类似于 lib.entry）
      input: resolve(__dirname, 'src/index.ts'),
      treeshake: {
        moduleSideEffects: true,
      },
      external: [],
      preserveEntrySignatures: 'exports-only',
      output: {
        // ES 模块输出（推荐用于现代库）
        format: 'es',
        // 输出目录
        dir: 'dist',
        // 入口文件名（无哈希，便于 package.json 引用）
        entryFileNames: '[name].mjs',
        // 分块文件名
        chunkFileNames: 'chunks/[name].[hash].mjs',
        // 资产文件名（WASM 等会放到 assets/ 下）
        assetFileNames: (assetInfo) => {
          if (assetInfo.names.findIndex((name) => name.endsWith('.wasm')) >= 0) {
            return 'assets/[name].wasm';  // WASM 单独处理
          }
          return 'assets/[name].[hash][extname]';  // 其他资产
        },
      },
    },
    sourcemap: true,
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