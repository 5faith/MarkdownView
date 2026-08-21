import { getCurrentWindow } from '@tauri-apps/api/window'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { showConfirm } from './showConfirm'

type Store = ReturnType<typeof useMarkdownStore>

export function useCloseConfirmation(store: Store) {
  async function setup() {
    const win = getCurrentWindow()
    await win.onCloseRequested(async (event) => {
      if (!store.hasUnsaved()) {
        return
      }

      event.preventDefault()
      const confirmed = await showConfirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved files. Are you sure you want to close?',
        confirmLabel: 'Close',
        cancelLabel: 'Stay',
      })
      if (confirmed) {
        win.destroy()
      }
    })
  }

  return { setup }
}
