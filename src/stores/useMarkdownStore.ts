import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import DEFAULT_CONTENT from '../assets/TEMPLATE.md?raw'
import type { MarkdownFile, Theme } from '../types'

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
  const workspacePath = ref<string>('')
  const showFileTree = ref(false)
  const readingMode = ref(false)
  const fileTreeWidth = ref(
    Number(localStorage.getItem('markdownview-filetree-width')) || 240,
  )

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

  function closeOtherTabs(id: string): void {
    const keep = tabs.value.find((t) => t.id === id)
    if (!keep) return
    tabs.value = [keep]
    activeId.value = id
  }

  function closeAllTabs(): void {
    tabs.value = []
    activeId.value = ''
  }

  function closeTabsInWorkspace(wsPath: string): void {
    tabs.value = tabs.value.filter((t) => !t.path.startsWith(wsPath))
    if (tabs.value.length === 0) {
      activeId.value = ''
    } else if (!tabs.value.find((t) => t.id === activeId.value)) {
      activeId.value = tabs.value[0]!.id
    }
  }

  function hasUnsavedInWorkspace(wsPath: string): boolean {
    return tabs.value.some((t) => t.path.startsWith(wsPath) && !t.saved)
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
    const hasLaunched = localStorage.getItem('markdownview-launched')
    if (tabs.value.length === 0) {
      if (!hasLaunched) {
        addTab({ content: DEFAULT_CONTENT, name: 'Untitled', saved: true })
        localStorage.setItem('markdownview-launched', '1')
      }
    }
  }

  function loadDefaultContent() {
    addTab({ content: DEFAULT_CONTENT, name: 'Untitled', saved: true })
  }

  function setWorkspace(path: string) {
    workspacePath.value = path
    showFileTree.value = true
  }

  function clearWorkspace() {
    workspacePath.value = ''
    showFileTree.value = false
  }

  function toggleFileTree() {
    if (!workspacePath.value) return
    showFileTree.value = !showFileTree.value
  }

  function toggleReadingMode() {
    readingMode.value = !readingMode.value
  }

  function setFileTreeWidth(width: number) {
    fileTreeWidth.value = width
    localStorage.setItem('markdownview-filetree-width', String(width))
  }

  return {
    tabs,
    activeId,
    activeFile,
    content,
    theme,
    showOutline,
    loading,
    workspacePath,
    showFileTree,
    readingMode,
    fileTreeWidth,
    fileName,
    isSaved,
    hasUnsaved,
    addTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    closeTabsInWorkspace,
    hasUnsavedInWorkspace,
    switchTab,
    setContent,
    toggleTheme,
    toggleOutline,
    setCurrentFile,
    markSaved,
    newFile,
    initDefault,
    loadDefaultContent,
    setWorkspace,
    clearWorkspace,
    toggleFileTree,
    toggleReadingMode,
    setFileTreeWidth,
  }
})
