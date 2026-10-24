export type AppTheme = 'light' | 'dark'

/** 字体偏好：'' 系统默认（正文系统界面栈、代码等宽栈），'mono' 全等宽，其它为本地字体族名 */
export type AppFont = string

export interface Preferences {
  theme: AppTheme
  font: AppFont
  fontSize: number
  sourceMode: boolean
  typewriter: boolean
  showOutline: boolean
  showFileTree: boolean
  outlineWidth: number
  fileTreeWidth: number
  /** 文件树搜索：输入防抖（输入停顿后触发搜索的等待） */
  searchDebounceMs: number
  /** 文件树搜索：两次搜索请求的最小间隔 */
  searchIntervalMs: number
  workspacePath: string
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  font: '',
  fontSize: 14,
  sourceMode: false,
  typewriter: false,
  showOutline: true,
  showFileTree: false,
  outlineWidth: 220,
  fileTreeWidth: 240,
  searchDebounceMs: 300,
  searchIntervalMs: 800,
  workspacePath: '',
}

export interface MarkdownFile {
  id: string
  path: string
  content: string
  name: string
  saved: boolean
}

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
}

export interface CaretPosition {
  line: number
  col: number
}
