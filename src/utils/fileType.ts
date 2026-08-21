export function isMarkdownFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return ['md', 'markdown', 'txt', 'mdown', 'mkd'].includes(ext)
}

type LanguageKey = 'javascript' | 'html' | 'css' | 'json' | 'python' | 'rust' | 'xml' | 'markdown'

const extensionMap: Record<string, LanguageKey> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'javascript',
  tsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  less: 'css',
  json: 'json',
  jsonc: 'json',
  py: 'python',
  pyw: 'python',
  rs: 'rust',
  xml: 'xml',
  svg: 'xml',
  md: 'markdown',
  markdown: 'markdown',
  mdown: 'markdown',
  mkd: 'markdown',
}

export function getLanguageFromExtension(name: string): LanguageKey | undefined {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return extensionMap[ext]
}
