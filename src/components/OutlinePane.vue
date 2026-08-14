<template>
  <div class="outline-pane">
    <div class="outline-pane__header">
      <span class="outline-pane__title">Outline</span>
    </div>
    <div class="outline-pane__body">
      <div v-if="outline.length === 0" class="outline-pane__empty">
        No headings found
      </div>
      <div
        v-for="(item, index) in outline"
        :key="index"
        class="outline-pane__item"
        :class="`outline-pane__item--h${item.level}`"
        :style="{ paddingLeft: `${(item.level - 1) * 16 + 8}px` }"
        @click="scrollToHeading(item.slug)"
      >
        {{ item.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOutline } from '../composables/useOutline'

const { outline } = useOutline()

function scrollToHeading(slug: string) {
  const previewEl = document.querySelector('.preview-pane__content')
  if (!previewEl) return

  const heading = previewEl.querySelector(`[id="${CSS.escape(slug)}"]`)
  if (heading) {
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  const allHeadings = previewEl.querySelectorAll('h1, h2, h3, h4, h5, h6')
  for (const el of allHeadings) {
    if (slugify(el.textContent?.trim() ?? '') === slug) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
}
</script>

<style scoped lang="scss">
.outline-pane {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);

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

  &__item {
    padding: 4px 12px;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.15s;
    border-radius: 4px;
    margin: 1px 4px;

    &:hover {
      background: var(--bg-hover);
    }

    &--h1 {
      font-weight: 700;
      font-size: 14px;
    }

    &--h2 {
      font-weight: 600;
      font-size: 13px;
    }

    &--h3 {
      font-weight: 500;
      font-size: 13px;
    }

    &--h4,
    &--h5,
    &--h6 {
      font-weight: 400;
      font-size: 12px;
      color: var(--text-secondary);
    }
  }
}
</style>
