import { $node, $view } from '@milkdown/kit/utils'
import { useMarkdownStore } from '../../stores/useMarkdownStore'
import { toDisplayUrl } from '../../utils/localImage'

/**
 * 原始 HTML 兜底节点。
 * Milkdown 的解析器遇到没有 schema 的 mdast 节点会直接抛错，而 `<details>` 之外的
 * 原始 HTML（`<div>`、`<table>`、`<p align>` 等）没有任何节点承接，此前会让整个编辑器解析失败。
 * 这里保留原文（回写 Markdown 用），同时把渲染结果挂到 NodeView 上，README 里的
 * `<p align="center"><a><img></a></p>` 能正常显示。
 */

/** 直接丢弃的标签：渲染进编辑器会执行脚本、劫持布局或嵌外部页面 */
const BLOCKED_TAGS = 'script,style,iframe,object,embed,link,meta,base,form,input,button,select,textarea'

/**
 * 把 markdown 里的原始 HTML 解析成可安全插入的 DOM。
 * DOMParser 产出的是惰性文档（不加载图片、不执行脚本），搬到活动 DOM 前清掉危险属性和被禁标签。
 */
function fillRawHtml(box: HTMLElement, raw: string): void {
  const parsed = new DOMParser().parseFromString(raw, 'text/html')
  const mdPath = useMarkdownStore().activeFile?.path || null

  parsed.body.querySelectorAll(BLOCKED_TAGS).forEach((el) => el.remove())
  for (const el of Array.from(parsed.body.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(attr.name)
      else if (name === 'href' && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name)
    }
    // 本地图片要走 asset 协议，否则相对路径按站点根解析成 404（与 ImageBlock 同一套规则）
    if (el.tagName === 'IMG') {
      const src = el.getAttribute('src')
      if (src) el.setAttribute('src', toDisplayUrl(src, mdPath))
    }
  }

  box.replaceChildren(...Array.from(parsed.body.childNodes))
}

/** 只含渲染结果的容器：NodeView 与 PDF 导出（DOMSerializer）共用，导出不带工具栏 */
export function renderRawHtml(raw: string): HTMLElement {
  const box = document.createElement('div')
  box.className = 'mdv-html__view'
  fillRawHtml(box, raw)
  return box
}

/** 行内 HTML 的容器：包一层 span 让 ProseMirror 的原子节点有落脚点 */
function renderInlineRawHtml(raw: string): HTMLElement {
  const box = document.createElement('span')
  box.className = 'mdv-html__inline'
  box.dataset.raw = raw
  fillRawHtml(box, raw)
  return box
}

export const htmlBlockSchema = $node('html_block', () => ({
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  toDOM: (node: any) => renderRawHtml(node.textContent),
  parseDOM: [{ tag: 'pre.mdv-raw-html', preserveWhitespace: 'full' }],
  parseMarkdown: {
    match: (node: { type: string }) => node.type === 'mdvHtmlBlock',
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

/** 默认显示渲染结果，点「源码」切回等宽文本框编辑原文（与 Mermaid 同一套交互） */
class RawHtmlView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private view: HTMLElement
  private raw: string

  constructor(node: any) {
    const dom = document.createElement('div')
    dom.className = 'mdv-html'

    const view = document.createElement('div')
    view.className = 'mdv-html__view'

    const source = document.createElement('pre')
    source.className = 'mdv-html__source'
    source.setAttribute('spellcheck', 'false')

    const bar = document.createElement('div')
    bar.className = 'mdv-html__bar'
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'mdv-html__toggle'
    toggle.textContent = '源码'
    toggle.addEventListener('click', () => {
      dom.classList.toggle('mdv-html--edit')
      toggle.textContent = dom.classList.contains('mdv-html--edit') ? 'HTML' : '源码'
    })
    bar.appendChild(toggle)

    dom.append(view, source, bar)
    this.dom = dom
    this.contentDOM = source
    this.view = view
    this.raw = node.textContent
    fillRawHtml(view, this.raw)
  }

  update(node: any): boolean {
    if (node.type.name !== 'html_block') return false
    if (node.textContent !== this.raw) {
      this.raw = node.textContent
      fillRawHtml(this.view, this.raw)
    }
    return true
  }

  // 渲染出的 DOM 与按钮态都不回流文档；原文编辑走 contentDOM 的输入事件
  ignoreMutation(): boolean {
    return true
  }
}

export const htmlBlockNodeView = $view(htmlBlockSchema, () => {
  return (node: any) => new RawHtmlView(node)
})

/** 行内 HTML（`<a id>`、`<kbd>…</kbd>`、`<br>` 等）：渲染成原子节点，原文放在 attrs 里回写 */
export const htmlInlineSchema = $node('html_inline', () => ({
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,
  attrs: { value: { default: '' } },
  toDOM: (node: any) => renderInlineRawHtml(String(node.attrs.value ?? '')),
  parseDOM: [
    {
      tag: 'span.mdv-html__inline',
      getAttrs: (dom: any) => ({ value: dom.dataset?.raw ?? dom.textContent ?? '' }),
    },
  ],
  parseMarkdown: {
    match: (node: { type: string }) => node.type === 'mdvHtmlInline',
    runner: (state: any, node: any, type: any) => {
      state.addNode(type, { value: node.value })
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'html_inline',
    runner: (state: any, node: any) => {
      state.addNode('html', undefined, node.attrs.value)
    },
  },
}))

/** 块级 HTML 的父节点：只有这些位置的 html 才当成独立块渲染 */
const BLOCK_PARENTS = new Set(['root', 'blockquote', 'listItem', 'footnoteDefinition'])
/** `<br>` 独立成行是「空行占位」，预设的 remark-preserve-empty-line 要把它变成空段落，别抢 */
const BR_ONLY = /^<br\s*\/?\s*>$/i

/**
 * remark 转换：块级 html → mdvHtmlBlock。
 * commonmark 预设自带的 `html` 节点是**行内 atom**，它的 parseMarkdown 会吞掉所有 html 节点，
 * 块级 HTML 因此被塞进段落当文本显示。必须在这里先改名，html_block 才接得住。
 * 要在 remarkDetails 之后跑，让 `<details>` 先被折叠块吃掉。
 */
export function remarkHtmlBlocks(tree: any): void {
  const walk = (node: any) => {
    if (!Array.isArray(node.children)) return
    node.children = node.children.flatMap((child: any) => {
      if (child.type === 'html' && BLOCK_PARENTS.has(node.type)) {
        const value = String(child.value ?? '')
        if (BR_ONLY.test(value.trim())) return [child]
        return value.trim() ? [{ type: 'mdvHtmlBlock', value: child.value }] : []
      }
      walk(child)
      return [child]
    })
  }
  walk(tree)
}

/** 行内 HTML 的父节点（这些位置上的 html 才按行内处理） */
const INLINE_PARENTS = new Set([
  'paragraph',
  'heading',
  'tableCell',
  'emphasis',
  'strong',
  'link',
  'delete',
])

/** 不需要闭合的标签：单个节点即可渲染 */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/**
 * 尝试把一个行内 html 节点（可能连同后面的文本、闭合标签）合成一次完整渲染。
 * remark 把 `<kbd>Ctrl</kbd>` 拆成 `<kbd>` + 文本 + `</kbd>` 三个节点，
 * 逐个渲染会得到空的 `<kbd>`，所以这里按标签配对合并。
 */
function mergeInlineHtml(kids: any[], start: number): { value: string; end: number } | null {
  const raw = String(kids[start]?.value ?? '')
  const lead = /^<([a-zA-Z][\w:-]*)/.exec(raw.trim())
  if (!lead) return null
  const tag = lead[1]!.toLowerCase()
  const closeRe = new RegExp(`^</${tag}\\s*>$`, 'i')
  const endRe = new RegExp(`</${tag}\\s*>$`, 'i')

  // 单节点就完整：`<a id="x"></a>`、`<img … />`、`<br>`
  if (/\/>$/.test(raw.trim()) || VOID_TAGS.has(tag) || endRe.test(raw.trim())) {
    return { value: raw, end: start }
  }

  let value = raw
  for (let i = start + 1; i < kids.length; i++) {
    const child = kids[i]!
    if (child.type !== 'text' && child.type !== 'html') return null
    value += String(child.value ?? '')
    if (child.type === 'html' && closeRe.test(String(child.value).trim())) {
      return { value, end: i }
    }
  }
  return null
}

/** remark 转换：行内 html → mdvHtmlInline（配对失败时退回文本，避免丢字） */
export function remarkInlineHtml(tree: any): void {
  const walk = (node: any) => {
    if (!Array.isArray(node.children)) return
    const kids = node.children
    const next: any[] = []
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i]
      if (child.type === 'html' && INLINE_PARENTS.has(node.type)) {
        const merged = mergeInlineHtml(kids, i)
        if (merged) {
          next.push({ type: 'mdvHtmlInline', value: merged.value })
          i = merged.end
          continue
        }
        if (child.value) next.push({ type: 'text', value: child.value })
        continue
      }
      if (Array.isArray(child.children)) walk(child)
      next.push(child)
    }
    node.children = next
  }
  walk(tree)
}
