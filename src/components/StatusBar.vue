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
}
</style>
