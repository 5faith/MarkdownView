import { $node } from '@milkdown/kit/utils'

/**
 * 原始 HTML 兜底节点。
 * Milkdown 的解析器遇到没有 schema 的 mdast 节点会直接抛错，而 `<details>` 之外的
 * 原始 HTML（`<div>`、`<table>` 等）没有任何节点承接，此前会让整个编辑器解析失败。
 * 这里统一按等宽文本保留，保证内容不丢、编辑器不崩。
 */
export const htmlBlockSchema = $node('html_block', () => ({
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  toDOM: () => ['pre', { class: 'mdv-raw-html', spellcheck: 'false' }, 0],
  parseDOM: [{ tag: 'pre.mdv-raw-html', preserveWhitespace: 'full' }],
  parseMarkdown: {
    match: (node: { type: string }) => node.type === 'html',
    runner: (state: any, node: any, type: any) => {
      state.openNode(type).addText(node.value).closeNode()
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'html_block',
    runner: (state: any, node: any) => {
      state.addNode('html', undefined, node.textContent)
    },
  },
}))

/** 行内 HTML 没有块级节点可用，降级成普通文本（`<br>`、`<kbd>` 等至少不丢字） */
const INLINE_PARENTS = new Set([
  'paragraph',
  'heading',
  'tableCell',
  'emphasis',
  'strong',
  'link',
  'delete',
])

/** remark 转换：把行内 html 节点替换成文本节点 */
export function remarkInlineHtmlToText(tree: any): void {
  const walk = (node: any) => {
    if (!Array.isArray(node.children)) return
    node.children = node.children.flatMap((child: any) => {
      if (child.type === 'html' && INLINE_PARENTS.has(node.type)) {
        return child.value ? [{ type: 'text', value: child.value }] : []
      }
      walk(child)
      return [child]
    })
  }
  walk(tree)
}
