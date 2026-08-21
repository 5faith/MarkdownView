<template>
  <div class="cm-editor-wrapper">
    <Codemirror
      :model-value="modelValue"
      :extensions="extensions"
      :indent-with-tab="true"
      :tab-size="2"
      :style="{ height: '100%' }"
      @change="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { rust } from '@codemirror/lang-rust'
import { xml } from '@codemirror/lang-xml'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { getLanguageFromExtension } from '../utils/fileType'

const props = defineProps<{
  modelValue: string
  fileName: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const store = useMarkdownStore()

const languageExtension = computed(() => {
  const lang = getLanguageFromExtension(props.fileName)
  switch (lang) {
    case 'javascript': return javascript()
    case 'html': return html()
    case 'css': return css()
    case 'json': return json()
    case 'python': return python()
    case 'rust': return rust()
    case 'xml': return xml()
    case 'markdown': return markdown()
    default: return []
  }
})

const themeExtension = computed(() => {
  return store.theme === 'dark' ? oneDark : []
})

const extensions = computed(() => {
  return [basicSetup, languageExtension.value, themeExtension.value].flat()
})
</script>

<style scoped lang="scss">
.cm-editor-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;

  :deep(.cm-editor) {
    height: 100%;
  }
}
</style>
