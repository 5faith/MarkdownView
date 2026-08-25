export type AppTheme = 'light' | 'dark'
export type EditorMode = 'ir' | 'sv' | 'wysiwyg'

export interface Preferences {
  theme: AppTheme
  contentTheme: string
  codeTheme: string
  editorMode: EditorMode
  showOutline: boolean
  showFileTree: boolean
  outlineWidth: number
  fileTreeWidth: number
  workspacePath: string
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  contentTheme: 'light',
  codeTheme: 'github',
  editorMode: 'ir',
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
