export type AppTheme = 'light' | 'dark'

/** 界面字体方案：内置 Maple / 系统界面字体 / 系统等宽 */
export type AppFont = 'maple' | 'system' | 'mono'

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
  workspacePath: string
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  font: 'maple',
  fontSize: 14,
  sourceMode: false,
  typewriter: false,
  showOutline: true,
  showFileTree: false,
  outlineWidth: 220,
  fileTreeWidth: 240,
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
