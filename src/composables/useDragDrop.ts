import { ref, onBeforeUnmount } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import type { MarkdownFile } from '../types'

export function useDragDrop() {
  const store = useMarkdownStore()
  const isDragging = ref(false)
  let unlisten: (() => void) | null = null

  async function setup() {
    const { getCurrentWebview } = await import('@tauri-apps/api/webview')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')

    unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
      if (event.payload.type === 'over') {
        isDragging.value = true
      } else if (event.payload.type === 'drop') {
        isDragging.value = false
        const paths = event.payload.paths

        let loaded = 0
        let skipped = 0

        for (const filePath of paths) {
          if (!isMarkdownFile(filePath)) {
            skipped++
            continue
          }

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
            skipped++
          }
        }

        if (skipped > 0 && loaded > 0) {
          showToast(`Loaded ${loaded} file(s), skipped ${skipped} non-Markdown file(s)`)
        } else if (skipped > 0 && loaded === 0) {
          showToast('No Markdown files found. Supported: .md, .markdown, .txt, .mdown, .mkd')
        }
      } else {
        isDragging.value = false
      }
    })
  }

  function isMarkdownFile(name: string): boolean {
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    return ['md', 'markdown', 'txt', 'mdown', 'mkd'].includes(ext)
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
