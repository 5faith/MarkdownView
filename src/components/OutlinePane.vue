<template>
  <div class="outline-pane">
    <div class="outline-pane__header">
      <span class="outline-pane__title">Outline</span>
    </div>
    <div class="outline-pane__body">
      <div v-if="tree.length === 0" class="outline-pane__empty">
        No headings found
      </div>
      <OutlineNode
        v-for="node in tree"
        :key="node.slug"
        :node="node"
        @navigate="onNavigate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import OutlineNode from './OutlineNode.vue'

export interface OutlineItem {
  level: number
  text: string
  slug: string
  children: OutlineItem[]
}

const store = useMarkdownStore()

const tree = computed<OutlineItem[]>(() => {
  const lines = store.content.split('\n')
  const items: { level: number; text: string; slug: string }[] = []

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1]!.length
      const text = match[2]!.trim()
      const slug = slugify(text)
      items.push({ level, text, slug })
    }
  }

  return buildTree(items)
})

function buildTree(items: { level: number; text: string; slug: string }[]): OutlineItem[] {
  const root: OutlineItem[] = []
  const stack: OutlineItem[] = []

  for (const item of items) {
    const node: OutlineItem = { ...item, children: [] }

    while (stack.length > 0 && stack[stack.length - 1]!.level >= item.level) {
      stack.pop()
    }

    if (stack.length === 0) {
      root.push(node)
    } else {
      stack[stack.length - 1]!.children.push(node)
    }

    stack.push(node)
  }

  return root
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
}

function onNavigate(slug: string) {
  const vditorEl = document.getElementById('vditor-editor')
  if (!vditorEl) return

  const heading = vditorEl.querySelector(`[id="${CSS.escape(slug)}"]`)
  if (heading) {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  const allHeadings = vditorEl.querySelectorAll('h1, h2, h3, h4, h5, h6')
  for (const el of allHeadings) {
    if (slugify(el.textContent?.trim() ?? '') === slug) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
  }
}
</script>

<style scoped lang="scss">
.outline-pane {
  width: 220px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  flex-shrink: 0;

  &__header {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
  }

  &__title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  &__empty {
    padding: 16px 12px;
    font-size: 12px;
    color: var(--text-secondary);
    text-align: center;
  }
}
</style>
