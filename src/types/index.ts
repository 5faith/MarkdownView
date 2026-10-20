export type AppTheme = 'light' | 'dark'

export interface Preferences {
  theme: AppTheme
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
