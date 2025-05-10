import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5000,
    // 开发环境代理配置
    proxy: {
      '/': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true
      },
      '/websocket': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
