import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    // 14200 落在 Windows 保留端口段 14113–14212，绑定会报 EACCES
    port: 14220,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 14221 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
