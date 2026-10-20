<template>
  <div class="source-editor">
    <textarea
      ref="taEl"
      class="source-editor__ta"
      :value="store.content"
      spellcheck="false"
      aria-label="Markdown 源码"
      @input="onInput"
      @click="updateCaret"
      @keyup="updateCaret"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'

const store = useMarkdownStore()
const taEl = ref<HTMLTextAreaElement | null>(null)
let lastSynced = store.content

function updateCaret() {
  const ta = taEl.value
  if (!ta) return
  const upto = ta.value.slice(0, ta.selectionStart)
  const lines = upto.split('\n')
  store.setCaret({ line: lines.length, col: (lines[lines.length - 1]?.length ?? 0) + 1 })
  if (store.typewriter) scrollTypewriter()
}

function scrollTypewriter() {
  const ta = taEl.value
  if (!ta) return
  const upto = ta.value.slice(0, ta.selectionStart)
  const line = upto.split('\n').length - 1
  const lineHeight = 1.7 * 14
  const target = line * lineHeight - ta.clientHeight / 2 + lineHeight
  ta.scrollTop = Math.max(0, target)
}

function onInput(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  lastSynced = value
  store.setContent(value)
  updateCaret()
}

// 外部内容变更（文件监听/模板/重载）同步进 textarea
watch(() => store.content, (value) => {
  const ta = taEl.value
  if (!ta || value === lastSynced) return
  lastSynced = value
  ta.value = value
})

watch(() => store.activeId, () => {
  lastSynced = store.content
  store.setCaret({ line: 1, col: 1 })
})
</script>

<style scoped lang="scss">
.source-editor {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.source-editor__ta {
  display: block;
  width: 100%;
  height: 100%;
  overflow: auto;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.7;
  padding: 32px 24px 96px;
}
</style>
