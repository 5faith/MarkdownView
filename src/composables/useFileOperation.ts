import { useMarkdownStore } from '../stores/useMarkdownStore'
import { showConfirm } from './showConfirm'
import { exportPdf } from './useExportPdf'
import { dirname, extractImageSrcs, isDiskAbsolutePath, isWebUrl, joinPath } from '../utils/localImage'
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
      // md 挪到新位置时，正文引用的相对路径图片一并复制过去，引用不断
      const oldPath = store.activeFile?.path ?? ''
      await writeTextFile(path, content)
      if (oldPath) await copyReferencedImages(content, oldPath, path)
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

  function closeActiveTab() {
    if (store.activeId) store.closeTab(store.activeId)
  }

  async function openFolder() {
    const { open } = await import('@tauri-apps/plugin-dialog')

    const selected = await open({
      directory: true,
      multiple: false,
    })

    if (selected && typeof selected === 'string') {
      if (store.workspacePath) {
        const openInNewWindow = await showConfirm({
          title: 'Open Folder',
          message: 'A folder is already open in this window. Open in a new window?',
          confirmLabel: 'New Window',
          cancelLabel: 'Current Window',
        })
        if (openInNewWindow) {
          openFolderInNewWindow(selected)
        } else {
          const oldPath = store.workspacePath
          if (store.hasUnsavedInWorkspace(oldPath)) {
            const confirmed = await showConfirm({
              title: 'Unsaved Changes',
              message: 'There are unsaved files in the current folder. Close them anyway?',
              confirmLabel: 'Close',
              cancelLabel: 'Cancel',
            })
            if (!confirmed) return
          }
          store.closeTabsInWorkspace(oldPath)
          store.setWorkspace(selected)
        }
      } else {
        store.setWorkspace(selected)
      }
    }
  }

  return { openFile, saveFile, saveFileAs, newFile, openFolder, closeActiveTab, exportPdf }
}

async function openFolderInNewWindow(folderPath: string) {
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const folderName = folderPath.split(/[\\/]/).pop() ?? 'Folder'
  new WebviewWindow(`folder-${Date.now()}`, {
    title: `${folderName} - MarkdownView`,
    url: `index.html?workspace=${encodeURIComponent(folderPath)}`,
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
  })
}

export { openFolderInNewWindow }

/** 另存为时把正文引用的本地相对路径图片复制到新位置（保持相同子路径） */
async function copyReferencedImages(content: string, oldMdPath: string, newMdPath: string): Promise<void> {
  const oldDir = dirname(oldMdPath)
  const newDir = dirname(newMdPath)
  if (!oldDir || oldDir === newDir) return
  try {
    const { exists, mkdir, copyFile } = await import('@tauri-apps/plugin-fs')
    for (const raw of extractImageSrcs(content)) {
      if (isDiskAbsolutePath(raw) || isWebUrl(raw)) continue // 绝对路径/远程引用原地有效
      let rel = raw
      try {
        rel = decodeURIComponent(raw)
      } catch {
        // 含未转义 %，保留原样
      }
      const from = joinPath(oldDir, rel)
      const to = joinPath(newDir, rel)
      try {
        if (!(await exists(from))) continue
        await mkdir(dirname(to), { recursive: true })
        await copyFile(from, to)
      } catch {
        // 单张复制失败不阻断保存
      }
    }
  } catch {
    // plugin-fs 不可用时静默跳过
  }
}
