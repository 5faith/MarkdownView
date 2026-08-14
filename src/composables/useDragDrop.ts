import { ref } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import type { MarkdownFile } from '../types'

export function useDragDrop() {
  const store = useMarkdownStore()
  const isDragging = ref(false)

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = true
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = false

    const fileList = e.dataTransfer?.files
    if (!fileList || fileList.length === 0) return

    for (let i = 0; i < fileList.length; i++) {
      const droppedFile = fileList.item(i)
      if (!droppedFile || !isMarkdownFile(droppedFile.name)) continue

      const text = await droppedFile.text()
      const mdFile: MarkdownFile = {
        id: '',
        path: droppedFile.name,
        content: text,
        name: droppedFile.name,
        saved: true,
      }
      store.setCurrentFile(mdFile)
    }
  }

  function isMarkdownFile(name: string): boolean {
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    return ['md', 'markdown', 'txt', 'mdown', 'mkd'].includes(ext)
  }

  return { isDragging, onDragOver, onDragLeave, onDrop }
}
