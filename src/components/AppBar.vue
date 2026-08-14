<template>
  <div class="app-bar">
    <div class="app-bar__left">
      <span class="app-bar__logo">M</span>
      <span class="app-bar__title">
        {{ store.fileName }}{{ store.isSaved ? '' : ' *' }}
      </span>
    </div>

    <div class="app-bar__center">
      <ModeTab />
    </div>

    <div class="app-bar__right">
      <button class="app-bar__btn" @click="fileOps.newFile" title="New">
        <span>📄</span>
      </button>
      <button class="app-bar__btn" @click="fileOps.openFile" title="Open">
        <span>📂</span>
      </button>
      <button class="app-bar__btn" @click="fileOps.saveFile" title="Save">
        <span>💾</span>
      </button>
      <div class="app-bar__separator" />
      <button
        class="app-bar__btn"
        :class="{ 'app-bar__btn--active': store.showOutline }"
        @click="store.toggleOutline"
        title="Toggle outline"
      >
        <span>☰</span>
      </button>
      <button class="app-bar__btn" @click="store.toggleTheme" :title="`Switch to ${store.theme === 'light' ? 'dark' : 'light'} mode`">
        <span>{{ store.theme === 'light' ? '🌙' : '☀️' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { useFileOperation } from '../composables/useFileOperation'
import ModeTab from './ModeTab.vue'

const store = useMarkdownStore()
const fileOps = useFileOperation()
</script>

<style scoped lang="scss">
.app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  user-select: none;
  -webkit-app-region: drag;

  &__left,
  &__center,
  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__logo {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background: var(--accent-color);
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.15s;
    -webkit-app-region: no-drag;

    &:hover {
      background: var(--bg-hover);
    }

    &--active {
      color: var(--accent-color);
      background: var(--bg-active);
    }
  }

  &__separator {
    width: 1px;
    height: 16px;
    background: var(--border-color);
  }
}
</style>
