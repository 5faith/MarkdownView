import { useMarkdownStore } from '../stores/useMarkdownStore'
import { openExternal } from './openExternal'
import { dirname, isDiskAbsolutePath, isWebUrl, joinPath } from '../utils/localImage'

/**
 * Ctrl+点击正文链接：http(s)/mailto/tel 交给系统浏览器；
 * 相对路径按当前 md 所在目录解析、绝对路径直接用，在新标签页打开。
 */
export async function openMarkdownLink(href: string, mdPath: string | null): Promise<void> {
  const raw = href.trim().replace(/^<|>$/g, '')
  if (!raw) return

  if (/^(https?:|mailto:|tel:)/i.test(raw)) {
    await openExternal(raw)
    return
  }
  if (isWebUrl(raw)) return // data:/blob: 无法外部打开

  // 去掉 #锚点 与 ?查询，再解码（%20 等）
  const clean = raw.split('#')[0]!.split('?')[0]!
  let path = clean
  try {
    path = decodeURIComponent(clean)
  } catch {
    // 含未转义 %，保留原样
  }
  if (!path) return

  if (!isDiskAbsolutePath(path)) {
    const dir = mdPath ? dirname(mdPath) : ''
    if (!dir) return // 文件未存盘，无从解析相对路径
    path = joinPath(dir, path)
  }

  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const content = await readTextFile(path)
    useMarkdownStore().setCurrentFile({
      id: '',
      path,
      content,
      name: path.split(/[/\\]/).pop() ?? 'Untitled',
      saved: true,
    })
  } catch {
    // 目标不存在或不可读：静默
  }
}
