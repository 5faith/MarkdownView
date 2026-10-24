/**
 * 本地图片路径解析与显示 URL 转换。
 *
 * WebView 的源是 http://tauri.localhost，markdown 里的相对/绝对磁盘路径
 * 浏览器按虚拟站点解析不了，必须经 Tauri asset 协议（convertFileSrc）
 * 转成 asset.localhost URL 才能显示；markdown 文本里始终保留原始相对路径，
 * 保证 md 与图片目录一起移动后引用仍然有效。
 */
import { convertFileSrc } from '@tauri-apps/api/core'

/** 远程或内联 URL：http(s) / data: / blob: 开头，不经磁盘解析 */
export function isWebUrl(url: string): boolean {
  return /^(https?:|data:|blob:)/i.test(url.trim())
}

/** 磁盘绝对路径：C:\...、C:/...、\\server、/unix */
export function isDiskAbsolutePath(p: string): boolean {
  return /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(p)
}

/** 拼接路径（分隔符跟随首参，磁盘操作与 markdown 共用） */
export function joinPath(dir: string, name: string): string {
  if (!dir) return name
  const sep = dir.includes('\\') ? '\\' : '/'
  return dir.replace(/[\\/]+$/, '') + sep + name.replace(/^[\\/]+/, '')
}

export function dirname(p: string): string {
  const idx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
  return idx === -1 ? '' : p.slice(0, idx)
}

export function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
  return idx === -1 ? p : p.slice(idx + 1)
}

/** 规范化设置里的图片目录：只允许相对路径，去掉盘符/..，空值回退 assets */
export function sanitizeImageDir(dir: string): string {
  const cleaned = (dir ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^[a-zA-Z]:/, '')
    .replace(/\.{2,}/g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '')
  return cleaned || 'assets'
}

/** markdown src 里的空格/括号/% 会让解析断开，写盘时转义 */
export function encodeMdPath(p: string): string {
  return p.replace(/[%() ]/g, (c) =>
    c === '%' ? '%25' : c === '(' ? '%28' : c === ')' ? '%29' : '%20',
  )
}

/** markdown 图片 src → 磁盘绝对路径；非本地路径或没有 md 文件时返回 null */
export function resolveLocalImagePath(src: string, mdPath: string | null): string | null {
  if (!src || isWebUrl(src) || !mdPath) return null
  const clean = src.trim().replace(/^<|>$/g, '')
  if (!clean || clean.startsWith('#')) return null
  let decoded = clean
  try {
    decoded = decodeURIComponent(clean)
  } catch {
    // 含未转义 %，保留原样
  }
  if (isDiskAbsolutePath(decoded)) return decoded
  const mdDir = dirname(mdPath)
  if (!mdDir) return null
  return joinPath(mdDir, decoded)
}

/** 显示用 URL：本地路径 → asset 协议 URL；远程/内联/解析失败原样返回 */
export function toDisplayUrl(src: string, mdPath: string | null): string {
  if (!src || isWebUrl(src)) return src
  const abs = resolveLocalImagePath(src, mdPath)
  if (!abs) return src
  // convertFileSrc 只做字符串转换（读注入的 __TAURI_INTERNALS__），调用时才需要 Tauri 环境
  return convertFileSrc(abs)
}

/** 提取 markdown 正文里所有图片 src（去重，含远程） */
const IMAGE_RE = /!\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+"[^"]*")?\s*\)/g

export function extractImageSrcs(markdown: string): string[] {
  const out: string[] = []
  for (const m of markdown.matchAll(IMAGE_RE)) {
    let src = m[1] ?? ''
    if (src.startsWith('<') && src.endsWith('>')) src = src.slice(1, -1)
    if (src && !out.includes(src)) out.push(src)
  }
  return out
}
