<template>
  <header class="menu-bar" role="menubar" aria-label="应用菜单">
    <div v-for="menu in menus" :key="menu.label" class="menu-bar__wrap">
      <button
        class="menu-bar__btn"
        :class="{ 'menu-bar__btn--open': openMenu === menu.label }"
        :aria-expanded="openMenu === menu.label"
        aria-haspopup="menu"
        @click.stop="toggleMenu(menu.label)"
        @mouseenter="onHover(menu.label)"
      >
        {{ menu.label }}
      </button>

      <div v-if="openMenu === menu.label" class="menu-bar__pop" role="menu" :aria-label="menu.label">
        <template v-for="(item, i) in menu.items" :key="i">
          <div v-if="item === '-'" class="menu-bar__sep" role="separator" />
          <button
            v-else
            role="menuitem"
            class="menu-bar__item"
            :disabled="item.disabled"
            @click="runItem(item)"
          >
            <span class="menu-bar__chk" aria-hidden="true">{{ item.checked ? '✓' : '' }}</span>
            <span>{{ item.label }}</span>
            <span v-if="item.sc" class="menu-bar__sc">{{ item.sc }}</span>
          </button>
        </template>
      </div>
    </div>

    <span class="menu-bar__brand">MarkdownView</span>
  </header>

  <SettingsDialog :open="settingsOpen" @close="settingsOpen = false" />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SettingsDialog from './SettingsDialog.vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { useFileOperation } from '../composables/useFileOperation'
import { showConfirm } from '../composables/showConfirm'
import { focusEditor, runFormat } from '../shared/editor'
import { isMarkdownFile } from '../utils/fileType'
import pkg from '../../package.json'

const REPO_URL = 'https://github.com/5faith/MarkdownView'

function showAbout() {
  showConfirm({
    title: '关于 MarkdownView',
    message: `版本 v${pkg.version}\n仓库地址：${REPO_URL}`,
    confirmLabel: '复制仓库地址',
    cancelLabel: '关闭',
  }).then((confirmed) => {
    if (confirmed) {
      navigator.clipboard?.writeText(REPO_URL).catch(() => {})
    }
  })
}

interface MenuItem {
  label: string
  sc?: string
  checked?: boolean
  disabled?: boolean
  run: () => void
}

const store = useMarkdownStore()
const fileOps = useFileOperation()
const openMenu = ref<string | null>(null)
const settingsOpen = ref(false)

const mdActive = computed(
  () => !!store.activeFile && isMarkdownFile(store.activeFile.name),
)
const fmtDisabled = computed(
  () => !mdActive.value || store.readingMode,
)

const menus = computed<Array<{ label: string; items: Array<MenuItem | '-'> }>>(() => [
  {
    label: '文件',
    items: [
      { label: '新建 Markdown 文件', sc: 'Ctrl+N', run: () => fileOps.newFile() },
      { label: '打开文件', sc: 'Ctrl+O', run: () => fileOps.openFile() },
      { label: '打开文件夹', sc: 'Ctrl+Shift+O', run: () => fileOps.openFolder() },
      '-',
      { label: '保存', sc: 'Ctrl+S', disabled: !store.activeFile, run: () => fileOps.saveFile() },
      { label: '另存为', sc: 'Ctrl+Shift+S', disabled: !store.activeFile, run: () => fileOps.saveFileAs() },
      { label: '导出 PDF', sc: 'Ctrl+P', disabled: !mdActive.value, run: () => fileOps.exportPdf() },
      '-',
      { label: '关闭标签页', disabled: !store.activeFile, run: () => fileOps.closeActiveTab() },
    ],
  },
  {
    label: '格式',
    items: [
      { label: '标题 1', disabled: fmtDisabled.value, run: () => runFormat('h1') },
      { label: '标题 2', disabled: fmtDisabled.value, run: () => runFormat('h2') },
      { label: '标题 3', disabled: fmtDisabled.value, run: () => runFormat('h3') },
      '-',
      { label: '加粗', sc: 'Ctrl+B', disabled: fmtDisabled.value, run: () => runFormat('bold') },
      { label: '斜体', sc: 'Ctrl+I', disabled: fmtDisabled.value, run: () => runFormat('italic') },
      { label: '删除线', disabled: fmtDisabled.value, run: () => runFormat('strike') },
      { label: '行内代码', disabled: fmtDisabled.value, run: () => runFormat('code') },
      '-',
      { label: '引用', disabled: fmtDisabled.value, run: () => runFormat('quote') },
      { label: '无序列表', disabled: fmtDisabled.value, run: () => runFormat('ul') },
      { label: '有序列表', disabled: fmtDisabled.value, run: () => runFormat('ol') },
      { label: '任务列表', disabled: fmtDisabled.value, run: () => runFormat('task') },
      { label: '插入表格', disabled: fmtDisabled.value, run: () => runFormat('table') },
      { label: '插入代码块', disabled: fmtDisabled.value, run: () => runFormat('codeblock') },
      { label: '隐藏细节', disabled: fmtDisabled.value, run: () => runFormat('details') },
      { label: '水平线', disabled: fmtDisabled.value, run: () => runFormat('hr') },
    ],
  },
  {
    label: '视图',
    items: [
      { label: '目录树', checked: store.showFileTree, disabled: !store.workspacePath, run: () => store.toggleFileTree() },
      { label: '大纲', checked: store.showOutline, run: () => store.toggleOutline() },
      { label: '源码模式', checked: mdActive.value && store.sourceMode, disabled: !mdActive.value || store.readingMode, run: () => store.toggleSourceMode() },
      '-',
      { label: '阅读模式', sc: 'Ctrl+R', checked: store.readingMode, disabled: !store.activeFile, run: () => store.toggleReadingMode() },
    ],
  },
  {
    label: '帮助',
    items: [
      { label: '加载模板', sc: 'Ctrl+Shift+T', run: () => store.loadDefaultContent() },
      '-',
      { label: '设置…', run: () => { settingsOpen.value = true } },
      '-',
      { label: '关于 MarkdownView', run: showAbout },
    ],
  },
])

function toggleMenu(label: string) {
  const opening = openMenu.value !== label
  openMenu.value = opening ? label : null
  // 打开菜单时让编辑器重新聚焦，选中文字保持高亮可见
  if (opening && mdActive.value && !store.sourceMode && !store.readingMode) {
    focusEditor()
  }
}

// 菜单已展开时横移即切换，与桌面应用习惯一致
function onHover(label: string) {
  if (openMenu.value && openMenu.value !== label) {
    openMenu.value = label
  }
}

function runItem(item: MenuItem) {
  if (item.disabled) return
  openMenu.value = null
  item.run()
}

function onOutsideMousedown(e: MouseEvent) {
  const bar = document.querySelector('.menu-bar')
  if (openMenu.value && bar && !bar.contains(e.target as Node)) {
    openMenu.value = null
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && openMenu.value) {
    openMenu.value = null
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onOutsideMousedown, true)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutsideMousedown, true)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped lang="scss">
.menu-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 2.571rem;
  padding: 0 0.857rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  user-select: none;
  -webkit-app-region: drag;

  &__wrap {
    position: relative;
    -webkit-app-region: no-drag;
  }

  &__btn {
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 1rem;
    padding: 0.357rem 0.714rem;
    border-radius: 0.429rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover,
    &--open {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  }

  &__pop {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.286rem;
    min-width: 17.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.714rem;
    box-shadow: 0 0.714rem 2.143rem rgba(0, 0, 0, 0.16);
    padding: 0.357rem;
    z-index: 1000;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.571rem;
    width: 100%;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 1rem;
    font-weight: 500;
    padding: 0.5rem 0.714rem;
    border-radius: 0.429rem;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    transition: background 0.1s;

    &:hover:not(:disabled) {
      background: var(--bg-hover);
    }

    &:disabled {
      opacity: 0.45;
      cursor: default;
    }
  }

  &__chk {
    width: 1rem;
    color: var(--accent-color);
    flex-shrink: 0;
  }

  &__sc {
    margin-left: auto;
    color: var(--text-secondary);
    font-size: 0.821rem;
    padding-left: 1.286rem;
  }

  &__sep {
    height: 1px;
    background: var(--border-color);
    margin: 0.357rem 0.571rem;
  }

  &__brand {
    margin-left: auto;
    font-size: 0.929rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: 0.01em;
    white-space: nowrap;
    padding: 0 0.286rem;
  }
}
</style>
