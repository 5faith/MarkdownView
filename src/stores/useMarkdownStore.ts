import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ViewMode, Theme, MarkdownFile } from '../types'

let fileCounter = 0
function createId(): string {
  fileCounter += 1
  return `file-${Date.now()}-${fileCounter}`
}

const DEFAULT_CONTENT = `# Welcome to MarkdownView

A simple Markdown editor with split view, built with **Tauri 2** + **Vue 3** + **Vditor**.

## Features

- Split view: edit and preview side by side
- Full editor mode with Vditor toolbar
- Preview-only mode for reading
- Light / Dark theme switching
- File open / save / drag & drop
- Multi-file tabs
- Outline navigation

## Markdown Syntax

### Code

\`\`\`javascript
const greeting = 'Hello, MarkdownView!'
console.log(greeting)
\`\`\`

### Table

| Feature | Status |
|---------|--------|
| Split View | Done |
| Preview | Done |
| Theme | Done |
| Tabs | Done |

> Start editing to see the preview update in real time.
`

export const useMarkdownStore = defineStore('markdown', () => {
  const tabs = ref<MarkdownFile[]>([])
  const activeId = ref<string>('')
  const viewMode = ref<ViewMode>('split')
  const theme = ref<Theme>('light')
  const showOutline = ref(true)

  const activeFile = computed(() => tabs.value.find((t) => t.id === activeId.value) ?? null)
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

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function setCurrentFile(file: MarkdownFile) {
    const existing = tabs.value.find((t) => t.path === file.path && t.path !== '')
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

  function toggleOutline() {
    showOutline.value = !showOutline.value
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
    viewMode,
    theme,
    showOutline,
    fileName,
    isSaved,
    hasUnsaved,
    addTab,
    closeTab,
    switchTab,
    setContent,
    setViewMode,
    toggleTheme,
    toggleOutline,
    setCurrentFile,
    markSaved,
    newFile,
    initDefault,
  }
})
