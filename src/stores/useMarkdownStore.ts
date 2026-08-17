import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { MarkdownFile, Theme } from '../types'
import DEFAULT_CONTENT from '../assets/TEMPLATE.md?raw'

let fileCounter = 0
function createId(): string {
  fileCounter += 1
  return `file-${Date.now()}-${fileCounter}`
}


export const useMarkdownStore = defineStore('markdown', () => {
  const tabs = ref<MarkdownFile[]>([])
  const activeId = ref<string>('')
  const theme = ref<Theme>('light')
  const showOutline = ref(true)
  const loading = ref(false)

  const activeFile = computed(
    () => tabs.value.find((t) => t.id === activeId.value) ?? null,
  )
  const content = computed(() => activeFile.value?.content ?? '')
  const fileName = computed(() => activeFile.value?.name ?? 'Untitled')
  const isSaved = computed(() => activeFile.value?.saved ?? true)

  function hasUnsaved(): boolean {
    return tabs.value.some((t) => !t.saved)
  }

  function addTab(file?: Partial<MarkdownFile>): string {
    const id = createId()
    const tab: MarkdownFile = {
      id,
      path: file?.path ?? '',
      content: file?.content ?? '',
      name: file?.name ?? 'Untitled',
      saved: file?.saved ?? true,
    }
    tabs.value.push(tab)
    activeId.value = id
    return id
  }

  function closeTab(id: string): void {
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    tabs.value.splice(idx, 1)
    if (tabs.value.length === 0) {
      activeId.value = ''
      return
    }
    if (activeId.value === id) {
      const nextIdx = Math.min(idx, tabs.value.length - 1)
      activeId.value = tabs.value[nextIdx]!.id
    }
  }

  function switchTab(id: string) {
    activeId.value = id
  }

  function setContent(value: string) {
    const file = activeFile.value
    if (file) {
      file.content = value
      file.saved = false
    }
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function toggleOutline() {
    showOutline.value = !showOutline.value
  }

  function setCurrentFile(file: MarkdownFile) {
    const existing = tabs.value.find(
      (t) => t.path === file.path && t.path !== '',
    )

    if (existing) {
      activeId.value = existing.id
      existing.content = file.content
      existing.saved = true
      return
    }
    const id = addTab(file)
    activeId.value = id
  }

  function markSaved() {
    const file = activeFile.value
    if (file) {
      file.saved = true
    }
  }

  function newFile() {
    addTab()
  }

  function initDefault() {
    if (tabs.value.length === 0) {
      addTab({ content: DEFAULT_CONTENT, name: 'Untitled', saved: true })
    }
  }

  return {
    tabs,
    activeId,
    activeFile,
    content,
    theme,
    showOutline,
    loading,
    fileName,
    isSaved,
    hasUnsaved,
    addTab,
    closeTab,
    switchTab,
    setContent,
    toggleTheme,
    toggleOutline,
    setCurrentFile,
    markSaved,
    newFile,
    initDefault,
  }
})
