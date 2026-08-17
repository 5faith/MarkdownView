import { getCurrentWindow } from '@tauri-apps/api/window'
import { exit } from '@tauri-apps/plugin-process'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { showConfirm } from './showConfirm'

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
      const confirmed = await showConfirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved files. Are you sure you want to quit?',
        confirmLabel: 'Quit',
        cancelLabel: 'Stay',
      })
      if (confirmed) {
        await exit(0)
      }
    })
  }

  return { setup }
}
