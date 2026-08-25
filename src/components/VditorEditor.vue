<template>
  <div class="vditor-editor" :class="{ 'vditor-editor--reading': store.readingMode }" :id="containerId" />
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useVditor } from '../composables/useVditor'
import { currentEditor } from '../shared/editor'
import { useMarkdownStore } from '../stores/useMarkdownStore'

const props = defineProps<{ containerId: string }>()

const store = useMarkdownStore()
const { createEditor, editor } = useVditor(props.containerId)

watch(editor, (val) => {
  currentEditor.value = val
}, { immediate: true })

onMounted(() => {
  createEditor()
})
</script>

<style scoped lang="scss">
.vditor-editor {
  width: 100%;
  height: 100%;
  overflow: hidden;

  &--reading {
    :deep(.vditor-toolbar) {
      display: none !important;
    }
    :deep(.vditor-counter) {
      display: none !important;
    }
    :deep(.vditor-content) {
      padding-top: 0 !important;
    }
  }
}
</style>
