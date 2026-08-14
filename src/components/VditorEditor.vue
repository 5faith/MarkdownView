<template>
  <div class="vditor-editor" :id="containerId" />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useVditor } from '../composables/useVditor'

const props = defineProps<{ containerId: string }>()

const { createEditor } = useVditor(props.containerId)

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
