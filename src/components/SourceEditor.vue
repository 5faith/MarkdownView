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
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { sourceEditorApi } from '../shared/editor'

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
  // 行高跟随实际样式（rem 缩放后不能写死 14px）
  const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 24
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

onMounted(() => {
  const ta = taEl.value
  if (!ta) return
  sourceEditorApi.value = {
    getSelection: () => ({ start: ta.selectionStart, end: ta.selectionEnd }),
    replaceRange: (start, end, text, selStart, selEnd) => {
      ta.focus()
      ta.setSelectionRange(start, end)
      // execCommand 走浏览器原生编辑栈，保留 Ctrl+Z 撤销能力
      let ok = false
      try {
        ok = document.execCommand('insertText', false, text)
      } catch { ok = false }
      if (!ok) {
        ta.setRangeText(text, start, end, 'end')
        ta.dispatchEvent(new Event('input', { bubbles: true }))
      }
      ta.setSelectionRange(selStart, selEnd)
      updateCaret()
    },
    execUndoRedo: (kind) => {
      ta.focus()
      try {
        document.execCommand(kind)
      } catch { /* unsupported */ }
      updateCaret()
    },
  }
})

onBeforeUnmount(() => {
  if (sourceEditorApi.value) sourceEditorApi.value = null
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
  font-size: 1rem;
  line-height: 1.7;
  padding: 2.286rem 1.714rem 6.857rem;
}
</style>
