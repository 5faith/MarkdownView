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
  listItemSchema,
  orderedListSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInHeadingCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark'
import { insertTableCommand, toggleStrikethroughCommand, footnoteDefinitionSchema, footnoteReferenceSchema } from '@milkdown/kit/preset/gfm'
import { redoCommand, undoCommand } from '@milkdown/kit/plugin/history'
import { detailsContentSchema, detailsSchema, detailsSummarySchema } from './milkdown/details'
import { alertSchema } from './milkdown/alert'
import {
  definitionDescriptionSchema,
  definitionListSchema,
  definitionTermSchema,
} from './milkdown/definitionList'
import { emojiSchema } from './milkdown/emoji'
import { mermaidSchema } from './milkdown/mermaid'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { saveImageFile } from '../utils/imageStore'
import { basename, dirname, encodeMdPath, joinPath, sanitizeImageDir } from '../utils/localImage'

export type FormatKind =
  | 'undo' | 'redo'
  | 'h1' | 'h2' | 'h3'
  | 'bold' | 'italic' | 'strike' | 'code'
  | 'quote' | 'ul' | 'ol' | 'task' | 'table' | 'codeblock' | 'hr' | 'details'
  | 'footnote' | 'deflist' | 'emoji' | 'alert' | 'mermaid'
  | 'link' | 'image'

/** link 需要 href；emoji 需要短代码名；alert 需要类型；mermaid 需要图表源码；image 无额外参数（自己弹文件选择框） */
export interface FormatPayload {
  href?: string
  emojiName?: string
  alertType?: string
  mermaidCode?: string
}

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

/** 无序/有序列表互转：整棵列表子树统一类型（list 节点类型 + 每个 item 的 listType attr）。
 *  只改 list 节点类型会被 syncListOrderPlugin（MILKDOWN_KEEP_LIST_ORDER）按子项 listType 改回原类型。 */
function convertOrWrapList(kind: 'ul' | 'ol'): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const $from = view.state.selection.$from
    const bulletT = bulletListSchema.type(ctx)
    const orderedT = orderedListSchema.type(ctx)
    const itemType = listItemSchema.type(ctx)
    const targetType = kind === 'ul' ? bulletT : orderedT
    const targetListType = kind === 'ol' ? 'ordered' : 'bullet'

    let listPos: number | null = null
    for (let d = $from.depth; d >= 0; d--) {
      const n = $from.node(d)
      if (n.type === bulletT || n.type === orderedT) {
        listPos = $from.before(d)
        break
      }
    }
    if (listPos == null) {
      // 不在列表内：直接包裹
      callCommand(kind === 'ul' ? wrapInBulletListCommand.key : wrapInOrderedListCommand.key)(ctx)
      return
    }

    const listNode = view.state.doc.nodeAt(listPos)
    if (!listNode) return

    const tr = view.state.tr
    // 先收集子树内所有 list/item 节点（setNodeMarkup 不改尺寸，位置先算安全）
    listNode.descendants((child, offset) => {
      if (child.type === bulletT || child.type === orderedT) {
        tr.setNodeMarkup(listPos + 1 + offset, targetType)
      } else if (child.type === itemType) {
        if (child.attrs.listType !== targetListType || child.attrs.checked != null) {
          tr.setNodeMarkup(listPos + 1 + offset, undefined, {
            ...child.attrs,
            listType: targetListType,
            checked: null,
          })
        }
      }
    })
    tr.setNodeMarkup(listPos, targetType)
    view.dispatch(tr)
  })
}

/** 插入 `<details>` 折叠块（GitHub 语法），占位摘要处于选中态，直接输入即可覆盖 */
function insertDetails(): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { schema } = view.state
    const paragraph = schema.nodes.paragraph
    if (!paragraph) return
    const summaryType = detailsSummarySchema.type(ctx)
    const title = '摘要'
    const node = detailsSchema.type(ctx).create({ open: true }, [
      summaryType.create(null, schema.text(title)),
      detailsContentSchema.type(ctx).create(null, [paragraph.create(null, schema.text('正文'))]),
    ])
    const tr = view.state.tr.replaceSelectionWith(node)
    // 摘要文本位置按插入后的文档实测，别用 from+偏移算（会落在外层 details 节点上）
    let summaryStart = -1
    tr.doc.descendants((n, pos) => {
      if (summaryStart < 0 && n.type === summaryType) summaryStart = pos + 1
      return summaryStart < 0
    })
    if (summaryStart >= 0) {
      tr.setSelection(TextSelection.create(tr.doc, summaryStart, summaryStart + title.length))
    }
    view.dispatch(tr.scrollIntoView())
  })
}

/** 插入脚注：正文里放引用节点，文末补定义（编号自动取现有最大 + 1） */
function insertFootnote(): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { schema } = view.state
    const refType = footnoteReferenceSchema.type(ctx)
    const defType = footnoteDefinitionSchema.type(ctx)
    const paragraph = schema.nodes.paragraph
    if (!refType || !defType || !paragraph) return

    let next = 1
    view.state.doc.descendants((node) => {
      if (node.type.name !== 'footnote_definition' && node.type.name !== 'footnote_reference') return
      const matched = /(\d+)/.exec(String(node.attrs.label ?? ''))
      if (matched) next = Math.max(next, Number(matched[1]) + 1)
    })
    const label = String(next)
    const tr = view.state.tr.replaceSelectionWith(refType.create({ label }))
    tr.insert(
      tr.doc.content.size,
      defType.create({ label }, [paragraph.create(null, schema.text('脚注内容。'))]),
    )
    view.dispatch(tr.scrollIntoView())
  })
}

/** 插入告警块（GitHub Alerts），默认带一句占位正文 */
function insertAlert(alertType: string): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { schema } = view.state
    const paragraph = schema.nodes.paragraph
    if (!paragraph) return
    const node = alertSchema.type(ctx).create({ type: alertType }, [
      paragraph.create(null, schema.text('补充信息。')),
    ])
    view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView())
  })
}

/** 插入定义列表：术语行 + 一条释义，光标落在术语上 */
function insertDefinitionList(): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { schema } = view.state
    const paragraph = schema.nodes.paragraph
    if (!paragraph) return
    const term = '术语'
    const node = definitionListSchema.type(ctx).create(null, [
      definitionTermSchema.type(ctx).create(null, schema.text(term)),
      definitionDescriptionSchema.type(ctx).create(null, [paragraph.create(null, schema.text('释义'))]),
    ])
    const tr = view.state.tr.replaceSelectionWith(node)
    let termStart = -1
    tr.doc.descendants((n, pos) => {
      if (termStart < 0 && n.type.name === 'definition_term') termStart = pos + 1
      return termStart < 0
    })
    if (termStart >= 0) {
      tr.setSelection(TextSelection.create(tr.doc, termStart, termStart + term.length))
    }
    view.dispatch(tr.scrollIntoView())
  })
}

/** 插入表情（行内原子节点；源文件回写 `:name:`） */
function insertEmoji(name: string): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const type = emojiSchema.type(ctx)
    if (!type) return
    view.dispatch(view.state.tr.replaceSelectionWith(type.create({ name })).scrollIntoView())
  })
}

/** 插入 Mermaid 图表（```mermaid 围栏，编辑区渲染成图） */
function insertMermaid(code: string): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const { schema } = view.state
    const type = mermaidSchema.type(ctx)
    if (!type) return
    const node = type.create(null, code ? schema.text(code) : null)
    view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView())
  })
}

/** 编辑器重新聚焦，让菜单操作期间选区保持可见 */
export function focusEditor(): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return
  crepe.editor.action((ctx) => {
    ctx.get(editorViewCtx).focus()
  })
}

/** 工具栏「插入图片」：选图 → 复制进图片目录 → 插入图片块（源码模式插 markdown 文本）。
 *  所选图片已在图片目录里时直接引用，不产生重复副本；文件未保存过盘时引用绝对路径。 */
async function insertImageFromPicker(): Promise<void> {
  const store = useMarkdownStore()
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({
    multiple: false,
    title: '插入图片',
    filters: [
      { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  })
  if (typeof selected !== 'string') return

  const mdPath = store.activeFile?.path
  let src: string
  const alt = basename(selected).replace(/\.[^.]+$/, '').replace(/[[\]]/g, '')
  if (!mdPath) {
    // 未保存的文件没有落盘位置：引用绝对路径（asset 协议能显示）
    src = encodeMdPath(selected.replace(/\\/g, '/'))
  } else {
    const dirName = sanitizeImageDir(store.imageDir)
    const imgDir = joinPath(dirname(mdPath), dirName)
    if (dirname(selected) === imgDir) {
      src = encodeMdPath(`${dirName}/${basename(selected)}`)
    } else {
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const bytes = await readFile(selected)
      const file = new File([bytes], basename(selected))
      src = await saveImageFile(file, mdPath, store.imageDir)
    }
  }

  if (store.sourceMode || !currentEditor.value) {
    const api = sourceEditorApi.value
    if (!api) return
    const { start, end } = api.getSelection()
    api.replaceRange(start, end, `![${alt}](${src})`, start, start)
    return
  }

  const crepe = currentEditor.value
  if (crepe.readonly) return
  crepe.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx)
    const nodeType = view.state.schema.nodes['image-block']
    if (!nodeType) return
    // alt 由 ratio 序列化而来（image-block 约定），caption → title
    const node = nodeType.create({ src, caption: '', ratio: 1 })
    view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView())
  })
  focusEditor()
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

function applySourceFormat(kind: FormatKind, payload?: FormatPayload): void {
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

  // 链接：带 href 时包 [文本](href)，空选区用占位文本
  if (kind === 'link') {
    const href = (payload?.href ?? '').trim()
    if (!href) return
    const sel = content.slice(start, end) || '链接文本'
    const mid = `[${sel}](${href})`
    api.replaceRange(start, end, mid, start + 1, start + 1 + sel.length)
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
  if (kind === 'details') {
    const mid = '\n<details>\n<summary>摘要</summary>\n\n正文\n\n</details>\n'
    api.replaceRange(start, end, mid, start + 20, start + 22)
    return
  }
  if (kind === 'footnote') {
    const mid = '[^1]'
    api.replaceRange(start, end, mid, start + mid.length, start + mid.length)
    return
  }
  if (kind === 'deflist') {
    const mid = '\n术语\n: 释义\n'
    api.replaceRange(start, end, mid, start + 2, start + 4)
    return
  }
  if (kind === 'emoji') {
    const mid = payload?.emojiName ? `:${payload.emojiName}:` : ':smile:'
    api.replaceRange(start, end, mid, start + mid.length, start + mid.length)
    return
  }
  if (kind === 'alert') {
    const type = (payload?.alertType ?? 'note').toUpperCase()
    const mid = `\n> [!${type}]\n> 补充信息。\n`
    api.replaceRange(start, end, mid, start + 15, start + 21)
    return
  }
  if (kind === 'mermaid') {
    const code = payload?.mermaidCode ?? 'flowchart TD\n    A[开始] --> B[结束]'
    const mid = `\n\`\`\`mermaid\n${code}\n\`\`\`\n`
    api.replaceRange(start, end, mid, start + mid.length, start + mid.length)
    return
  }
}

/* ─────────────────────────── 统一入口 ─────────────────────────── */

export function runFormat(kind: FormatKind, payload?: FormatPayload): void {
  const store = useMarkdownStore()

  // 插入图片：异步流程（弹文件框），源码/所见即所得由流程内部判定
  if (kind === 'image') {
    void insertImageFromPicker()
    return
  }

  // 源码模式：对 markdown 文本直接操作
  if (store.sourceMode) {
    applySourceFormat(kind, payload)
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
    case 'link': {
      const href = (payload?.href ?? '').trim()
      if (!href) break
      withSelection(crepe, () => {
        // 空选区时 toggleMark 只写 stored mark（屏幕上无任何变化），改为插入带链接的占位文本
        crepe.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx)
          if (view.state.selection.empty) {
            const linkType = view.state.schema.marks.link
            if (!linkType) return
            const text = view.state.schema.text('链接文本', [linkType.create({ href })])
            // inheritMarks=false：保留节点自带的 link mark（默认 true 会丢 mark）
            view.dispatch(view.state.tr.replaceSelectionWith(text, false).scrollIntoView())
          } else {
            act(crepe, toggleLinkCommand.key, { href })
          }
        })
      })
      break
    }
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
    case 'details':
      insertDetails()
      break
    case 'footnote':
      insertFootnote()
      break
    case 'deflist':
      insertDefinitionList()
      break
    case 'emoji':
      insertEmoji(payload?.emojiName ?? 'smile')
      break
    case 'alert':
      insertAlert(payload?.alertType ?? 'note')
      break
    case 'mermaid':
      insertMermaid(payload?.mermaidCode ?? '')
      break
  }

  // 命令后重新聚焦，保持选区可见
  focusEditor()
}
