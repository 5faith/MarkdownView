import { shallowRef } from 'vue'
import type { Crepe } from '@milkdown/crepe'
import type { CmdKey } from '@milkdown/kit/core'
import { editorViewCtx } from '@milkdown/kit/core'
import { callCommand } from '@milkdown/kit/utils'
import {
  createCodeBlockCommand,
  insertHrCommand,
  listItemSchema,
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

export type FormatKind =
  | 'undo' | 'redo'
  | 'h1' | 'h2' | 'h3'
  | 'bold' | 'italic' | 'strike' | 'code'
  | 'quote' | 'ul' | 'ol' | 'task' | 'table' | 'codeblock' | 'hr'

/** 当前 Milkdown Crepe 实例单例（工具栏/菜单/PDF 导出共用）。
 *  必须用 shallowRef：Vue 深代理会让带 #private 字段的 class getter 报 "Cannot read from private field"。 */
export const currentEditor = shallowRef<Crepe | null>(null)

/** 任务列表（勾选框）：gfm 给 list_item 扩展了可空 checked attr，无现成命令，手动切事务。
 *  行为：非任务列表 → 全部置为未勾选；已是任务列表 → 还原为普通列表。 */
function toggleTaskList(): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  crepe.editor.action((ctx) => {
    const itemType = listItemSchema.type(ctx)
    // 不在列表内时先包成无序列表
    callCommand(wrapInBulletListCommand.key)(ctx)

    const view = ctx.get(editorViewCtx)
    const { state } = view
    const { from, to } = state.selection

    // 只收集最外层列表项（parent 也是 list_item 的嵌套项跳过）
    const items: Array<{ pos: number; attrs: { checked?: boolean | null } }> = []
    state.doc.nodesBetween(from, to, (node, pos, parent) => {
      if (node.type === itemType && parent?.type !== itemType) {
        items.push({ pos, attrs: node.attrs })
      }
      return true
    })
    if (items.length === 0) return

    const allTask = items.every((it) => it.attrs.checked != null)
    const target: boolean | null = allTask ? null : false

    const tr = state.tr
    for (const it of items) {
      tr.setNodeMarkup(it.pos, undefined, { ...it.attrs, checked: target })
    }
    view.dispatch(tr)
  })
}

export function runFormat(kind: FormatKind): void {
  const crepe = currentEditor.value
  if (!crepe || crepe.readonly) return

  const act = <T,>(key: CmdKey<T>, payload?: T) =>
    crepe.editor.action(callCommand(key, payload))

  switch (kind) {
    case 'undo':
      act(undoCommand.key)
      break
    case 'redo':
      act(redoCommand.key)
      break
    case 'h1':
      act(wrapInHeadingCommand.key, 1)
      break
    case 'h2':
      act(wrapInHeadingCommand.key, 2)
      break
    case 'h3':
      act(wrapInHeadingCommand.key, 3)
      break
    case 'bold':
      act(toggleStrongCommand.key)
      break
    case 'italic':
      act(toggleEmphasisCommand.key)
      break
    case 'strike':
      act(toggleStrikethroughCommand.key)
      break
    case 'code':
      act(toggleInlineCodeCommand.key)
      break
    case 'quote':
      act(wrapInBlockquoteCommand.key)
      break
    case 'ul':
      act(wrapInBulletListCommand.key)
      break
    case 'ol':
      act(wrapInOrderedListCommand.key)
      break
    case 'task':
      toggleTaskList()
      break
    case 'table':
      act(insertTableCommand.key)
      break
    case 'codeblock':
      act(createCodeBlockCommand.key)
      break
    case 'hr':
      act(insertHrCommand.key)
      break
  }
}
