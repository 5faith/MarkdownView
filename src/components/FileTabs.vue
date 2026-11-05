<template>
  <div class="file-tabs">
    <div class="file-tabs__list">
      <div
        v-for="tab in store.tabs"
        :key="tab.id"
        class="file-tabs__item"
        :class="{
          'file-tabs__item--active': tab.id === store.activeId,
          'file-tabs__item--dragging': tab.id === dragId,
        }"
        :data-tab-id="tab.id"
        @click="onClick(tab.id)"
        @contextmenu.prevent="onContextMenu($event, tab.id)"
        @pointerdown="onPointerDown($event, tab.id)"
      >
        <span class="file-tabs__icon">
          <FileIcon :name="tab.name" :size="14" />
        </span>
        <span class="file-tabs__name">
          {{ tab.name }}{{ tab.saved ? '' : ' *' }}
        </span>
        <button
          class="file-tabs__close"
          @click.stop="handleClose(tab.id)"
          title="Close"
        >
          x
        </button>
      </div>
    </div>

    <!-- 拖拽中的跟随标签：pointer-events:none，否则 elementFromPoint 会一直命中它 -->
    <div
      v-if="dragId"
      class="file-tabs__ghost"
      :style="{ left: `${ghostX}px`, top: `${ghostY}px` }"
    >
      <span class="file-tabs__icon">
        <FileIcon :name="dragName" :size="14" />
      </span>
      <span class="file-tabs__name">{{ dragName }}</span>
    </div>
  </div>

  <TabContextMenu
    :visible="menuVisible"
    :x="menuX"
    :y="menuY"
    :can-close-others="store.tabs.length > 1"
    :can-close-left="menuTargetIndex > 0"
    :can-close-right="menuTargetIndex !== -1 && menuTargetIndex < store.tabs.length - 1"
    :can-close-all="store.tabs.length > 0"
    @close="handleMenuClose"
    @close-others="handleMenuCloseOthers"
    @close-left="handleMenuCloseLeft"
    @close-right="handleMenuCloseRight"
    @close-all="handleMenuCloseAll"
    @close-menu="closeMenu"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { showConfirm } from '../composables/showConfirm'
import FileIcon from './FileIcon.vue'
import TabContextMenu from './TabContextMenu.vue'

const store = useMarkdownStore()

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const menuTargetId = ref('')
const menuTargetIndex = computed(() =>
  store.tabs.findIndex((t) => t.id === menuTargetId.value),
)

// 标签拖拽排序：Tauri 在 Windows 上默认 dragDropEnabled 会吞掉 HTML5 拖拽事件，
// 这里用指针事件自己实现（松手前移动超过 4px 才算拖拽，单纯点击仍切换标签）
const dragId = ref('')
const dragName = computed(() => store.tabs.find((t) => t.id === dragId.value)?.name ?? '')
// 跟随光标的拖拽提示，右下偏移一点避免挡住鼠标
const ghostX = ref(0)
const ghostY = ref(0)
let pendingId = ''
let pressed = false
/** 本次按下是否已经变成拖拽：拖完松手时浏览器仍会补一个 click，不能当成切换标签 */
let dragged = false
let startX = 0
let startY = 0

function onClick(id: string) {
  if (dragged) {
    dragged = false
    return
  }
  store.switchTab(id)
}

function onPointerDown(e: PointerEvent, id: string) {
  if (e.button !== 0) return
  // 关闭按钮上按下不启动拖拽
  if ((e.target as HTMLElement).closest('.file-tabs__close')) return
  pressed = true
  dragged = false
  pendingId = id
  startX = e.clientX
  startY = e.clientY
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
  document.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!pressed) return
  if (!dragId.value) {
    if (Math.abs(e.clientX - startX) < 4 && Math.abs(e.clientY - startY) < 4) return
    dragged = true
    dragId.value = pendingId
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }
  ghostX.value = e.clientX + 14
  ghostY.value = e.clientY + 10
  const hit = document
    .elementFromPoint(e.clientX, e.clientY)
    ?.closest<HTMLElement>('.file-tabs__item')
  const targetId = hit?.dataset.tabId
  if (!targetId || targetId === dragId.value) return
  const from = store.tabs.findIndex((t) => t.id === dragId.value)
  const to = store.tabs.findIndex((t) => t.id === targetId)
  if (from === -1 || to === -1) return
  // 越过目标标签中线才换位，否则窄标签会被光标反复顶回去（抖动）
  const rect = hit!.getBoundingClientRect()
  const mid = rect.left + rect.width / 2
  if (from < to ? e.clientX > mid : e.clientX < mid) store.moveTab(dragId.value, targetId)
}

function onPointerUp() {
  pressed = false
  dragId.value = ''
  pendingId = ''
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  document.removeEventListener('pointercancel', onPointerUp)
}

function onContextMenu(e: MouseEvent, id: string) {
  closeMenu()
  menuTargetId.value = id
  menuX.value = e.clientX
  menuY.value = e.clientY
  menuVisible.value = true
  document.addEventListener('mousedown', onOutsideClick)
  document.addEventListener('keydown', onEscape)
}

function closeMenu() {
  menuVisible.value = false
  menuTargetId.value = ''
  document.removeEventListener('mousedown', onOutsideClick)
  document.removeEventListener('keydown', onEscape)
}

function onOutsideClick(e: MouseEvent) {
  const menu = document.querySelector('.tab-context-menu')
  if (menu && !menu.contains(e.target as Node)) {
    closeMenu()
  }
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMenu()
  }
}

async function handleClose(id: string) {
  const tab = store.tabs.find((t) => t.id === id)
  if (tab && !tab.saved) {
    const confirmed = await showConfirm({
      title: 'Unsaved Changes',
      message: `"${tab.name}" has unsaved changes. Are you sure you want to close it?`,
      confirmLabel: 'Quit',
      cancelLabel: 'Stay',
    })
    if (!confirmed) return
  }
  store.closeTab(id)
}

async function handleMenuClose() {
  const id = menuTargetId.value
  closeMenu()
  if (id) await handleClose(id)
}

async function handleMenuCloseOthers() {
  const id = menuTargetId.value
  const otherUnsaved = store.tabs.filter(
    (t) => t.id !== id && !t.saved,
  )
  closeMenu()
  if (otherUnsaved.length > 0) {
    const names = otherUnsaved.map((t) => t.name).join(', ')
    const confirmed = await showConfirm({
      title: 'Unsaved Changes',
      message: `${names} has unsaved changes. Are you sure you want to close other tabs?`,
      confirmLabel: 'Quit',
      cancelLabel: 'Stay',
    })
    if (!confirmed) return
  }
  store.closeOtherTabs(id)
}

/** 关闭某一侧的全部标签，有未保存的先确认 */
async function confirmAndCloseSide(id: string, side: 'left' | 'right') {
  const idx = store.tabs.findIndex((t) => t.id === id)
  if (idx === -1) return
  const sideTabs = side === 'left' ? store.tabs.slice(0, idx) : store.tabs.slice(idx + 1)
  closeMenu()
  const unsaved = sideTabs.filter((t) => !t.saved)
  if (unsaved.length > 0) {
    const names = unsaved.map((t) => t.name).join(', ')
    const where = side === 'left' ? 'left' : 'right'
    const confirmed = await showConfirm({
      title: 'Unsaved Changes',
      message: `${names} has unsaved changes. Are you sure you want to close tabs to the ${where}?`,
      confirmLabel: 'Quit',
      cancelLabel: 'Stay',
    })
    if (!confirmed) return
  }
  if (side === 'left') store.closeTabsToLeft(id)
  else store.closeTabsToRight(id)
}

function handleMenuCloseLeft() {
  void confirmAndCloseSide(menuTargetId.value, 'left')
}

function handleMenuCloseRight() {
  void confirmAndCloseSide(menuTargetId.value, 'right')
}

async function handleMenuCloseAll() {
  const unsaved = store.tabs.filter((t) => !t.saved)
  closeMenu()
  if (unsaved.length > 0) {
    const confirmed = await showConfirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved files. Are you sure you want to close all tabs?',
      confirmLabel: 'Quit',
      cancelLabel: 'Stay',
    })
    if (!confirmed) return
  }
  store.closeAllTabs()
}
</script>

<style scoped lang="scss">
.file-tabs {
  display: flex;
  align-items: center;
  height: 2.286rem;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;

  &::-webkit-scrollbar {
    height: 0;
  }

  &__list {
    display: flex;
    height: 100%;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.429rem;
    padding: 0 0.857rem;
    height: 100%;
    font-size: 0.857rem;
    color: var(--text-secondary);
    cursor: grab;
    border-right: 1px solid var(--border-color);
    white-space: nowrap;
    user-select: none;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--bg-hover);
    }

    &:active {
      cursor: grabbing;
    }

    &--active {
      color: var(--text-primary);
      background: var(--bg-secondary);
      border-bottom: 2px solid var(--accent-color);
    }

    &--dragging {
      opacity: 0.4;
      background: var(--bg-active);
      box-shadow: inset 0 0 0 1px var(--accent-color);
    }
  }

  /* 拖拽时跟随光标的标签副本，让「正在拖动」一眼可见 */
  &__ghost {
    position: fixed;
    z-index: 10001;
    display: flex;
    align-items: center;
    gap: 0.429rem;
    padding: 0.286rem 0.714rem;
    font-size: 0.857rem;
    color: var(--text-primary);
    background: var(--bg-secondary);
    border: 1px solid var(--accent-color);
    border-radius: 0.429rem;
    box-shadow: 0 0.286rem 0.857rem rgba(0, 0, 0, 0.18);
    pointer-events: none;
    white-space: nowrap;
    opacity: 0.9;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    line-height: 0;
  }

  &__name {
    max-width: 8.571rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.143rem;
    height: 1.143rem;
    border: none;
    border-radius: 0.214rem;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.786rem;
    cursor: pointer;
    line-height: 1;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 0, 0, 0.15);
      color: #e53e3e;
    }
  }
}
</style>
