import { useMarkdownStore } from '../stores/useMarkdownStore'
import type { MarkdownFile } from '../types'

export function useFileOperation() {
  const store = useMarkdownStore()

  async function openFile() {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')

    const selected = await open({
      multiple: false,
      filters: [{ name: 'All Files', extensions: ['*'] }],
    })

    if (selected && typeof selected === 'string') {
      const text = await readTextFile(selected)
      const name = selected.split(/[/\\]/).pop() ?? 'Untitled'
      const file: MarkdownFile = {
        id: '',
        path: selected,
        content: text,
        name,
        saved: true,
      }
      store.setCurrentFile(file)
    }
  }

  async function saveFile() {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')

    const active = store.activeFile
    if (active?.path) {
      await writeTextFile(active.path, active.content)
      store.markSaved()
      return
    }

    const path = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })

    if (path) {
      const content = store.content
      await writeTextFile(path, content)
      const name = path.split(/[/\\]/).pop() ?? 'Untitled'
      store.setCurrentFile({
        id: '',
        path,
        content,
        name,
        saved: true,
      })
    }
  }

  async function saveFileAs() {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')

    const path = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })

    if (path) {
      const content = store.content
      await writeTextFile(path, content)
      const name = path.split(/[/\\]/).pop() ?? 'Untitled'
      store.setCurrentFile({
        id: '',
        path,
        content,
        name,
        saved: true,
      })
    }
  }

  function newFile() {
    store.newFile()
  }

  async function openFolder() {
    const { open } = await import('@tauri-apps/plugin-dialog')

    const selected = await open({
      directory: true,
      multiple: false,
    })

    if (selected && typeof selected === 'string') {
      store.setWorkspace(selected)
    }
  }

  return { openFile, saveFile, saveFileAs, newFile, openFolder }
}
