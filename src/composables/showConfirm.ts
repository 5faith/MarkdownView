import { createApp, h } from 'vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const app = createApp({
      render() {
        return h(ConfirmDialog, {
          title: options.title ?? 'Unsaved Changes',
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'Quit',
          cancelLabel: options.cancelLabel ?? 'Cancel',
          onConfirm() {
            app.unmount()
            container.remove()
            resolve(true)
          },
          onCancel() {
            app.unmount()
            container.remove()
            resolve(false)
          },
        })
      },
    })

    app.mount(container)
  })
}
