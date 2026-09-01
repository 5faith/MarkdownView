<template>
  <div class="file-tree" :style="{ width: store.fileTreeWidth + 'px' }">
    <div class="file-tree__header">
      <span class="file-tree__header-label">EXPLORER</span>
      <span class="file-tree__header-name" :title="store.workspacePath">{{ folderName }}</span>
      <button class="file-tree__close" @click="store.clearWorkspace" title="Close explorer">✕</button>
    </div>
    <div class="file-tree__body">
      <FileTreeNode
        v-for="node in rootNodes"
        :key="node.path"
        :node="node"
        :depth="0"
        :active-file-path="store.activeFile?.path ?? ''"
        @open-file="handleOpenFile"
        @node-contextmenu="onNodeContextmenu"
      />
    </div>

    <div
      class="file-tree__resize"
      @mousedown.prevent="onResizeStart"
    />

    <FileTreeContextMenu
      :visible="menuVisible"
      :x="menuX"
      :y="menuY"
      :file-path="menuFilePath"
      @open-file-location="handleOpenFileLocation"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { readDir } from '@tauri-apps/plugin-fs'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import type { FileTreeNode as FileTreeNodeType, MarkdownFile } from '../types'
import FileTreeNode from './FileTreeNode.vue'
import FileTreeContextMenu from './FileTreeContextMenu.vue'

const store = useMarkdownStore()

const rootNodes = ref<FileTreeNodeType[]>([])

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const menuFilePath = ref('')

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

async function handleOpenFile(path: string) {
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

function onNodeContextmenu(e: MouseEvent, node: FileTreeNodeType) {
  closeMenu()
  if (node.type !== 'file') return
  menuFilePath.value = node.path
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
  document.addEventListener('mousedown', onOutsideClick)
  document.addEventListener('keydown', onEscape)
}

function closeMenu() {
  menuVisible.value = false
  menuFilePath.value = ''
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
  const filePath = menuFilePath.value
  closeMenu()
  if (!filePath) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('reveal_in_file_manager', { path: filePath })
  } catch {
    // ignore errors
  }
}

watch(() => store.workspacePath, () => {
  loadRoot()
}, { immediate: true })
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
    gap: 6px;
    height: 32px;
    padding: 0 10px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  &__header-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
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

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;
    transition: background 0.15s;

    &:hover {
      background: var(--bg-hover);
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
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
