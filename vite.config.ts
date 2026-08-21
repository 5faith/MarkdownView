import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { existsSync, mkdirSync, cpSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'

const host = process.env.TAURI_DEV_HOST

const publicVditorDist = resolve(__dirname, 'public/vditor/dist')
if (!existsSync(publicVditorDist)) {
  const nodeModulesDist = resolve(__dirname, 'node_modules/vditor/dist')
  if (existsSync(nodeModulesDist)) {
    console.log('[vditor] public/vditor/dist missing, copying from node_modules...')
    mkdirSync(resolve(__dirname, 'public/vditor'), { recursive: true })
    cpSync(nodeModulesDist, publicVditorDist, { recursive: true })
    console.log('[vditor] copy done')
  } else {
    console.error('[vditor] node_modules/vditor/dist not found, run pnpm install first')
  }
}

function vditorPatch(): Plugin {
  return {
    name: 'vditor-patch',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('vditor')) return
      if (!code.includes('unpkg.com/vditor')) return
      let result = code
      result = result.replace(/"https?:\/\/unpkg\.com\/vditor@[^"]*"\.concat\("[^"]*"\)/g, '"/vditor"')
      result = result.replace(/https?:\/\/unpkg\.com\/vditor[^'")\s\\]*/g, '/vditor')
      return result
    },
  }
}

export default defineConfig({
  plugins: [vue(), vditorPatch()],
  clearScreen: false,
  server: {
    port: 14200,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 14201 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
