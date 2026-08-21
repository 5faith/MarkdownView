<template>
  <div class="outline-node">
    <div
      class="outline-node__item"
      :class="`outline-node__item--h${node.level}`"
      :style="{ paddingLeft: `${(node.level - 1) * 16 + 8}px` }"
    >
      <span
        v-if="node.children.length > 0"
        class="outline-node__arrow"
        :class="{ 'outline-node__arrow--open': expanded }"
        @click="expanded = !expanded"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M4 2 L8 6 L4 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span v-else class="outline-node__dot" />
      <span class="outline-node__text" @click="$emit('navigate', node.slug)">
        {{ node.text }}
      </span>
    </div>
    <div v-if="node.children.length > 0 && expanded" class="outline-node__children">
      <OutlineNode
        v-for="child in node.children"
        :key="child.slug"
        :node="child"
        @navigate="(slug: string) => $emit('navigate', slug)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { OutlineItem } from './OutlinePane.vue'

defineProps<{ node: OutlineItem }>()
defineEmits<{ navigate: [slug: string] }>()

const expanded = ref(true)
</script>

<style scoped lang="scss">
.outline-node {
  &__item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 12px;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 4px;
    margin: 1px 4px;
    transition: background 0.15s;

    &:hover {
      background: var(--bg-hover);
    }

    &--h1 { font-weight: 700; font-size: 14px; }
    &--h2 { font-weight: 600; font-size: 13px; }
    &--h3 { font-weight: 500; font-size: 13px; }
    &--h4,
    &--h5,
    &--h6 { font-weight: 400; font-size: 12px; color: var(--text-secondary); }
  }

  &__arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--text-secondary);
    transition: transform 0.15s;

    &--open {
      transform: rotate(90deg);
    }
  }

  &__dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--text-secondary);
    flex-shrink: 0;
    margin: 0 6px;
  }

  &__text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__children {
    overflow: hidden;
  }
}
</style>
