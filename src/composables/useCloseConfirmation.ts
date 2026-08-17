import { getCurrentWindow } from '@tauri-apps/api/window'
import { ask } from '@tauri-apps/plugin-dialog'
import { exit } from '@tauri-apps/plugin-process'
import { useMarkdownStore } from '../stores/useMarkdownStore'

type Store = ReturnType<typeof useMarkdownStore>

export function useCloseConfirmation(store: Store) {
  async function setup() {
    const win = getCurrentWindow()
    await win.onCloseRequested(async (event) => {
      if (!store.hasUnsaved()) {
        await exit(0)
        return
      }

      event.preventDefault()
      const confirmed = await ask(
        'You have unsaved files. Are you sure you want to quit?',
        { title: 'Unsaved Changes', kind: 'warning' },
      )
      if (confirmed) {
        await exit(0)
      }
    })
  }

  return { setup }
}
