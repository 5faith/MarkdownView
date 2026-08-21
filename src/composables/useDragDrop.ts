import { ref, onBeforeUnmount } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { isMarkdownFile } from '../utils/fileType'
import { openFolderInNewWindow } from './useFileOperation'
import type { MarkdownFile } from '../types'

export function useDragDrop() {
  const store = useMarkdownStore()
  const isDragging = ref(false)
  let unlisten: (() => void) | null = null

  async function setup() {
    const { getCurrentWebview } = await import('@tauri-apps/api/webview')
    const { readTextFile, stat } = await import('@tauri-apps/plugin-fs')

    unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
      if (event.payload.type === 'over') {
        isDragging.value = true
      } else if (event.payload.type === 'drop') {
        isDragging.value = false
        const paths = event.payload.paths

        const droppedDirs: string[] = []
        const markdownPaths: string[] = []

        for (const p of paths) {
          try {
            const s = await stat(p)
            if (s.isDirectory) {
              droppedDirs.push(p)
            } else if (isMarkdownFile(p)) {
              markdownPaths.push(p)
            }
          } catch {
            // skip inaccessible paths
          }
        }

        if (droppedDirs.length > 0) {
          for (const dir of droppedDirs) {
            if (store.workspacePath) {
              openFolderInNewWindow(dir)
            } else {
              store.setWorkspace(dir)
            }
          }
        } else {
          let loaded = 0

          for (const filePath of markdownPaths) {
            try {
              const text = await readTextFile(filePath)
              const name = filePath.split(/[\\/]/).pop() ?? filePath
              const mdFile: MarkdownFile = {
                id: '',
                path: filePath,
                content: text,
                name,
                saved: true,
              }
              store.setCurrentFile(mdFile)
              loaded++
            } catch {
              // skip unreadable files
            }
          }

          if (loaded === 0) {
            showToast('No Markdown files found. Supported: .md, .markdown, .txt, .mdown, .mkd')
          }
        }
      } else {
        isDragging.value = false
      }
    })
  }

  onBeforeUnmount(() => {
    unlisten?.()
  })

  return { isDragging, setup }
}

function showToast(message: string) {
  const existing = document.querySelector('.app-toast')
  if (existing) existing.remove()

  const el = document.createElement('div')
  el.className = 'app-toast'
  el.textContent = message
  document.body.appendChild(el)

  requestAnimationFrame(() => {
    el.classList.add('app-toast--visible')
  })

  setTimeout(() => {
    el.classList.remove('app-toast--visible')
    setTimeout(() => el.remove(), 300)
  }, 3000)
}
