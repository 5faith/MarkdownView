<template>
  <div
    ref="treeRoot"
    class="file-tree"
    tabindex="0"
    :style="{ width: store.fileTreeWidth + 'px' }"
    @mousedown="focusTree"
    @keydown="onTreeKeydown"
  >
    <div class="file-tree__header">
      <span class="file-tree__header-label">目录</span>
      <span class="file-tree__header-name" :title="store.workspacePath">{{ folderName }}</span>
      <button
        class="file-tree__act"
        title="定位当前文件"
        aria-label="定位当前文件"
        :disabled="!canReveal"
        @click="revealActiveFile"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" />
        </svg>
      </button>
      <button
        class="file-tree__act"
        title="全部折叠"
        aria-label="全部折叠"
        @click="collapseAll"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 10l4-4 4 4" />
        </svg>
      </button>
      <button
        class="file-tree__act"
        title="全部展开"
        aria-label="全部展开"
        @click="expandAll"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <button class="file-tree__act" title="新建文件" aria-label="新建文件" @click="createFile">＋</button>
      <button class="file-tree__act" title="新建文件夹" aria-label="新建文件夹" @click="createFolder">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 4h4l1.5 1.5H14V12H2z" />
          <path d="M8 7.2v3.2M6.4 8.8h3.2" />
        </svg>
      </button>
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

    <div class="file-tree__body" @pointerdown="onRowPointerDown" @click.capture="onTreeClickCapture">
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
          :reveal="store.revealRequest"
          :expand-all-dirs="expandAllDirs"
          :selected-path="selectedPath"
          @open-file="openFile"
          @select="selectedPath = $event"
          @node-contextmenu="onNodeContextmenu"
          @start-rename="renamingPath = $event"
          @renamed="loadRoot"
        />
      </template>
    </div>

    <!-- 拖拽中的跟随标签：pointer-events:none，否则 elementFromPoint 会一直命中它 -->
    <div
      v-if="dragSource"
      class="file-tree__ghost"
      :style="{ left: `${ghostX}px`, top: `${ghostY}px` }"
    >
      <FileIcon :name="dragName" :size="14" />
      <span>{{ dragName }}</span>
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
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { readDir, writeTextFile, mkdir, remove, rename } from '@tauri-apps/plugin-fs'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { showConfirm } from '../composables/showConfirm'
import type { FileTreeNode as FileTreeNodeType, MarkdownFile } from '../types'
import FileTreeNode from './FileTreeNode.vue'
import FileTreeContextMenu from './FileTreeContextMenu.vue'
import FileIcon from './FileIcon.vue'

const store = useMarkdownStore()

const treeRoot = ref<HTMLElement | null>(null)
/** 树里当前选中的行（键盘 ←/→ 的作用对象），与「活动文件」分开：目录也能选中 */
const selectedPath = ref('')

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

/**
 * 「全部展开」命中的目录集合：节点按成员身份展开，刷新/折叠时清空，避免旧状态继续级联
 */
const expandAllDirs = ref<Set<string>>(new Set())

/** 路径分隔符统一成 `/`：Rust 命令返回 `\`，树里自己拼的是 `/` */
const normPath = (path: string) => path.replace(/\\/g, '/')

/** 树里只有工作区内的文件，工作区外的标签没法定位 */
const canReveal = computed(() => {
  const file = normPath(store.activeFile?.path ?? '')
  const ws = normPath(store.workspacePath)
  return !!file && !!ws && file.startsWith(`${ws}/`)
})

function revealActiveFile() {
  if (!canReveal.value) return
  // 搜索模式下树被结果列表替换，先退出搜索才能看到定位结果
  query.value = ''
  store.revealInFileTree(store.activeFile?.path ?? '')
}

/** 点击树里任意位置都把焦点交给树容器，否则 ←/→ 会被编辑器吃掉 */
function focusTree(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('input, textarea')) return
  treeRoot.value?.focus()
}

// 拖拽移动：Tauri 在 Windows 上默认 dragDropEnabled 会吞掉 HTML5 拖拽事件，
// 这里仍用指针事件自己实现（移动超过 4px 才算拖拽，单纯点击仍展开/打开）
const dragSource = ref('')
const ghostX = ref(0)
const ghostY = ref(0)
const dragName = computed(() => dragSource.value.split('/').pop() ?? '')
let pressed = false
let dragged = false
/** 拖拽松手后浏览器仍会补一个 click，不能让它触发展开/打开 */
let suppressClick = false
let startX = 0
let startY = 0
let pendingSource = ''
let dropTarget = ''
let dropEl: HTMLElement | null = null

function setDropEl(el: HTMLElement | null) {
  if (dropEl === el) return
  dropEl?.classList.remove('tree-node__row--drop')
  dropEl = el
  el?.classList.add('tree-node__row--drop')
}

/** 目标必须是目录、不能是自己、不能是自己的子孙，也不能原地不动 */
function canDropInto(source: string, target: string) {
  if (!source || !target || target === source) return false
  if (target.startsWith(`${source}/`)) return false
  return source.slice(0, source.lastIndexOf('/')) !== target
}

function onRowPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  // 重命名输入框里按下不启动拖拽，否则选不中文字
  if (target.closest('input, textarea')) return
  const row = target.closest<HTMLElement>('.tree-node__row[data-path]')
  if (!row) return
  pressed = true
  dragged = false
  pendingSource = row.dataset.path ?? ''
  startX = e.clientX
  startY = e.clientY
  document.addEventListener('pointermove', onRowPointerMove)
  document.addEventListener('pointerup', onRowPointerUp)
  document.addEventListener('pointercancel', onRowPointerUp)
}

function onRowPointerMove(e: PointerEvent) {
  if (!pressed) return
  if (!dragSource.value) {
    if (Math.abs(e.clientX - startX) < 4 && Math.abs(e.clientY - startY) < 4) return
    dragged = true
    dragSource.value = pendingSource
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }
  ghostX.value = e.clientX + 14
  ghostY.value = e.clientY + 10
  const hit = document
    .elementFromPoint(e.clientX, e.clientY)
    ?.closest<HTMLElement>('.tree-node__row[data-path]')
  const valid = hit?.dataset.type === 'directory' && canDropInto(dragSource.value, hit.dataset.path ?? '')
  dropTarget = valid ? (hit!.dataset.path ?? '') : ''
  setDropEl(valid ? hit! : null)
}

function onRowPointerUp() {
  const source = dragSource.value
  const target = dropTarget
  pressed = false
  dragSource.value = ''
  pendingSource = ''
  dropTarget = ''
  setDropEl(null)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  document.removeEventListener('pointermove', onRowPointerMove)
  document.removeEventListener('pointerup', onRowPointerUp)
  document.removeEventListener('pointercancel', onRowPointerUp)
  if (dragged) {
    suppressClick = true
    // click 在同一次手势里同步派发，等它过去再恢复
    setTimeout(() => { suppressClick = false }, 0)
  }
  dragged = false
  if (source && target) void moveNode(source, target)
}

function onTreeClickCapture(e: MouseEvent) {
  if (!suppressClick) return
  e.stopPropagation()
  e.preventDefault()
}

async function moveNode(source: string, targetDir: string) {
  const name = source.slice(source.lastIndexOf('/') + 1)
  if (!name) return
  const newPath = `${targetDir}/${name}`
  try {
    await rename(source, newPath)
  } catch {
    // 目标已有同名文件时失败；和行内重命名一样保持原状、不弹错
    return
  }
  // 已打开的标签跟着换路径；整目录移动时其子树内的标签也要跟
  for (const tab of store.tabs) {
    const path = normPath(tab.path)
    if (path === source) tab.path = newPath
    else if (path.startsWith(`${source}/`)) tab.path = newPath + path.slice(source.length)
  }
  selectedPath.value = newPath
  // shortcut: 只挪节点本身，正文里的相对图片路径不跟着挪（需要时参考 saveFileAs 的 copyReferencedImages）
  store.refreshFileTree()
  // 刷新会重建整棵树；等新节点挂载后定位到新位置，否则目标目录会被收起、看不出挪到哪了
  await nextTick()
  store.revealInFileTree(newPath)
}

/** ←/→ 折叠展开，↑/↓ 在可见行之间移动选中，Enter 展开目录/打开文件（data-* 由行元素提供） */
function onTreeKeydown(e: KeyboardEvent) {
  const key = e.key
  if (
    key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' &&
    key !== 'ArrowDown' && key !== 'Enter'
  ) return
  if (!treeRoot.value) return
  if ((e.target as HTMLElement).closest('input, textarea')) return

  // 跳过「Loading...」这类没有 data-path 的占位行
  const rows = Array.from(treeRoot.value.querySelectorAll<HTMLElement>('.tree-node__row[data-path]'))
  if (rows.length === 0) return
  const idx = rows.findIndex((row) => row.dataset.path === selectedPath.value)

  if (key === 'Enter') {
    e.preventDefault()
    const row = rows[idx === -1 ? 0 : idx]
    if (!row) return
    // 目录只负责展开（已展开的保持原样）；文件交给点击逻辑打开
    if (row.dataset.type !== 'directory' || row.dataset.expanded !== '1') row.click()
    return
  }

  if (key === 'ArrowUp' || key === 'ArrowDown') {
    e.preventDefault()
    const step = key === 'ArrowDown' ? 1 : -1
    const next = idx === -1
      ? (step > 0 ? 0 : rows.length - 1)
      : Math.min(rows.length - 1, Math.max(0, idx + step))
    const target = rows[next]!
    selectedPath.value = target.dataset.path ?? ''
    target.scrollIntoView({ block: 'nearest' })
    return
  }

  if (idx === -1) return
  const row = rows[idx]!
  const isDir = row.dataset.type === 'directory'
  const isOpen = row.dataset.expanded === '1'

  e.preventDefault()
  if (key === 'ArrowRight') {
    if (isDir && !isOpen) row.click()
    return
  }
  if (isDir && isOpen) {
    row.click()
    return
  }
  // 文件或已收起的目录：折叠它所在的目录（往上找深度小 1 的那一行）
  const depth = Number(row.dataset.depth)
  for (let i = idx - 1; i >= 0; i--) {
    if (Number(rows[i]!.dataset.depth) === depth - 1) {
      rows[i]!.click()
      return
    }
  }
}

function collapseAll() {
  // fileTreeVersion 变化会让 FileTreeNode 清空子树并折叠
  store.refreshFileTree()
}

/** 全部展开：一次 IPC 取回工作区条目，铺成完整子树后逐级展开，避免逐目录 IPC 扇出 */
async function expandAll() {
  if (!store.workspacePath) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    const hits: Array<{ name: string; path: string; isDir: boolean }> = await invoke(
      'list_workspace_entries',
      { root: store.workspacePath, limit: 2000 },
    )
    const byParent = new Map<string, FileTreeNodeType[]>()
    for (const hit of hits) {
      const path = normPath(hit.path)
      const parent = path.slice(0, path.lastIndexOf('/'))
      const node: FileTreeNodeType = {
        name: hit.name,
        path,
        type: hit.isDir ? 'directory' : 'file',
      }
      const siblings = byParent.get(parent)
      if (siblings) siblings.push(node)
      else byParent.set(parent, [node])
    }
    const attach = (node: FileTreeNodeType) => {
      if (node.type !== 'directory') return
      const kids = byParent.get(node.path)
      if (!kids) return
      node.children = kids
      kids.forEach(attach)
    }
    rootNodes.value.forEach(attach)
    expandAllDirs.value = new Set(byParent.keys())
  } catch {
    // 读取失败保持原状
  }
}

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
  // 拖拽途中关掉目录树：别把监听器和光标状态留在 document 上
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  document.removeEventListener('pointermove', onRowPointerMove)
  document.removeEventListener('pointerup', onRowPointerUp)
  document.removeEventListener('pointercancel', onRowPointerUp)
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

  // 根节点重建后旧子树与展开集合都失效，否则新挂载的节点会沿用上次「全部展开」
  expandAllDirs.value = new Set()
  try {
    const entries = await readDir(store.workspacePath)
    rootNodes.value = entries
      .map((entry) => ({
        name: entry.name ?? '',
        path: `${normPath(store.workspacePath)}/${entry.name}`,
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
      .map((h) => ({ name: h.name, path: normPath(h.path), type: h.isDir ? 'directory' : 'file' }))
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
  const path = `${normPath(store.workspacePath)}/${name}`
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
    await mkdir(`${normPath(store.workspacePath)}/${name}`)
    store.refreshFileTree()
    renamingPath.value = `${normPath(store.workspacePath)}/${name}`
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

// 从标签/文件树打开文件时，让选中行跟着走，←/→ 立刻可用
watch(() => store.activeFile?.path, (path) => {
  if (path) selectedPath.value = normPath(path)
}, { immediate: true })
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

  /* 容器可获得焦点（←/→ 只在树内生效），但不画默认焦点框 */
  &:focus {
    outline: none;
  }

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

    svg {
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;

      &:hover {
        background: transparent;
        color: var(--text-secondary);
      }
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

  /* 拖拽落点（节点行的类由脚本手动加，跨组件需要 :deep） */
  &__body :deep(.tree-node__row--drop) {
    background: var(--bg-active);
    box-shadow: inset 0 0 0 1px var(--accent-color);
    color: var(--accent-color);
  }

  &__ghost {
    position: fixed;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 0.357rem;
    padding: 0.214rem 0.571rem;
    font-size: var(--file-tree-text-size);
    color: var(--text-primary);
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.357rem;
    box-shadow: 0 0.286rem 0.857rem rgba(0, 0, 0, 0.18);
    pointer-events: none;
    white-space: nowrap;
    opacity: 0.9;
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
