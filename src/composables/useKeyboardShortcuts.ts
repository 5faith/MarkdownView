import { onMounted, onUnmounted } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { useFileOperation } from './useFileOperation'

export function useKeyboardShortcuts() {
  const store = useMarkdownStore()
  const fileOps = useFileOperation()

  function handler(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey

    if (!ctrl) return

    switch (true) {
      case shift && e.key === 'T':
        e.preventDefault()
        store.loadDefaultContent()
        break
      case e.key === 'n':
        e.preventDefault()
        fileOps.newFile()
        break
      case e.key === 'o':
        e.preventDefault()
        fileOps.openFile()
        break
      case e.key === 's':
        e.preventDefault()
        fileOps.saveFile()
        break
      case shift && e.key === 'S':
        e.preventDefault()
        fileOps.saveFileAs()
        break
      case e.key === 'p':
        e.preventDefault()
        document.querySelector<HTMLButtonElement>('[title="Export PDF"]')?.click()
        break
      case e.key === 'b':
        e.preventDefault()
        store.toggleOutline()
        break
      case shift && e.key === 'D':
        e.preventDefault()
        store.toggleTheme()
        break
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handler)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handler)
  })
}
