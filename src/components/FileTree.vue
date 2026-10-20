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
        <div v-if="searchResults.length === 0" class="file-tree__empty">无匹配文件</div>
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
const renamingPath = ref('')

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const menuNode = ref<FileTreeNodeType | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null
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

// 搜索时递归扫工作区（跳过依赖目录），平铺展示命中项
const SEARCH_SKIP = new Set(['node_modules', '.git', '.svn', 'dist', '.obsidian'])
const SEARCH_MAX_DEPTH = 8

async function walk(dir: string, depth: number, out: FileTreeNodeType[]) {
  if (depth > SEARCH_MAX_DEPTH) return
  let entries
  try {
    entries = await readDir(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const name = entry.name ?? ''
    if (!name || SEARCH_SKIP.has(name)) continue
    const path = `${dir}/${name}`
    const node: FileTreeNodeType = {
      name,
      path,
      type: entry.isDirectory ? 'directory' : 'file',
    }
    if (name.toLowerCase().includes(query.value.toLowerCase())) out.push(node)
    if (entry.isDirectory) await walk(path, depth + 1, out)
  }
}

watch(query, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!q) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    if (!store.workspacePath) return
    const out: FileTreeNodeType[] = []
    await walk(store.workspacePath, 0, out)
    out.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    searchResults.value = out.slice(0, 200)
  }, 200)
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
  min-width: 180px;
  max-width: 500px;
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
    height: 32px;
    padding: 0 8px 0 10px;
    flex-shrink: 0;
  }

  &__header-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.12em;
  }

  &__header-name {
    font-size: 11px;
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
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 13px;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  }

  &__search {
    padding: 0 10px 8px;
    flex-shrink: 0;

    input {
      width: 100%;
      font: inherit;
      font-size: 12.5px;
      color: var(--text-primary);
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 5px 8px;
      outline: none;

      &:focus {
        border-color: var(--accent-color);
      }
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
    gap: 5px;
    height: 26px;
    padding: 0 8px;
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
    padding: 16px 12px;
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
  }

  &__resize {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 4px;
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
