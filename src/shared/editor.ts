import { shallowRef } from 'vue'
import type { Crepe } from '@milkdown/crepe'
import type { CmdKey } from '@milkdown/kit/core'
import { editorViewCtx } from '@milkdown/kit/core'
import { TextSelection } from '@milkdown/kit/prose/state'
import { callCommand } from '@milkdown/kit/utils'
import {
  bulletListSchema,
  createCodeBlockCommand,
  insertHrCommand,
  orderedListSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark'
import { insertTableCommand, toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm'
import { redoCommand, undoCommand } from '@milkdown/kit/plugin/history'
import { useMarkdownStore } from '../stores/useMarkdownStore'

export type FormatKind =
  | 'undo' | 'redo'
  | 'h1' | 'h2' | 'h3'
  | 'bold' | 'italic' | 'strike' | 'code'
  | 'quote' | 'ul' | 'ol' | 'task' | 'table' | 'codeblock' | 'hr'

/** 当前 Milkdown Crepe 实例单例（工具栏/菜单/PDF 导出共用）。
 *  必须用 shallowRef：Vue 深代理会让带 #private 字段的 class getter 报 "Cannot read from private field"。 */
export const currentEditor = shallowRef<Crepe | null>(null)

/** 源码模式编辑器 API（SourceEditor 挂载时注册），供格式命令操作 textarea 选区 */
export interface SourceEditorApi {
  getSelection(): { start: number; end: number }
  /** 替换 [start,end) 区间文本；走 execCommand 保留原生撤销栈，失败时回退直接赋值 */
  replaceRange(start: number, end: number, text: string, selStart: number, selEnd: number): void
  execUndoRedo(kind: 'undo' | 'redo'): void
}
export const sourceEditorApi = shallowRef<SourceEditorApi | null>(null)

/* ─────────────────────────── WYSIWYG 命令 ─────────────────────────── */

const act = <T,>(crepe: Crepe, key: CmdKey<T>, payload?: T) =>
  crepe.editor.action(callCommand(key, payload))

/** 选区保持：标记类命令后选区若塌缩则还原，使 加粗→斜体 连续作用于同一段文本 */
function withSelection(crepe: Crepe, fn: () => void): void {
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const before = view.state.selection
    const wasRange = before.from !== before.to
    fn()
    const after = view.state.selection
    if (wasRange && after.from === after.to) {
      const doc = view.state.doc
      const s = doc.resolve(Math.min(before.from, doc.content.size))
      const e = doc.resolve(Math.min(before.to, doc.content.size))
      view.dispatch(view.state.tr.setSelection(TextSelection.between(s, e)).scrollIntoView())
    }
  })
}

/** 找光标所在最外层列表节点（bullet/ordered） */
function findList(crepe: Crepe): { pos: number; node: import('@milkdown/kit/prose/model').Node; isOrdered: boolean } | null {
  let result: { pos: number; node: import('@milkdown/kit/prose/model').Node; isOrdered: boolean } | null = null
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const $from = view.state.selection.$from
    const bulletT = bulletListSchema.type(ctx)
    const orderedT = orderedListSchema.type(ctx)
    for (let d = $from.depth; d >= 0; d--) {
      const n = $from.node(d)
      if (n.type === bulletT || n.type === orderedT) {
        result = { pos: $from.before(d), node: n, isOrdered: n.type === orderedT }
        return
      }
    }
  })
  return result
}

/** 切换直接子项的 checked；返回是否发生过变更 */
function setItemsChecked(crepe: Crepe, listPos: number, listNode: import('@milkdown/kit/prose/model').Node, target: boolean | null): boolean {
  let changed = false
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const tr = view.state.tr
    listNode.forEach((item, offset) => {
      if (item.attrs.checked !== target) {
        tr.setNodeMarkup(listPos + 1 + offset, undefined, { ...item.attrs, checked: target })
        changed = true
      }
    })
    if (changed) view.dispatch(tr)
  })
  return changed
}

/** 任务列表：非任务→未勾选；已是任务→还原普通列表 */
function toggleTaskList(): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  const info = findList(crepe)
  if (!info) {
    // 不在列表内：包无序列表后再置为未勾选任务
    act(crepe, wrapInBulletListCommand.key)
    const fresh = findList(crepe)
    if (fresh) setItemsChecked(crepe, fresh.pos, fresh.node, false)
    return
  }
  const allTask = (() => {
    let all = true
    info.node.forEach((it) => {
      if (it.attrs.checked == null) all = false
    })
    return all
  })()
  setItemsChecked(crepe, info.pos, info.node, allTask ? null : false)
}

/** 无序/有序/任务列表互相替换：不同类型直接改列表节点类型（保留嵌套），任务标记先清除 */
function convertOrWrapList(kind: 'ul' | 'ol'): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  const info = findList(crepe)
  if (!info) {
    act(crepe, kind === 'ul' ? wrapInBulletListCommand.key : wrapInOrderedListCommand.key)
    return
  }

  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const targetType = kind === 'ul' ? bulletListSchema.type(ctx) : orderedListSchema.type(ctx)
    const tr = view.state.tr
    let changed = false

    // 先清任务标记
    info.node.forEach((item, offset) => {
      if (item.attrs.checked != null) {
        tr.setNodeMarkup(info.pos + 1 + offset, undefined, { ...item.attrs, checked: null })
        changed = true
      }
    })
    // 类型不同 → 替换列表节点类型
    if ((kind === 'ol') !== info.isOrdered) {
      tr.setNodeMarkup(info.pos, targetType)
      changed = true
    }
    if (changed) view.dispatch(tr)
  })
}

/* ─────────────────────────── 源码模式文本操作 ─────────────────────────── */

const INLINE_MARKS: Partial<Record<FormatKind, { m: string; ph: string }>> = {
  bold: { m: '**', ph: '加粗文本' },
  italic: { m: '*', ph: '斜体文本' },
  strike: { m: '~~', ph: '删除线文本' },
  code: { m: '`', ph: '行内代码' },
}

const BLOCK_PREFIX: Partial<Record<FormatKind, string>> = {
  h1: '# ',
  h2: '## ',
  h3: '### ',
  quote: '> ',
  ul: '- ',
  ol: '1. ',
  task: '- [ ] ',
}

/** 行首已有语法前缀（标题/引用/列表/任务） */
const LINE_PREFIX_RE = /^[ \t]*(#{1,6}[ \t]+|>[ \t]?|[-*+][ \t]+\[[ xX]\][ \t]+|[-*+][ \t]+|\d+\.[ \t]+)/

function lineBounds(content: string, start: number, end: number): { ls: number; le: number } {
  const ls = content.lastIndexOf('\n', start - 1) + 1
  let le = content.indexOf('\n', end)
  if (le === -1) le = content.length
  return { ls, le }
}

function applySourceFormat(kind: FormatKind): void {
  const store = useMarkdownStore()
  const api = sourceEditorApi.value
  if (!api) return
  const content = store.content
  const { start, end } = api.getSelection()

  // 行内标记：toggle 包裹
  const inline = INLINE_MARKS[kind]
  if (inline) {
    const m = inline.m
    const before = content.slice(start - m.length, start)
    const after = content.slice(end, end + m.length)
    if (before === m && after === m && start !== end) {
      // 已包裹 → 解除
      api.replaceRange(start - m.length, end + m.length, content.slice(start, end), start - m.length, end - m.length)
      return
    }
    const sel = content.slice(start, end) || inline.ph
    const mid = m + sel + m
    api.replaceRange(start, end, mid, start + m.length, start + m.length + sel.length)
    return
  }

  // 撤销/重做：textarea 原生栈
  if (kind === 'undo' || kind === 'redo') {
    api.execUndoRedo(kind)
    return
  }

  // 行级前缀（标题/引用/三种列表）：strip 旧前缀 + 加新前缀，全部行已是目标前缀 → 移除（toggle）
  const prefix = BLOCK_PREFIX[kind]
  if (prefix) {
    const { ls, le } = lineBounds(content, start, end)
    const lines = content.slice(ls, le).split('\n')
    const stripped = lines.map((l) => l.replace(LINE_PREFIX_RE, ''))
    const allHave = kind === 'ol'
      ? lines.every((l) => /^[ \t]*\d+\.[ \t]+/.test(l))
      : lines.every((l) => l.startsWith(prefix))
    const next = allHave ? stripped : stripped.map((l) => prefix + l)
    api.replaceRange(ls, le, next.join('\n'), ls, ls + next.join('\n').length)
    return
  }

  // 块插入
  if (kind === 'hr') {
    api.replaceRange(start, end, '\n---\n', start + 1, start + 4)
    return
  }
  if (kind === 'codeblock') {
    const body = content.slice(start, end) || '代码块'
    const mid = `\n\`\`\`\n${body}\n\`\`\`\n`
    api.replaceRange(start, end, mid, start + 6, start + 6 + body.length)
    return
  }
  if (kind === 'table') {
    const mid = '| 列1 | 列2 |\n| --- | --- |\n|  |  |\n'
    api.replaceRange(start, end, mid, start + 2, start + 6)
    return
  }
}

/* ─────────────────────────── 统一入口 ─────────────────────────── */

export function runFormat(kind: FormatKind): void {
  const store = useMarkdownStore()

  // 源码模式：对 markdown 文本直接操作
  if (store.sourceMode) {
    applySourceFormat(kind)
    return
  }

  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  switch (kind) {
    case 'undo':
      act(crepe, undoCommand.key)
      break
    case 'redo':
      act(crepe, redoCommand.key)
      break
    case 'h1':
      withSelection(crepe, () => act(crepe, wrapInHeadingCommand.key, 1))
      break
    case 'h2':
      withSelection(crepe, () => act(crepe, wrapInHeadingCommand.key, 2))
      break
    case 'h3':
      withSelection(crepe, () => act(crepe, wrapInHeadingCommand.key, 3))
      break
    case 'bold':
      withSelection(crepe, () => act(crepe, toggleStrongCommand.key))
      break
    case 'italic':
      withSelection(crepe, () => act(crepe, toggleEmphasisCommand.key))
      break
    case 'strike':
      withSelection(crepe, () => act(crepe, toggleStrikethroughCommand.key))
      break
    case 'code':
      withSelection(crepe, () => act(crepe, toggleInlineCodeCommand.key))
      break
    case 'quote':
      withSelection(crepe, () => act(crepe, wrapInBlockquoteCommand.key))
      break
    case 'ul':
      convertOrWrapList('ul')
      break
    case 'ol':
      convertOrWrapList('ol')
      break
    case 'task':
      toggleTaskList()
      break
    case 'table':
      withSelection(crepe, () => act(crepe, insertTableCommand.key))
      break
    case 'codeblock':
      withSelection(crepe, () => act(crepe, createCodeBlockCommand.key))
      break
    case 'hr':
      withSelection(crepe, () => act(crepe, insertHrCommand.key))
      break
  }
}
