export type Theme = 'light' | 'dark'

export interface MarkdownFile {
  id: string
  path: string
  content: string
  name: string
  saved: boolean
}
