<template>
  <div class="file-tree">
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
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { readDir } from '@tauri-apps/plugin-fs'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import type { FileTreeNode as FileTreeNodeType, MarkdownFile } from '../types'
import FileTreeNode from './FileTreeNode.vue'

const store = useMarkdownStore()

const rootNodes = ref<FileTreeNodeType[]>([])

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
      .filter((node) => node.name !== '' && !node.name.startsWith('.'))
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

watch(() => store.workspacePath, () => {
  loadRoot()
}, { immediate: true })
</script>

<style scoped lang="scss">
.file-tree {
  width: 240px;
  min-width: 240px;
  max-width: 240px;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow: hidden;
  user-select: none;

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
}
</style>
