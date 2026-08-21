<template>
  <span class="file-icon" v-html="svg" :style="{ width: `${size}px`, height: `${size}px` }" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getIcon } from 'material-file-icons'

const props = withDefaults(defineProps<{
  name: string
  size?: number
}>(), {
  size: 16,
})

const svg = computed(() => getIcon(props.name).svg)
</script>

<style scoped>
.file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 0;
}
.file-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
