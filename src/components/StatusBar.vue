<template>
  <div class="status-bar" role="status">
    <span class="status-bar__name">
      {{ store.fileName }}{{ store.isSaved ? '' : ' ●' }}
    </span>
    <span class="status-bar__sep">·</span>
    <span>{{ countWords(store.content) }} 字</span>
    <span class="status-bar__sep">·</span>
    <span>{{ store.content.length }} 字符</span>
    <span class="status-bar__spacer" />
    <span v-if="showCaret">行 {{ store.caret.line }}，列 {{ store.caret.col }}</span>
    <span v-if="showCaret" class="status-bar__sep">·</span>
    <button
      class="status-bar__toggle"
      :class="{ 'status-bar__toggle--on': store.typewriter }"
      :aria-pressed="store.typewriter"
      title="打字机滚动模式"
      @click="store.toggleTypewriter"
    >
      打字机
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { isMarkdownFile } from '../utils/fileType'

const store = useMarkdownStore()

const showCaret = computed(() => {
  const name = store.activeFile?.name
  return !!name && isMarkdownFile(name)
})

/** CJK 按字计数，拉丁按词计数 */
function countWords(text: string): number {
  const segments = text.replace(/\s+/g, '').match(/[a-zA-Z0-9\u4e00-\u9fff\u3040-\u30ff]+/g) ?? []
  return segments.reduce(
    (n, seg) => n + (/[\u4e00-\u9fff\u3040-\u30ff]/.test(seg[0] ?? '') ? seg.length : 1),
    0,
  )
}
</script>

<style scoped lang="scss">
.status-bar {
  display: flex;
  align-items: center;
  gap: 0.571rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.857rem;
  padding: 0.286rem 1rem;
  flex-shrink: 0;
  user-select: none;
  -webkit-app-region: drag;

  &__name {
    max-width: 17.143rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__sep {
    opacity: 0.5;
  }

  &__spacer {
    flex: 1;
  }

  &__toggle {
    border: 1px solid var(--border-color);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.857rem;
    padding: 2px 0.714rem;
    border-radius: 7.071rem;
    cursor: pointer;
    -webkit-app-region: no-drag;
    transition: color 0.15s, border-color 0.15s;

    &:hover {
      color: var(--text-primary);
      background: var(--bg-hover);
    }

    &--on {
      color: var(--accent-color);
      border-color: var(--accent-color);
    }
  }
}
</style>
