<template>
  <div
    class="app"
    :data-theme="store.theme"
    :class="{ 'app--dragging': dragDrop.isDragging.value }"
  >
    <AppBar />
    <FileTabs v-if="store.tabs.length > 1" />

    <div class="app__body">
      <OutlinePane v-if="store.showOutline && store.activeId" />
      <div v-if="store.activeId" class="app__editor">
        <VditorEditor :key="store.activeId" container-id="vditor-editor" />
      </div>

      <div v-if="!store.activeId" class="app__empty">
        <div class="app__empty-hint">
          <span class="app__empty-icon">M</span>
          <p>MarkdownView</p>
          <p class="app__empty-sub">Drag & drop a file here or click Open</p>
          <p class="app__empty-formats">
            Supported: .md .markdown .txt .mdown .mkd
          </p>
        </div>
      </div>
    </div>

    <div v-if="store.loading" class="app__loading">
      <div class="app__loading-spinner"></div>
      <span>Exporting PDF...</span>
    </div>

    <div v-if="dragDrop.isDragging.value" class="app__drag-overlay">
      <div class="app__drag-hint">
        <span class="app__drag-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </span>
        <span>Drop file here</span>
        <span class="app__drag-sub">.md .markdown .txt .mdown .mkd</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppBar from './components/AppBar.vue'
import FileTabs from './components/FileTabs.vue'
import OutlinePane from './components/OutlinePane.vue'
import VditorEditor from './components/VditorEditor.vue'
import { useCloseConfirmation } from './composables/useCloseConfirmation'
import { useDragDrop } from './composables/useDragDrop'
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts'
import { useMarkdownStore } from './stores/useMarkdownStore'

const store = useMarkdownStore()
const dragDrop = useDragDrop()
const { setup: setupCloseConfirmation } = useCloseConfirmation(store)
useKeyboardShortcuts()

onMounted(async () => {
  store.initDefault()
  await dragDrop.setup()
  await setupCloseConfirmation()
})
</script>

<style scoped lang="scss">
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;

  &__body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  &__editor {
    flex: 1;
    min-width: 0;
  }

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__empty-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 14px;
  }

  &__empty-icon {
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: var(--accent-color);
    color: #fff;
    font-weight: 700;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__empty-sub {
    font-size: 12px;
    opacity: 0.6;
  }

  &__empty-formats {
    font-size: 11px;
    opacity: 0.4;
    margin-top: -4px;
  }

  &__drag-overlay {
    position: absolute;
    inset: 0;
    background: var(--drag-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
  }

  &__drag-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 60px;
    background: var(--bg-primary);
    border: 2px dashed var(--accent-color);
    border-radius: 12px;
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 500;
  }

  &__drag-icon {
    font-size: 48px;
    color: var(--accent-color);
  }

  &__drag-sub {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 400;
  }

  &__loading {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    z-index: 2000;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
  }

  &__loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
