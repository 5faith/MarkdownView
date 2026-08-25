<template>
  <div class="outline-pane" :style="{ width: store.outlineWidth + 'px' }">
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
    <div
      class="outline-pane__resize"
      @mousedown.prevent="onResizeStart"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import OutlineNode from './OutlineNode.vue'

export interface OutlineItem {
  level: number
  text: string
  slug: string
  children: OutlineItem[]
}

const store = useMarkdownStore()

const tree = ref<OutlineItem[]>([])

function parseTree() {
  const id = store.activeId
  const file = store.tabs.find((t) => t.id === id)
  const content = file?.content ?? ''
  const lines = content.split('\n')
  const items: { level: number; text: string; slug: string }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.replace(/\r/g, '')

    // ATX heading: # heading ... ######
    const atxMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (atxMatch) {
      const level = atxMatch[1]!.length
      const text = atxMatch[2]!.trim()
      items.push({ level, text, slug: slugify(text) })
      continue
    }

    // Setext heading: text followed by === (h1) or --- (h2)
    if (i + 1 < lines.length && line.trim().length > 0) {
      const nextLine = lines[i + 1]!.replace(/\r/g, '')
      if (/^={3,}\s*$/.test(nextLine)) {
        items.push({ level: 1, text: line.trim(), slug: slugify(line.trim()) })
      } else if (/^-{3,}\s*$/.test(nextLine)) {
        items.push({ level: 2, text: line.trim(), slug: slugify(line.trim()) })
      }
    }
  }

  tree.value = buildTree(items)
}

let stopSubscription: (() => void) | null = null

onMounted(() => {
  parseTree()
  stopSubscription = store.$subscribe(() => parseTree(), { flush: 'sync' })
})

onBeforeUnmount(() => {
  stopSubscription?.()
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

let resizing = false

function onResizeStart(e: MouseEvent) {
  e.preventDefault()
  resizing = true
  const startX = e.clientX
  const startWidth = store.outlineWidth

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  function onMouseMove(e: MouseEvent) {
    if (!resizing) return
    const delta = startX - e.clientX
    const newWidth = Math.min(400, Math.max(160, startWidth + delta))
    store.setOutlineWidth(newWidth)
  }

  function onMouseUp() {
    resizing = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(() => {
  if (resizing) {
    resizing = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
})
</script>

<style scoped lang="scss">
.outline-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  flex-shrink: 0;
  position: relative;

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

  &__resize {
    position: absolute;
    top: 0;
    right: -2px;
    width: 4px;
    height: 100%;
    cursor: col-resize;
    z-index: 10;

    &:hover {
      background: var(--accent-color);
    }
  }
}
</style>
