import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

/**
 * Crepe 代码块语法高亮按应用明暗主题着色。
 * Crepe 默认用 CM 亮色 token（深紫/深绿/黑），暗底上几乎不可见。
 * 主题实例随 MilkdownEditor 重建（App 的 :key 含 store.theme）而切换。
 */

const lightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#7c3aed' },
  { tag: [t.atom, t.bool, t.url, t.contentSeparator, t.labelName], color: '#1d4ed8' },
  { tag: [t.literal, t.inserted], color: '#15803d' },
  { tag: [t.string, t.deleted], color: '#b91c1c' },
  { tag: [t.regexp, t.escape, t.special(t.string)], color: '#c2410c' },
  { tag: t.definition(t.variableName), color: '#1d4ed8' },
  { tag: t.local(t.variableName), color: '#7c3aed' },
  { tag: [t.typeName, t.namespace], color: '#0f766e' },
  { tag: t.className, color: '#1e40af' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#b45309' },
  { tag: t.propertyName, color: '#374151' },
  { tag: t.variableName, color: '#1f2937' },
  { tag: t.comment, color: '#8b9199' },
  { tag: t.meta, color: '#5b6470' },
  { tag: t.heading, fontWeight: 'bold', color: '#273849' },
  { tag: t.link, color: '#3b82f6', textDecoration: 'underline' },
  { tag: t.invalid, color: '#dc2626' },
])

const darkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#c678dd' },
  { tag: [t.atom, t.bool, t.url, t.contentSeparator, t.labelName], color: '#56b6c2' },
  { tag: [t.literal, t.inserted], color: '#98c379' },
  { tag: [t.string, t.deleted], color: '#e06c75' },
  { tag: [t.regexp, t.escape, t.special(t.string)], color: '#d19a66' },
  { tag: t.definition(t.variableName), color: '#61afef' },
  { tag: t.local(t.variableName), color: '#61afef' },
  { tag: [t.typeName, t.namespace], color: '#e5c07b' },
  { tag: t.className, color: '#e5c07b' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#61afef' },
  { tag: t.propertyName, color: '#d19a66' },
  { tag: t.variableName, color: '#d6d6d6' },
  { tag: t.comment, color: '#8b93a1' },
  { tag: t.meta, color: '#abb2bf' },
  { tag: t.heading, fontWeight: 'bold', color: '#61afef' },
  { tag: t.link, color: '#61afef', textDecoration: 'underline' },
  { tag: t.invalid, color: '#f44747' },
])

const lightTheme: Extension = [
  EditorView.theme({
    '&': { color: '#2e2e2e' },
    '.cm-gutters': { color: '#8b9199' },
  }),
  syntaxHighlighting(lightHighlight),
]

const darkTheme: Extension = [
  EditorView.theme({
    '&': { color: '#d6d6d6' },
    '.cm-gutters': { color: '#8b93a1' },
  }),
  syntaxHighlighting(darkHighlight),
]

export function cmThemeExtension(theme: 'light' | 'dark'): Extension {
  return theme === 'dark' ? darkTheme : lightTheme
}
