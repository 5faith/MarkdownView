import { ref, onBeforeUnmount, watch, nextTick } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { useMarkdownStore } from '../stores/useMarkdownStore'

export function useVditor(containerId: string) {
  const store = useMarkdownStore()
  const editor = ref<Vditor | null>(null)
  let externalUpdate = false

  function createEditor() {
    if (editor.value) {
      editor.value.destroy()
    }

    editor.value = new Vditor(containerId, {
      height: '100%',
      mode: 'ir',
      outline: { enable: false, position: 'right' },
      toolbar: [],
      toolbarConfig: { hide: true },
      value: store.content,
      theme: store.theme === 'dark' ? 'dark' : 'classic',
      preview: {
        theme: { current: store.theme === 'dark' ? 'dark' : 'light' },
        markdown: { toc: true },
        mode: 'editor',
      },
      input: (value: string) => {
        if (!externalUpdate) {
          store.setContent(value)
        }
      },
      after: () => {
        nextTick(() => {
          editor.value?.focus()
        })
      },
    })
  }

  watch(
    () => store.theme,
    (newTheme) => {
      editor.value?.setTheme(
        newTheme === 'dark' ? 'dark' : 'classic',
        newTheme === 'dark' ? 'dark' : 'light',
      )
    },
  )

  watch(
    () => store.content,
    (newContent) => {
      if (!editor.value) return
      const currentValue = editor.value.getValue()
      if (currentValue !== newContent) {
        externalUpdate = true
        editor.value.setValue(newContent)
        externalUpdate = false
      }
    },
  )

  onBeforeUnmount(() => {
    editor.value?.destroy()
    editor.value = null
  })

  return { createEditor, editor }
}
