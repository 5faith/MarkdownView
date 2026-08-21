<template>
  <div class="file-tabs">
    <div class="file-tabs__list">
      <div
        v-for="tab in store.tabs"
        :key="tab.id"
        class="file-tabs__item"
        :class="{ 'file-tabs__item--active': tab.id === store.activeId }"
        @click="store.switchTab(tab.id)"
        @contextmenu.prevent="onContextMenu($event, tab.id)"
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
  </div>

  <TabContextMenu
    :visible="menuVisible"
    :x="menuX"
    :y="menuY"
    :can-close-others="store.tabs.length > 1"
    :can-close-all="store.tabs.length > 0"
    @close="handleMenuClose"
    @close-others="handleMenuCloseOthers"
    @close-all="handleMenuCloseAll"
    @close-menu="closeMenu"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { showConfirm } from '../composables/showConfirm'
import FileIcon from './FileIcon.vue'
import TabContextMenu from './TabContextMenu.vue'

const store = useMarkdownStore()

const menuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const menuTargetId = ref('')

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
  height: 32px;
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
    gap: 6px;
    padding: 0 12px;
    height: 100%;
    font-size: 12px;
    color: var(--text-secondary);
    cursor: pointer;
    border-right: 1px solid var(--border-color);
    white-space: nowrap;
    user-select: none;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--bg-hover);
    }

    &--active {
      color: var(--text-primary);
      background: var(--bg-secondary);
      border-bottom: 2px solid var(--accent-color);
    }
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    line-height: 0;
  }

  &__name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 11px;
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
