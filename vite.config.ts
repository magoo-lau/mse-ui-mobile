import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 移动基站（租户端单模式）：生产部署于 /m/（nginx location /m/），dev server 直接以 /m/ 为 base，
// 与生产同构避免路径分叉。子应用 wujie 加载仍用 dev_entry（//localhost:42xx），与 PC 基座同约定。
export default defineConfig({
  base: '/m/',
  plugins: [vue()],
  server: {
    port: 3200,
    strictPort: true,
    host: true,
    proxy: {
      // 微服务形态指向网关时设 MSE_API_TARGET=http://localhost:48080
      '/api': {
        target: process.env.MSE_API_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
