import { onMounted, onUnmounted } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { useFileOperation } from './useFileOperation'
import { runFormat } from '../shared/editor'
import { isMarkdownFile } from '../utils/fileType'

export function useKeyboardShortcuts() {
  const store = useMarkdownStore()
  const fileOps = useFileOperation()

  function handler(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey

    if (e.key === 'Escape' && store.readingMode) {
      e.preventDefault()
      store.readingMode = false
      return
    }

    if (e.key === 'F5') {
      e.preventDefault()
      store.reloadActiveFile()
      store.refreshFileTree()
      return
    }

    // Ctrl+Z / Ctrl+Y：焦点在 Milkdown 内时交给其原生键位（history 插件已绑 Mod-z/Mod-y），
    // 焦点在外面（如刚点完工具栏按钮）由全局接管；源码/CodeMirror 用各自原生撤销
    if ((ctrl && !shift && e.key.toLowerCase() === 'z') || (ctrl && e.key.toLowerCase() === 'y')) {
      const inMilkdown = !!(document.activeElement as HTMLElement | null)?.closest?.('.milkdown')
      if (!inMilkdown && !store.sourceMode && !store.readingMode && store.activeFile && isMarkdownFile(store.activeFile.name)) {
        e.preventDefault()
        runFormat(ctrl && !shift && e.key.toLowerCase() === 'z' ? 'undo' : 'redo')
      }
      return
    }

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
      case shift && e.key === 'O':
        e.preventDefault()
        fileOps.openFolder()
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
        fileOps.exportPdf()
        break
      case e.key === 'r':
        e.preventDefault()
        store.toggleReadingMode()
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
