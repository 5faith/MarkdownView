import { useMarkdownStore } from '../stores/useMarkdownStore'
import { showConfirm } from './showConfirm'

/**
 * 关闭标签的统一入口（标签上的 x、右键 Close、Ctrl+W 共用）。
 * 未保存时先确认；返回是否真的关掉了。
 */
export async function closeTabWithConfirm(id: string): Promise<boolean> {
  const store = useMarkdownStore()
  const tab = store.tabs.find((t) => t.id === id)
  if (!tab) return false
  if (!tab.saved) {
    const confirmed = await showConfirm({
      title: 'Unsaved Changes',
      message: `"${tab.name}" has unsaved changes. Are you sure you want to close it?`,
      confirmLabel: 'Quit',
      cancelLabel: 'Stay',
    })
    if (!confirmed) return false
  }
  store.closeTab(id)
  return true
}
