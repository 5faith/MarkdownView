<template>
  <div>
    <div
      class="tree-node__row"
      :class="{
        'tree-node__row--active': props.node.type === 'file' && props.node.path === props.activeFilePath,
      }"
      :style="{ paddingLeft: `${props.depth * 12 + 8}px` }"
      @click="handleClick"
      @dblclick="startRename"
      @contextmenu.prevent="emit('nodeContextmenu', $event, props.node)"
    >
      <template v-if="renaming">
        <input
          ref="renameInput"
          v-model="renameValue"
          class="tree-node__rename"
          aria-label="重命名"
          @click.stop
          @dblclick.stop
          @keydown.enter.prevent="commitRename"
          @keydown.esc.prevent="cancelRename"
          @blur="commitRename"
        />
      </template>
      <template v-else>
        <span v-if="props.node.type === 'directory'" class="tree-node__arrow" :class="{ 'tree-node__arrow--open': expanded }">
          ▶
        </span>
        <span v-else class="tree-node__arrow-placeholder"></span>
        <span class="tree-node__icon">
          <template v-if="props.node.type === 'directory'">{{ expanded ? '📂' : '📁' }}</template>
          <FileIcon v-else :name="props.node.name" :size="14" />
        </span>
        <span class="tree-node__name">{{ props.node.name }}</span>
      </template>
    </div>
    <div v-if="expanded && props.node.type === 'directory'" class="tree-node__children">
      <template v-if="loading">
        <div class="tree-node__row tree-node__row--loading" :style="{ paddingLeft: `${(props.depth + 1) * 12 + 8}px` }">
          <span class="tree-node__arrow-placeholder"></span>
          <span class="tree-node__icon">⏳</span>
          <span class="tree-node__name">Loading...</span>
        </div>
      </template>
      <template v-else>
        <FileTreeNode
          v-for="child in children"
          :key="child.path"
          :node="child"
          :depth="props.depth + 1"
          :active-file-path="props.activeFilePath"
          :refresh-key="props.refreshKey"
          :renaming-path="props.renamingPath"
          @open-file="(path: string) => $emit('openFile', path)"
          @node-contextmenu="(e: MouseEvent, n: FileTreeNodeType) => emit('nodeContextmenu', e, n)"
          @start-rename="(p: string) => emit('startRename', p)"
          @renamed="() => emit('renamed')"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { readDir, rename } from '@tauri-apps/plugin-fs'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import type { FileTreeNode as FileTreeNodeType } from '../types'
import FileIcon from './FileIcon.vue'

const props = defineProps<{
  node: FileTreeNodeType
  depth: number
  activeFilePath: string
  refreshKey: number
  renamingPath: string
}>()

const emit = defineEmits<{
  openFile: [path: string]
  nodeContextmenu: [event: MouseEvent, node: FileTreeNodeType]
  startRename: [path: string]
  renamed: []
}>()

const store = useMarkdownStore()

const expanded = ref(false)
const loading = ref(false)
const children = ref<FileTreeNodeType[]>([])

const renaming = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

watch(() => props.refreshKey, () => {
  expanded.value = false
  children.value = []
})

// 右键菜单"重命名"经由 renamingPath 传导到对应节点（immediate 覆盖新建后挂载的场景）
watch(() => props.renamingPath, (path) => {
  if (path === props.node.path) beginRename()
}, { immediate: true })

function startRename() {
  if (props.renamingPath) return
  emit('startRename', props.node.path)
  beginRename()
}

function beginRename() {
  renameValue.value = props.node.name
  renaming.value = true
  nextTick(() => {
    renameInput.value?.focus()
    const dot = props.node.name.lastIndexOf('.')
    renameInput.value?.setSelectionRange(0, dot > 0 ? dot : props.node.name.length)
  })
}

function cancelRename() {
  renaming.value = false
}

async function commitRename() {
  if (!renaming.value) return
  renaming.value = false
  const newName = renameValue.value.trim()
  if (!newName || newName === props.node.name) return

  const parentDir = props.node.path.slice(0, props.node.path.length - props.node.name.length - 1)
  const sep = props.node.path.includes('\\') ? '\\' : '/'
  const newPath = `${parentDir}${sep}${newName}`

  try {
    await rename(props.node.path, newPath)
    // 同步已打开的标签页
    for (const tab of store.tabs) {
      if (tab.path === props.node.path) {
        tab.path = newPath
        tab.name = newName
      }
    }
    props.node.name = newName
    props.node.path = newPath
    emit('renamed')
  } catch {
    // 重命名失败静默
  }
}

async function handleClick() {
  if (props.node.type === 'directory') {
    if (!expanded.value && children.value.length === 0) {
      loading.value = true
      try {
        const entries = await readDir(props.node.path)
        children.value = entries
          .map((entry) => ({
            name: entry.name ?? '',
            path: `${props.node.path}/${entry.name}`,
            type: (entry.isDirectory ? 'directory' : 'file') as 'file' | 'directory',
          }))
          .filter((node) => node.name !== '')
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
            return a.name.localeCompare(b.name)
          })
      } catch {
        children.value = []
      }
      loading.value = false
    }
    expanded.value = !expanded.value
  } else {
    emit('openFile', props.node.path)
  }
}
</script>

<style scoped lang="scss">
.tree-node {
  &__row {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    padding-right: 8px;
    cursor: pointer;
    font-size: var(--file-tree-text-size);
    color: var(--text-primary);
    transition: background 0.1s;
    white-space: nowrap;

    &:hover {
      background: var(--bg-hover);
    }

    &--active {
      background: var(--bg-active);
      color: var(--accent-color);
    }

    &--loading {
      opacity: 0.5;
      cursor: default;
    }
  }

  &__rename {
    width: 100%;
    font: inherit;
    font-size: 12.5px;
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--accent-color);
    border-radius: 4px;
    padding: 1px 5px;
    outline: none;
    min-width: 0;
  }

  &__arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    font-size: 8px;
    transition: transform 0.15s;
    flex-shrink: 0;

    &--open {
      transform: rotate(90deg);
    }
  }

  &__arrow-placeholder {
    width: 14px;
    flex-shrink: 0;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    line-height: 0;
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__children {
    // no extra styling needed
  }
}
</style>
