<template>
  <div>
    <div
      ref="rowRef"
      class="tree-node__row"
      :class="{
        'tree-node__row--active': props.node.type === 'file' && norm(props.node.path) === norm(props.activeFilePath),
        'tree-node__row--revealed': revealed,
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
          :reveal="props.reveal"
          :expand-all-dirs="props.expandAllDirs"
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
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
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
  reveal: { path: string; seq: number } | null
  expandAllDirs: Set<string>
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

const rowRef = ref<HTMLElement | null>(null)
const revealed = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | null = null

/** 路径分隔符统一成 `/`：Rust 命令返回的是 `\`，树里自己拼的是 `/` */
const norm = (path: string) => path.replace(/\\/g, '/')

onBeforeUnmount(() => {
  if (revealTimer) clearTimeout(revealTimer)
})

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

async function loadChildren() {
  if (children.value.length > 0 || loading.value) return
  loading.value = true
  try {
    // 「全部展开」一次性取回的子树优先，避免逐目录 IPC 扇出
    const entries: FileTreeNodeType[] = props.node.children
      ?? (await readDir(props.node.path)).map((entry) => ({
        name: entry.name ?? '',
        path: `${norm(props.node.path)}/${entry.name}`,
        type: (entry.isDirectory ? 'directory' : 'file') as 'file' | 'directory',
      }))
    children.value = entries
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

async function ensureExpanded() {
  if (props.node.type !== 'directory') return
  await loadChildren()
  expanded.value = true
}

function highlight() {
  nextTick(() => {
    rowRef.value?.scrollIntoView({ block: 'center' })
    revealed.value = true
    if (revealTimer) clearTimeout(revealTimer)
    revealTimer = setTimeout(() => { revealed.value = false }, 1600)
  })
}

// 「定位当前文件」：目标高亮并滚动到可视区，祖先目录逐级展开（子节点靠 immediate 继续递归）
watch(
  () => props.reveal,
  async (req) => {
    if (!req) return
    const me = norm(props.node.path)
    if (me === req.path) {
      highlight()
    } else if (props.node.type === 'directory' && req.path.startsWith(`${me}/`)) {
      await ensureExpanded()
    }
  },
  { immediate: true },
)

// 「全部展开」：命中集合里的目录展开，新挂载的子节点靠 immediate 继续
watch(
  () => props.expandAllDirs,
  (dirs) => {
    if (dirs.has(norm(props.node.path))) void ensureExpanded()
  },
  { immediate: true },
)

async function handleClick() {
  if (props.node.type === 'directory') {
    if (!expanded.value) await ensureExpanded()
    else expanded.value = false
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
    gap: 0.286rem;
    height: 1.857rem;
    padding-right: 0.571rem;
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

    /* 定位到的节点：短暂高亮，1.6s 后由脚本移除 */
    &--revealed {
      background: var(--bg-active);
      box-shadow: inset 2px 0 0 var(--accent-color);
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
    font-size: 0.893rem;
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--accent-color);
    border-radius: 0.286rem;
    padding: 1px 0.357rem;
    outline: none;
    min-width: 0;
  }

  &__arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    font-size: 0.571rem;
    transition: transform 0.15s;
    flex-shrink: 0;

    &--open {
      transform: rotate(90deg);
    }
  }

  &__arrow-placeholder {
    width: 1rem;
    flex-shrink: 0;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
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
