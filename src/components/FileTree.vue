<template>
  <div class="file-tree" :style="{ width: store.fileTreeWidth + 'px' }">
    <div class="file-tree__header">
      <span class="file-tree__header-label">目录</span>
      <span class="file-tree__header-name" :title="store.workspacePath">{{ folderName }}</span>
      <button class="file-tree__act" title="新建文件" aria-label="新建文件" @click="createFile">＋</button>
      <button class="file-tree__act" title="新建文件夹" aria-label="新建文件夹" @click="createFolder">⊞</button>
      <button class="file-tree__act" title="关闭目录树" aria-label="关闭目录树" @click="store.clearWorkspace">✕</button>
    </div>

    <div class="file-tree__search">
      <input v-model="query" placeholder="筛选文件…" aria-label="筛选文件" />
      <div class="file-tree__filters" role="group" aria-label="筛选选项">
        <button
          type="button"
          class="file-tree__filter"
          :class="{ 'file-tree__filter--on': filterType === 'file' }"
          title="仅匹配文件"
          :aria-pressed="filterType === 'file'"
          @click="toggleType('file')"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 1.5h5.5L13 5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z" />
            <path d="M9.5 1.5V5H13" />
          </svg>
        </button>
        <button
          type="button"
          class="file-tree__filter"
          :class="{ 'file-tree__filter--on': filterType === 'directory' }"
          title="仅匹配目录"
          :aria-pressed="filterType === 'directory'"
          @click="toggleType('directory')"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1.5 3.5a1 1 0 0 1 1-1h3.2l1.6 2h6.2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z" />
          </svg>
        </button>
        <button
          type="button"
          class="file-tree__filter file-tree__filter--text"
          :class="{ 'file-tree__filter--on': useRegex }"
          title="正则表达式匹配"
          :aria-pressed="useRegex"
          @click="useRegex = !useRegex"
        >.*</button>
        <button
          type="button"
          class="file-tree__filter file-tree__filter--text"
          :class="{ 'file-tree__filter--on': caseSensitive }"
          title="区分大小写"
          :aria-pressed="caseSensitive"
          @click="caseSensitive = !caseSensitive"
        >Aa</button>
      </div>
    </div>

    <div class="file-tree__body">
      <template v-if="query">
        <div
          v-for="node in searchResults"
          :key="node.path"
          class="file-tree__hit"
          :class="{ 'file-tree__hit--active': node.path === (store.activeFile?.path ?? '') }"
          :title="node.path"
          @click="node.type === 'file' && openFile(node.path)"
        >
          <span class="file-tree__hit-icon">
            <template v-if="node.type === 'directory'">📁</template>
            <FileIcon v-else :name="node.name" :size="14" />
          </span>
          <span class="file-tree__hit-name">{{ node.name }}</span>
        </div>
        <div v-if="searching" class="file-tree__empty">搜索中…</div>
        <div v-else-if="regexInvalid" class="file-tree__empty">正则表达式无效</div>
        <div v-else-if="searchResults.length === 0" class="file-tree__empty">无匹配文件</div>
      </template>
      <template v-else>
        <FileTreeNode
          v-for="node in rootNodes"
          :key="node.path"
          :node="node"
          :depth="0"
          :active-file-path="store.activeFile?.path ?? ''"
          :refresh-key="store.fileTreeVersion"
          :renaming-path="renamingPath"
          @open-file="openFile"
          @node-contextmenu="onNodeContextmenu"
          @start-rename="renamingPath = $event"
          @renamed="loadRoot"
        />
      </template>
    </div>

    <div class="file-tree__resize" @mousedown.prevent="onResizeStart" />

    <FileTreeContextMenu
      :visible="menuVisible"
      :x="menuX"
      :y="menuY"
      :is-directory="menuNode?.type === 'directory'"
      @open-file-location="handleOpenFileLocation"
      @rename="startRename"
      @delete="removeNode"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { readDir, writeTextFile, mkdir, remove } from '@tauri-apps/plugin-fs'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { showConfirm } from '../composables/showConfirm'
import type { FileTreeNode as FileTreeNodeType, MarkdownFile } from '../types'
import FileTreeNode from './FileTreeNode.vue'
import FileTreeContextMenu from './FileTreeContextMenu.vue'
import FileIcon from './FileIcon.vue'

const store = useMarkdownStore()

const rootNodes = ref<FileTreeNodeType[]>([])
const query = ref('')
const searchResults = ref<FileTreeNodeType[]>([])
const searching = ref(false)
const filterType = ref<'all' | 'file' | 'directory'>('all')
const useRegex = ref(false)
const caseSensitive = ref(false)
const regexInvalid = ref(false)
const renamingPath = ref('')

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const menuNode = ref<FileTreeNodeType | null>(null)

let resizing = false

function onResizeStart(e: MouseEvent) {
  e.preventDefault()
  resizing = true
  const startX = e.clientX
  const startWidth = store.fileTreeWidth

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  function onMouseMove(e: MouseEvent) {
    if (!resizing) return
    const delta = e.clientX - startX
    const newWidth = Math.min(500, Math.max(180, startWidth + delta))
    store.setFileTreeWidth(newWidth)
  }

  function onMouseUp() {
    resizing = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(() => {
  if (resizing) {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
  if (searchTimer) clearTimeout(searchTimer)
  searchSeq++
})

const folderName = computed(() => {
  const path = store.workspacePath
  if (!path) return ''
  return path.split(/[/\\]/).pop() ?? path
})

async function loadRoot() {
  if (!store.workspacePath) {
    rootNodes.value = []
    return
  }

  try {
    const entries = await readDir(store.workspacePath)
    rootNodes.value = entries
      .map((entry) => ({
        name: entry.name ?? '',
        path: `${store.workspacePath}/${entry.name}`,
        type: (entry.isDirectory ? 'directory' : 'file') as 'file' | 'directory',
      }))
      .filter((node) => node.name !== '')
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } catch {
    rootNodes.value = []
  }
}

// 搜索在 Rust 侧遍历（search_workspace 命令），前端一次 IPC 拿全部命中。
// 不要改回前端逐目录 readDir：数千次并发 IPC 会把 WebView 消息桥挤崩。
// 输入防抖 + 节流：连续输入时最多每 searchIntervalMs 发起一次请求（设置中可调）。
let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchSeq = 0
let lastSearchAt = 0

function resetSearch() {
  searchSeq++
  searching.value = false
  regexInvalid.value = false
  searchResults.value = []
}

/** 文件/目录二选一：再次点击已选中项取消 */
function toggleType(t: 'file' | 'directory') {
  filterType.value = filterType.value === t ? 'all' : t
}

function triggerSearch(delay = store.searchDebounceMs) {
  if (searchTimer) clearTimeout(searchTimer)
  if (!query.value) {
    resetSearch()
    return
  }
  searchTimer = setTimeout(runSearch, delay)
}

async function runSearch() {
  if (!store.workspacePath) return
  const wait = store.searchIntervalMs - (Date.now() - lastSearchAt)
  if (wait > 0) {
    searchTimer = setTimeout(runSearch, wait)
    return
  }
  lastSearchAt = Date.now()
  const token = ++searchSeq
  searching.value = true
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const hits: Array<{ name: string; path: string; isDir: boolean }> = await invoke(
      'search_workspace',
      {
        root: store.workspacePath,
        query: query.value,
        isRegex: useRegex.value,
        caseSensitive: caseSensitive.value,
        fileType: filterType.value,
      },
    )
    if (token !== searchSeq) return
    searching.value = false
    hits.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    searchResults.value = hits
      .slice(0, 200)
      .map((h) => ({ name: h.name, path: h.path, type: h.isDir ? 'directory' : 'file' }))
  } catch {
    if (token !== searchSeq) return
    searching.value = false
    // 命令侧唯一的业务错误是正则无效；其余错误静默为空结果
    if (useRegex.value) {
      regexInvalid.value = true
      searchResults.value = []
    } else {
      searchResults.value = []
    }
  }
}

watch(query, () => triggerSearch())

// 开关变化立即重搜（仍受最小间隔约束）
watch([filterType, useRegex, caseSensitive], () => {
  if (query.value) triggerSearch(0)
})

async function openFile(path: string) {
  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const text = await readTextFile(path)
    const name = path.split(/[/\\]/).pop() ?? 'Untitled'
    const file: MarkdownFile = {
      id: '',
      path,
      content: text,
      name,
      saved: true,
    }
    store.setCurrentFile(file)
  } catch {
    // ignore read errors
  }
}

/** 生成不冲突的根目录名：未命名.md / 未命名-2.md … */
function uniqueName(base: string, ext: string, names: string[]): string {
  let candidate = ext ? `${base}.${ext}` : base
  let i = 2
  while (names.includes(candidate)) {
    candidate = `${base}-${i}${ext ? '.' + ext : ''}`
    i++
  }
  return candidate
}

async function createFile() {
  if (!store.workspacePath) return
  const names = rootNodes.value.map((n) => n.name)
  const name = uniqueName('未命名', 'md', names)
  const path = `${store.workspacePath}/${name}`
  try {
    await writeTextFile(path, '')
    store.refreshFileTree()
    await openFile(path)
    // 新文件直接进入重命名态（与 Typora 一致）
    renamingPath.value = path
  } catch {
    // ignore
  }
}

async function createFolder() {
  if (!store.workspacePath) return
  const names = rootNodes.value.map((n) => n.name)
  const name = uniqueName('新建文件夹', '', names)
  try {
    await mkdir(`${store.workspacePath}/${name}`)
    store.refreshFileTree()
    renamingPath.value = `${store.workspacePath}/${name}`
  } catch {
    // ignore
  }
}

function onNodeContextmenu(e: MouseEvent, node: FileTreeNodeType) {
  closeMenu()
  menuNode.value = node
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
  document.addEventListener('mousedown', onOutsideClick)
  document.addEventListener('keydown', onEscape)
}

function closeMenu() {
  menuVisible.value = false
  menuNode.value = null
  document.removeEventListener('mousedown', onOutsideClick)
  document.removeEventListener('keydown', onEscape)
}

function onOutsideClick(e: MouseEvent) {
  const menu = document.querySelector('.file-tree-context-menu')
  if (menu && !menu.contains(e.target as Node)) {
    closeMenu()
  }
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMenu()
  }
}

async function handleOpenFileLocation() {
  const node = menuNode.value
  closeMenu()
  if (!node) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('reveal_in_file_manager', { path: node.path })
  } catch {
    // ignore errors
  }
}

// 右键菜单 → 让对应节点进入行内重命名态
function startRename() {
  const node = menuNode.value
  closeMenu()
  if (!node) return
  renamingPath.value = node.path
}

async function removeNode() {
  const node = menuNode.value
  closeMenu()
  if (!node) return

  const confirmed = await showConfirm({
    title: '删除',
    message: node.type === 'directory'
      ? `确定删除文件夹 "${node.name}" 及其全部内容？`
      : `确定删除文件 "${node.name}"？`,
    confirmLabel: '删除',
    cancelLabel: '取消',
  })
  if (!confirmed) return

  try {
    await remove(node.path, { recursive: true })
    store.closeTabsUnderPath(node.path)
    store.refreshFileTree()
  } catch {
    // ignore
  }
}

watch(() => store.workspacePath, () => {
  loadRoot()
  query.value = ''
}, { immediate: true })

watch(() => store.fileTreeVersion, () => {
  loadRoot()
})
</script>

<style scoped lang="scss">
.file-tree {
  min-width: 12.857rem;
  max-width: 35.714rem;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow: hidden;
  user-select: none;
  position: relative;

  &__header {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 2.286rem;
    padding: 0 0.571rem 0 0.714rem;
    flex-shrink: 0;
  }

  &__header-label {
    font-size: 0.786rem;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.12em;
  }

  &__header-name {
    font-size: 0.786rem;
    color: var(--text-secondary);
    opacity: 0.6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  &__act {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.571rem;
    height: 1.571rem;
    border: none;
    border-radius: 0.357rem;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.929rem;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  }

  &__search {
    padding: 0 0.714rem 0.571rem;
    flex-shrink: 0;

    input {
      width: 100%;
      font: inherit;
      font-size: 0.893rem;
      color: var(--text-primary);
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 0.429rem;
      padding: 0.357rem 0.571rem;
      outline: none;

      &:focus {
        border-color: var(--accent-color);
      }
    }
  }

  &__filters {
    display: flex;
    gap: 0.286rem;
    margin-top: 0.357rem;
  }

  &__filter {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.857rem;
    height: 1.571rem;
    padding: 0 0.429rem;
    border: 1px solid var(--border-color);
    border-radius: 0.357rem;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-family: var(--monospace);
    font-size: 0.786rem;
    line-height: 1;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;

    svg {
      width: 0.857rem;
      height: 0.857rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    &:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }

    &:focus-visible {
      outline: 0.143rem solid var(--accent-color);
      outline-offset: 1px;
    }

    &--on {
      border-color: var(--accent-color);
      color: var(--accent-color);
      font-weight: 600;
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  &__hit {
    display: flex;
    align-items: center;
    gap: 0.357rem;
    height: 1.857rem;
    padding: 0 0.571rem;
    cursor: pointer;
    font-size: var(--file-tree-text-size);
    color: var(--text-primary);
    white-space: nowrap;
    transition: background 0.1s;

    &:hover {
      background: var(--bg-hover);
    }

    &--active {
      background: var(--bg-active);
      color: var(--accent-color);
    }
  }

  &__hit-icon {
    display: inline-flex;
    align-items: center;
    line-height: 0;
    flex-shrink: 0;
  }

  &__hit-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__empty {
    padding: 1.143rem 0.857rem;
    font-size: 0.857rem;
    color: var(--text-secondary);
    text-align: center;
  }

  &__resize {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 0.286rem;
    cursor: col-resize;
    background: transparent;
    transition: background 0.15s;
    z-index: 10;

    &:hover {
      background: var(--accent-color);
    }
  }
}
</style>
