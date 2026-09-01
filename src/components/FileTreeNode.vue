<template>
  <div>
    <div
      class="tree-node__row"
      :class="{
        'tree-node__row--active': props.node.type === 'file' && props.node.path === props.activeFilePath,
      }"
      :style="{ paddingLeft: `${props.depth * 12 + 8}px` }"
      @click="handleClick"
      @contextmenu.prevent="emit('nodeContextmenu', $event, props.node)"
    >
      <span v-if="props.node.type === 'directory'" class="tree-node__arrow" :class="{ 'tree-node__arrow--open': expanded }">
        ▶
      </span>
      <span v-else class="tree-node__arrow-placeholder"></span>
      <span class="tree-node__icon">
        <template v-if="props.node.type === 'directory'">{{ expanded ? '📂' : '📁' }}</template>
        <FileIcon v-else :name="props.node.name" :size="14" />
      </span>
      <span class="tree-node__name">{{ props.node.name }}</span>
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
          @open-file="(path: string) => $emit('openFile', path)"
          @node-contextmenu="(e: MouseEvent, n: FileTreeNodeType) => emit('nodeContextmenu', e, n)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { readDir } from '@tauri-apps/plugin-fs'
import type { FileTreeNode as FileTreeNodeType } from '../types'
import FileIcon from './FileIcon.vue'

const props = defineProps<{
  node: FileTreeNodeType
  depth: number
  activeFilePath: string
}>()

const emit = defineEmits<{
  openFile: [path: string]
  nodeContextmenu: [event: MouseEvent, node: FileTreeNodeType]
}>()

const expanded = ref(false)
const loading = ref(false)
const children = ref<FileTreeNodeType[]>([])

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
    font-size: 13px;
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
