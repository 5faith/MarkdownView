import { $node, $view } from '@milkdown/kit/utils'

/**
 * Mermaid 图表（```mermaid 代码块）：编辑区直接渲染成图，双击「源码」按钮切回文本编辑。
 *
 * - remark 转换把 lang=mermaid 的 code 节点换成 mdvMermaid，schema 负责渲染与回写；
 * - mermaid 本体按需动态加载（首屏不背 2MB 包体）；
 * - 节点内容仍是纯文本（`content: text*`），回写成 ```mermaid 围栏。
 */

/** 图表骨架模板：菜单/工具栏下拉用同一份数据 */
export interface MermaidTemplate {
  type: string
  label: string
  code: string
}

export const MERMAID_TEMPLATES: MermaidTemplate[] = [
  {
    type: 'mindmap',
    label: '脑图',
    code: 'mindmap\n  root((脑图))\n    主题 A\n      分支 A1\n      分支 A2\n    主题 B',
  },
  {
    type: 'flowchart',
    label: '流程图',
    code: 'flowchart TD\n    A[开始] --> B{判断}\n    B -->|是| C[执行]\n    B -->|否| D[结束]',
  },
  {
    type: 'sequence',
    label: '时序图',
    code: 'sequenceDiagram\n    participant U as 用户\n    participant S as 服务\n    U->>S: 请求\n    S-->>U: 响应',
  },
  {
    type: 'gantt',
    label: '甘特图',
    code: 'gantt\n    title 项目计划\n    dateFormat YYYY-MM-DD\n    section 阶段一\n    需求分析 :a1, 2026-01-01, 7d\n    编码开发 :after a1, 14d',
  },
  {
    type: 'xychart',
    label: '图表（XY）',
    code: 'xychart-beta\n    title "数据趋势"\n    x-axis [Q1, Q2, Q3, Q4]\n    y-axis "数量" 0 --> 100\n    bar [23, 45, 67, 89]\n    line [23, 45, 67, 89]',
  },
  {
    type: 'class',
    label: '类图',
    code: 'classDiagram\n    class Animal {\n        +String name\n        +eat()\n    }\n    class Dog\n    Animal <|-- Dog',
  },
  {
    type: 'state',
    label: '状态图',
    code: 'stateDiagram-v2\n    [*] --> 待处理\n    待处理 --> 已完成 : 提交\n    已完成 --> [*]',
  },
  {
    type: 'er',
    label: 'E-R 图',
    code: 'erDiagram\n    USER ||--o{ ORDER : places\n    ORDER ||--|{ LINE_ITEM : contains',
  },
  {
    type: 'pie',
    label: '饼图',
    code: 'pie title 资源占比\n    "A" : 40\n    "B" : 35\n    "C" : 25',
  },
  {
    type: 'journey',
    label: '用户旅程图',
    code: 'journey\n    title 用户下单旅程\n    section 浏览\n        查看商品: 5: 用户\n        加入购物车: 4: 用户\n    section 下单\n        提交订单: 3: 用户\n        完成支付: 5: 用户',
  },
]

/** 渲染结果缓存：导出 PDF 的 toDOM 是同步的，只能取这里 */
const renderedCache = new Map<string, string>()
let renderSeq = 0
let initializedTheme = ''

async function renderMermaidSvg(code: string, theme: 'default' | 'dark'): Promise<string> {
  const mermaid = (await import('mermaid')).default
  if (initializedTheme !== theme) {
    mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'loose' })
    initializedTheme = theme
  }
  const id = `mdv-mermaid-${++renderSeq}`
  const { svg } = await mermaid.render(id, code)
  return svg
}

const currentTheme = (): 'default' | 'dark' =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default'

/** 所有视图实例：切主题时统一重渲染（mermaid 把配色烤进 SVG） */
const views = new Set<MermaidView>()
let themeObserver: MutationObserver | null = null

function watchTheme(): void {
  if (themeObserver) return
  themeObserver = new MutationObserver(() => {
    for (const view of views) view.forceRender()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
}

class MermaidView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private code = ''
  private timer = 0
  private pending = false

  constructor(node: any) {
    const dom = document.createElement('figure')
    dom.className = 'mdv-mermaid'
    const view = document.createElement('div')
    view.className = 'mdv-mermaid__view'
    const source = document.createElement('pre')
    source.className = 'mdv-mermaid__source'
    source.setAttribute('spellcheck', 'false')
    const bar = document.createElement('div')
    bar.className = 'mdv-mermaid__bar'
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'mdv-mermaid__toggle'
    toggle.textContent = '源码'
    toggle.addEventListener('click', () => {
      dom.classList.toggle('mdv-mermaid--edit')
      toggle.textContent = dom.classList.contains('mdv-mermaid--edit') ? '图表' : '源码'
    })
    bar.appendChild(toggle)
    dom.append(view, source, bar)

    this.dom = dom
    this.contentDOM = source
    this.code = node.textContent
    views.add(this)
    watchTheme()
    this.render()
  }

  update(node: any): boolean {
    if (node.type.name !== 'mermaid') return false
    const code = node.textContent
    if (code !== this.code) {
      this.code = code
      this.scheduleRender()
    }
    return true
  }

  // DOM 变更（渲染结果、按钮态）都不回流文档；文本编辑走输入事件
  ignoreMutation(): boolean {
    return true
  }

  destroy(): void {
    window.clearTimeout(this.timer)
    views.delete(this)
  }

  forceRender(): void {
    this.scheduleRender()
  }

  private scheduleRender(): void {
    window.clearTimeout(this.timer)
    this.timer = window.setTimeout(() => this.render(), 400)
    if (!this.pending) void this.render()
  }

  private async render(): Promise<void> {
    this.pending = true
    const code = this.code
    try {
      const svg = await renderMermaidSvg(code, currentTheme())
      if (code !== this.code) return
      renderedCache.set(code, svg)
      const view = this.dom.querySelector('.mdv-mermaid__view')
      if (view) view.innerHTML = svg
      this.dom.classList.remove('mdv-mermaid--error')
    } catch (error) {
      if (code !== this.code) return
      this.dom.classList.add('mdv-mermaid--error')
      const view = this.dom.querySelector('.mdv-mermaid__view')
      if (view) view.textContent = `图表渲染失败：${(error as Error)?.message ?? error}`
    } finally {
      this.pending = false
    }
  }
}

/** remark 转换：lang=mermaid 的 code 块换成 mdvMermaid */
export function remarkMermaid(tree: any): void {
  const walk = (node: any) => {
    if (!Array.isArray(node.children)) return
    node.children = node.children.flatMap((child: any) => {
      if (child.type === 'code' && String(child.lang ?? '').toLowerCase() === 'mermaid') {
        return [{ type: 'mdvMermaid', value: child.value ?? '' }]
      }
      walk(child)
      return [child]
    })
  }
  walk(tree)
}

export const mermaidSchema = $node('mermaid', () => ({
  group: 'block',
  content: 'text*',
  defining: true,
  isolating: true,
  code: true,
  toDOM: (node: any) => {
    const code = node.textContent
    const el = document.createElement('figure')
    el.className = 'mdv-mermaid'
    const svg = renderedCache.get(code)
    if (svg) {
      const view = document.createElement('div')
      view.className = 'mdv-mermaid__view'
      view.innerHTML = svg
      el.appendChild(view)
    } else {
      const pre = document.createElement('pre')
      pre.className = 'mdv-mermaid__source'
      pre.textContent = code
      el.appendChild(pre)
    }
    return el
  },
  parseMarkdown: {
    match: (node: any) => node.type === 'mdvMermaid',
    runner: (state: any, node: any, type: any) => {
      state.openNode(type).addText(node.value ?? '').closeNode()
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'mermaid',
    runner: (state: any, node: any) => {
      state.addNode('code', undefined, node.textContent, { lang: 'mermaid', meta: '' })
    },
  },
}))

export const mermaidNodeView = $view(mermaidSchema, () => {
  return (node: any) => new MermaidView(node)
})
