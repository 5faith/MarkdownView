<template>
  <div class="vditor-editor" :id="containerId" />
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useVditor } from '../composables/useVditor'
import { currentEditor } from '../shared/editor'

const props = defineProps<{ containerId: string }>()

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
}
</style>
