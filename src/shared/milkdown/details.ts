import { $node, $view } from '@milkdown/kit/utils'

/**
 * GitHub 的折叠块：`<details><summary>摘要</summary>正文</details>`。
 * remark 会把这种 HTML 拆成「<details> 块 + 中间 Markdown + </details> 块」三段，
 * 所以先用 remark 转换把它们合并成一个 mdvDetails 节点，再由 schema 负责渲染与回写。
 */

const DETAILS_OPEN = /^<details\b[^>]*>/i
const DETAILS_OPEN_FLAG = /^<details\b[^>]*\bopen\b/i
const DETAILS_CLOSE = /^\s*<\/details>\s*$/i
const SUMMARY = /<summary[^>]*>([\s\S]*?)<\/summary>/i

/** remark 转换：合并 <details>…</details> 之间的兄弟节点 */
export function remarkDetails(tree: any): void {
  const walk = (parent: any) => {
    if (!Array.isArray(parent.children)) return
    const out: any[] = []
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i]
      const value: string = child.type === 'html' ? String(child.value).trim() : ''
      if (value && DETAILS_OPEN.test(value)) {
        let end = -1
        const body: any[] = []
        for (let j = i + 1; j < parent.children.length; j++) {
          const next = parent.children[j]
          if (next.type === 'html' && DETAILS_CLOSE.test(String(next.value))) {
            end = j
            break
          }
          body.push(next)
        }
        if (end > 0) {
          let summary = ''
          const inline = SUMMARY.exec(value)
          if (inline) summary = (inline[1] ?? '').trim()
          // summary 也可能因为空行被 remark 拆成紧随其后的独立 HTML 块
          while (body.length && body[0]?.type === 'html') {
            const sm = SUMMARY.exec(String(body[0]?.value))
            if (!sm) break
            summary = (sm[1] ?? '').trim()
            body.shift()
          }
          body.forEach(walk)
          out.push({
            type: 'mdvDetails',
            open: DETAILS_OPEN_FLAG.test(value),
            summary: summary || '摘要',
            children: body,
          })
          i = end
          continue
        }
      }
      walk(child)
      out.push(child)
    }
    parent.children = out
  }
  walk(tree)
}

export const detailsSummarySchema = $node('details_summary', () => ({
  content: 'inline*',
  defining: true,
  isolating: true,
  parseDOM: [{ tag: 'summary.mdv-details__summary' }],
  toDOM: () => ['summary', { class: 'mdv-details__summary' }, 0],
  parseMarkdown: { match: () => false, runner: () => {} },
  toMarkdown: {
    match: (node: any) => node.type.name === 'details_summary',
    runner: (state: any, node: any) => {
      state.next(node.content)
    },
  },
}))

export const detailsContentSchema = $node('details_content', () => ({
  content: 'block+',
  defining: true,
  isolating: true,
  parseDOM: [{ tag: 'div.mdv-details__content' }],
  toDOM: () => ['div', { class: 'mdv-details__content' }, 0],
  parseMarkdown: { match: () => false, runner: () => {} },
  toMarkdown: {
    match: (node: any) => node.type.name === 'details_content',
    runner: (state: any, node: any) => {
      state.next(node.content)
    },
  },
}))

export const detailsSchema = $node('details', () => ({
  group: 'block',
  content: 'details_summary details_content',
  defining: true,
  isolating: true,
  attrs: { open: { default: true } },
  toDOM: (node: any) => [
    'details',
    { class: 'mdv-details', ...(node.attrs.open ? { open: 'true' } : {}) },
    0,
  ],
  parseMarkdown: {
    match: (node: any) => node.type === 'mdvDetails',
    runner: (state: any, node: any, type: any) => {
      state.openNode(type, { open: node.open })
      state.openNode(state.schema.nodes.details_summary)
      state.addText(node.summary ?? '')
      state.closeNode()
      state.openNode(state.schema.nodes.details_content)
      if (node.children?.length) state.next(node.children)
      else state.addNode(state.schema.nodes.paragraph)
      state.closeNode()
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'details',
    runner: (state: any, node: any) => {
      const summary = node.child(0).textContent
      const content = node.child(1)
      // 回写 GitHub 认的 HTML；中间正文由 remark 原样序列化成 Markdown
      state.addNode('html', undefined, `<details${node.attrs.open ? ' open' : ''}>\n<summary>${summary}</summary>`)
      state.next(content.content)
      state.addNode('html', undefined, '</details>')
    },
  },
}))

/** 点击 <details> 展开/收起时 DOM 的 open 不会进文档，NodeView 负责同步回 attr，
 *  否则回写 Markdown 时 open 状态会丢失。 */
class DetailsView {
  dom: HTMLElement
  contentDOM: HTMLElement

  constructor(
    node: any,
    private view: any,
    private getPos: () => number | undefined,
  ) {
    const el = document.createElement('details')
    el.className = 'mdv-details'
    el.open = !!node.attrs.open
    el.addEventListener('toggle', this.onToggle)
    this.dom = el
    this.contentDOM = el
  }

  private onToggle = () => {
    const pos = this.getPos()
    if (pos == null) return
    requestAnimationFrame(() => {
      const current = this.view.state.doc.nodeAt(pos)
      if (!current || current.type.name !== 'details') return
      const open = (this.dom as HTMLDetailsElement).open
      if (current.attrs.open === open) return
      this.view.dispatch(this.view.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, open }))
    })
  }

  update(node: any): boolean {
    if (node.type.name !== 'details') return false
    if ((this.dom as HTMLDetailsElement).open !== !!node.attrs.open) {
      ;(this.dom as HTMLDetailsElement).open = !!node.attrs.open
    }
    return true
  }

  ignoreMutation(mutation: any): boolean {
    return mutation.type === 'attributes' && mutation.attributeName === 'open'
  }

  destroy(): void {
    this.dom.removeEventListener('toggle', this.onToggle)
  }
}

export const detailsNodeView = $view(detailsSchema, () => {
  return (node: any, view: any, getPos: () => number | undefined) => new DetailsView(node, view, getPos)
})
