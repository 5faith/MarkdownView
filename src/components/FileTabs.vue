<template>
  <div class="file-tabs">
    <div class="file-tabs__list">
      <div
        v-for="tab in store.tabs"
        :key="tab.id"
        class="file-tabs__item"
        :class="{ 'file-tabs__item--active': tab.id === store.activeId }"
        @click="store.switchTab(tab.id)"
      >
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
</template>

<script setup lang="ts">
import { useMarkdownStore } from '../stores/useMarkdownStore'

const store = useMarkdownStore()

function handleClose(id: string) {
  const tab = store.tabs.find((t) => t.id === id)
  if (tab && !tab.saved) {
    const confirmed = window.confirm(`"${tab.name}" has unsaved changes. Close without saving?`)
    if (!confirmed) return
  }
  store.closeTab(id)
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
