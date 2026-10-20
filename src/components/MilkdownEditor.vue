<template>
  <div class="milkdown-editor">
    <div ref="scrollEl" class="milkdown-editor__scroll">
      <div ref="rootEl" class="milkdown-editor__root" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMilkdown } from '../composables/useMilkdown'

const rootEl = ref<HTMLElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (rootEl.value) {
    const { createEditor } = useMilkdown(rootEl.value, scrollEl.value)
    createEditor()
  }
})
</script>

<style scoped lang="scss">
.milkdown-editor {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &__scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  &__root {
    min-height: 100%;
  }
}
</style>
