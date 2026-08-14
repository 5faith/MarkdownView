import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  server: {
    port: 14200,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 14201 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
