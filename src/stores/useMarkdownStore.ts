import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'
import DEFAULT_CONTENT from '../assets/TEMPLATE.md?raw'
import type { AppTheme, EditorMode, MarkdownFile } from '../types'
import { loadPreferences, savePreferences } from '../utils/preferences'
import { showConfirm } from '../composables/showConfirm'

let fileCounter = 0
function createId(): string {
  fileCounter += 1
  return `file-${Date.now()}-${fileCounter}`
}

export const useMarkdownStore = defineStore('markdown', () => {
  const prefs = loadPreferences()

  // 立即应用主题到 DOM，不依赖 Vue 响应式时序
  document.documentElement.dataset.theme = prefs.theme

  const tabs = ref<MarkdownFile[]>([])
  const activeId = ref<string>('')
  const theme = ref<AppTheme>(prefs.theme)
  const editorMode = ref<EditorMode>(prefs.editorMode)
  const showOutline = ref(prefs.showOutline)
  const showFileTree = ref(prefs.workspacePath ? prefs.showFileTree : false)
  const outlineWidth = ref(prefs.outlineWidth)
  const loading = ref(false)
  const workspacePath = ref(prefs.workspacePath)
  const readingMode = ref(false)
  const fileTreeWidth = ref(prefs.fileTreeWidth)

  const contentTheme = computed(() => theme.value === 'dark' ? 'dark' : 'light')
  const codeTheme = computed(() => theme.value === 'dark' ? 'a11y-dark' : 'github')

  const activeFile = computed(
    () => tabs.value.find((t) => t.id === activeId.value) ?? null,
  )
  const content = computed(() => activeFile.value?.content ?? '')
  const fileName = computed(() => activeFile.value?.name ?? 'Untitled')
  const isSaved = computed(() => activeFile.value?.saved ?? true)

  watchEffect(() => {
    savePreferences({
      theme: theme.value,
      editorMode: editorMode.value,
      showOutline: showOutline.value,
      showFileTree: showFileTree.value,
      outlineWidth: outlineWidth.value,
      fileTreeWidth: fileTreeWidth.value,
      workspacePath: workspacePath.value,
    })
  })

  let unwatchFile: (() => void) | null = null

  async function startFileWatch(path: string) {
    stopFileWatch()
    try {
      const { watch } = await import('@tauri-apps/plugin-fs')
      unwatchFile = await watch(path, async (event) => {
        const kind = event.type
        if (typeof kind === 'object' && 'modify' in kind) {
          const file = tabs.value.find((t) => t.path === path)
          if (file) {
            const { readTextFile } = await import('@tauri-apps/plugin-fs')
            try {
              const text = await readTextFile(path)
              file.content = text
              file.saved = true
            } catch { /* silent */ }
          }
        }
      }, { delayMs: 300 })
    } catch { /* watch not supported or permission denied */ }
  }

  function stopFileWatch() {
    unwatchFile?.()
    unwatchFile = null
  }

  async function reloadActiveFile() {
    const file = activeFile.value
    if (!file?.path) return

    if (!file.saved) {
      const confirmed = await showConfirm({
        title: 'Reload File',
        message: 'File has unsaved changes. Reload from disk will overwrite them.',
        confirmLabel: 'Reload',
        cancelLabel: 'Keep mine',
      })
      if (!confirmed) return
    }

    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs')
      const text = await readTextFile(file.path)
      file.content = text
      file.saved = true
    } catch { /* silent */ }
  }

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

  watchEffect(async () => {
    const file = activeFile.value
    if (file?.path) {
      startFileWatch(file.path)
      if (file.saved) {
        try {
          const { readTextFile } = await import('@tauri-apps/plugin-fs')
          const text = await readTextFile(file.path)
          file.content = text
          file.saved = true
        } catch { /* silent */ }
      }
    } else {
      stopFileWatch()
    }
  })

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
  }

  function setOutlineWidth(width: number) {
    outlineWidth.value = width
  }

  return {
    tabs,
    activeId,
    activeFile,
    content,
    theme,
    contentTheme,
    codeTheme,
    editorMode,
    showOutline,
    showFileTree,
    outlineWidth,
    loading,
    workspacePath,
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
    setOutlineWidth,
    reloadActiveFile,
  }
})
