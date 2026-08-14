<template>
  <div class="preview-pane" :class="`preview-pane--${store.theme}`">
    <div class="preview-pane__content" ref="previewRef" v-html="renderedHtml" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'

const store = useMarkdownStore()
const previewRef = ref<HTMLElement | null>(null)

const renderedHtml = computed(() => {
  const { content } = store
  if (!content) return '<p class="preview-pane__empty">No content to preview</p>'
  return simpleMarkdownToHtml(content)
})

function simpleMarkdownToHtml(md: string): string {
  let html = md

  html = html.replace(/^### (.+)$/gm, (_m: string, t: string) => `<h3 id="${slugify(t)}">${t}</h3>`)
  html = html.replace(/^## (.+)$/gm, (_m: string, t: string) => `<h2 id="${slugify(t)}">${t}</h2>`)
  html = html.replace(/^# (.+)$/gm, (_m: string, t: string) => `<h1 id="${slugify(t)}">${t}</h1>`)

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match: string, _lang: string, code: string) => {
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`
  })

  html = html.replace(/\|(.+)\|/g, (_match: string, content: string) => {
    const cells = content.split('|').map((c: string) => c.trim())
    if (cells.every((c: string) => /^[-:]+$/.test(c))) return ''
    const tag = cells.some((c: string) => /^[-:]+$/.test(c)) ? 'th' : 'td'
    const row = cells.map((c: string) => `<${tag}>${c}</${tag}>`).join('')
    return `<tr>${row}</tr>`
  })

  html = html.replace(/(<tr>[\s\S]*?<\/tr>)/g, (block: string) => {
    if (!block.includes('<th>')) return `<table><tbody>${block}</tbody></table>`
    const rows = block.match(/<tr>[\s\S]*?<\/tr>/g)
    if (!rows) return block
    const thead = rows.filter((r: string) => r.includes('<th>')).map((r: string) => r.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')).join('')
    const tbody = rows.filter((r: string) => !r.includes('<th>')).join('')
    return `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`
  })

  html = html.replace(/<\/table>\s*<table>/g, '')

  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`(.+?)`/g, '<code>$1</code>')

  html = html.replace(/^\- (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, (block: string) => {
    if (block.startsWith('<ul>') || block.startsWith('<ol>')) return block
    return `<ul>${block}</ul>`
  })

  html = html.replace(/\n{2,}/g, '</p><p>')
  html = `<p>${html}</p>`
  html = html.replace(/<p>\s*<(h[1-6]|pre|blockquote|table|ul|ol)/g, '<$1')
  html = html.replace(/<\/(h[1-6]|pre|blockquote|table|ul|ol)>\s*<\/p>/g, '</$1>')
  html = html.replace(/<p>\s*<\/p>/g, '')

  return html
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
}
</script>

<style scoped lang="scss">
.preview-pane {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 24px 32px;
  font-size: 15px;
  line-height: 1.75;
  color: var(--text-primary);
  background: var(--bg-primary);

  &--dark {
    color: #e0e0e0;
    background: #1a1a2e;
  }

  &__content {
    max-width: 800px;
    margin: 0 auto;
  }

  &__empty {
    color: var(--text-secondary);
    text-align: center;
    padding: 40px 0;
  }

  :deep(h1) {
    font-size: 2em;
    margin: 0.67em 0;
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--border-color);
  }

  :deep(h2) {
    font-size: 1.5em;
    margin: 0.83em 0;
    padding-bottom: 0.25em;
    border-bottom: 1px solid var(--border-color);
  }

  :deep(h3) {
    font-size: 1.17em;
    margin: 1em 0;
  }

  :deep(pre) {
    background: var(--bg-code);
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    font-size: 13px;
  }

  :deep(code) {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    background: var(--bg-code);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.9em;
  }

  :deep(pre code) {
    background: none;
    padding: 0;
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid var(--border-color);
    padding: 8px 12px;
    text-align: left;
  }

  :deep(th) {
    background: var(--bg-secondary);
    font-weight: 600;
  }

  :deep(blockquote) {
    border-left: 4px solid var(--accent-color);
    margin: 1em 0;
    padding: 0.5em 1em;
    color: var(--text-secondary);
    background: var(--bg-secondary);
    border-radius: 0 4px 4px 0;
  }

  :deep(ul) {
    padding-left: 2em;
  }

  :deep(li) {
    margin: 0.25em 0;
  }

  :deep(a) {
    color: var(--accent-color);
    text-decoration: none;
  }

  :deep(a:hover) {
    text-decoration: underline;
  }
}
</style>
