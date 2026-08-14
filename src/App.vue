<template>
  <div
    class="app"
    :data-theme="store.theme"
    :class="{ 'app--dragging': dragDrop.isDragging.value }"
    @dragover="dragDrop.onDragOver"
    @dragleave="dragDrop.onDragLeave"
    @drop="dragDrop.onDrop"
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
          <p class="app__empty-sub">Drag & drop a file or click Open</p>
        </div>
      </div>
    </div>

    <div v-if="dragDrop.isDragging.value" class="app__drag-overlay">
      <div class="app__drag-hint">
        <span class="app__drag-icon">📄</span>
        <span>Drop Markdown file here</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useMarkdownStore } from './stores/useMarkdownStore'
import { useDragDrop } from './composables/useDragDrop'
import AppBar from './components/AppBar.vue'
import FileTabs from './components/FileTabs.vue'
import VditorEditor from './components/VditorEditor.vue'
import OutlinePane from './components/OutlinePane.vue'

const store = useMarkdownStore()
const dragDrop = useDragDrop()

onMounted(() => {
  store.initDefault()
})

async function handleBeforeClose(e: Event) {
  if (!store.hasUnsaved()) return
  e.preventDefault()
}

function setupCloseConfirmation() {
  window.addEventListener('beforeunload', handleBeforeClose)

  import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
    const win = getCurrentWindow()
    win.onCloseRequested(async (event) => {
      event.preventDefault()
      if (!store.hasUnsaved()) {
        win.destroy()
        return
      }
      const { ask } = await import('@tauri-apps/plugin-dialog')
      const confirmed = await ask('You have unsaved files. Are you sure you want to quit?', {
        title: 'Unsaved Changes',
        kind: 'warning',
      })
      if (confirmed) {
        win.destroy()
      }
    })
  }).catch(() => {
  })
}

setupCloseConfirmation()

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeClose)
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
  }
}
</style>
