<template>
  <div class="mode-tab">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="mode-tab__btn"
      :class="{ 'mode-tab__btn--active': store.viewMode === tab.value }"
      @click="store.setViewMode(tab.value)"
    >
      <span class="mode-tab__icon" v-html="tab.icon" />
      <span class="mode-tab__label">{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useMarkdownStore } from '../stores/useMarkdownStore'
import type { ViewMode } from '../types'

const store = useMarkdownStore()

interface Tab {
  value: ViewMode
  label: string
  icon: string
}

const tabs: Tab[] = [
  { value: 'split', label: 'Split', icon: '⬛' },
  { value: 'edit', label: 'Edit', icon: '📝' },
  { value: 'preview', label: 'Preview', icon: '👁' },
]
</script>

<style scoped lang="scss">
.mode-tab {
  display: flex;
  gap: 2px;
  background: var(--bg-secondary);
  border-radius: 6px;
  padding: 2px;

  &__btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }

    &--active {
      color: var(--text-primary);
      background: var(--bg-active);
      font-weight: 500;
    }
  }

  &__icon {
    font-size: 12px;
  }

  &__label {
    font-size: 12px;
  }
}
</style>
