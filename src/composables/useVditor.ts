import { ref, onBeforeUnmount, watch, nextTick } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { useMarkdownStore } from '../stores/useMarkdownStore'

async function loadIcons(cdn: string, icon: string) {
  if (document.getElementById('vditorIconScript')) return
  try {
    const resp = await fetch(`${cdn}/dist/js/icons/${icon}.js`)
    if (!resp.ok) return
    const text = await resp.text()
    const el = document.createElement('script')
    el.id = 'vditorIconScript'
    el.text = text
    document.head.appendChild(el)
  } catch {
    // silent
  }
}

export function useVditor(containerId: string) {
  const store = useMarkdownStore()
  const editor = ref<Vditor | null>(null)
  let externalUpdate = false

  async function createEditor() {
    if (editor.value) {
      editor.value.destroy()
    }

    await loadIcons('/vditor', 'material')

    externalUpdate = true
    editor.value = new Vditor(containerId, {
      height: '100%',
      mode: 'ir',
      icon: 'material',
      outline: {
        enable: false,
        position: 'left',
      },
      preview: {
        mode: 'both',
      },
      counter: {
        enable: true,
        type: 'text',
      },
      value: store.content,
      theme: store.theme === 'dark' ? 'dark' : 'classic',
      cdn: '/vditor',
      input: (value: string) => {
        if (!externalUpdate) {
          store.setContent(value)
        }
      },
      after: () => {
        nextTick(() => {
          externalUpdate = false
          editor.value?.setTheme(
            store.theme === 'dark' ? 'dark' : 'classic',
            store.theme === 'dark' ? 'dark' : 'light',
          )
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

  watch(
    () => store.readingMode,
    (isReading) => {
      if (!editor.value) return
      if (isReading) {
        editor.value.disabled()
      } else {
        editor.value.enable()
        editor.value.focus()
      }
    },
  )

  onBeforeUnmount(() => {
    editor.value?.destroy()
    editor.value = null
  })

  return { createEditor, editor }
}
