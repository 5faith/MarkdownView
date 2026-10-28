import { $node } from '@milkdown/kit/utils'

/**
 * GitHub 告警块（Alerts）：引用首行 `> [!NOTE]` 等 5 种类型。
 * remark-gfm 不认识它，这里自己把 blockquote 首段的标记摘出来，转成带 type 的节点，
 * 回写时再拼回引用语法。
 */

export type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution'

export const ALERT_TITLES: Record<AlertType, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

/** 菜单/工具栏共用的告警类型清单 */
export const ALERT_OPTIONS: Array<{ type: AlertType; title: string; label: string }> = [
  { type: 'note', title: 'Note', label: '注意' },
  { type: 'tip', title: 'Tip', label: '提示' },
  { type: 'important', title: 'Important', label: '重要' },
  { type: 'warning', title: 'Warning', label: '警告' },
  { type: 'caution', title: 'Caution', label: '危险' },
]

const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:\n|$)/i

/** remark 转换：把首行是告警标记的引用块转成 mdvAlert 节点 */
export function remarkAlerts(tree: any): void {
  const walk = (node: any) => {
    if (!Array.isArray(node.children)) return
    node.children = node.children.map((child: any) => {
      if (child.type === 'blockquote' && child.children?.length) {
        const first = child.children[0]
        const lead = first?.type === 'paragraph' ? first.children?.[0] : null
        if (lead?.type === 'text') {
          const matched = MARKER.exec(lead.value)
          if (matched) {
            lead.value = lead.value.slice(matched[0].length)
            if (!lead.value) first.children.shift()
            if (!first.children?.length) child.children.shift()
            const alert = {
              type: 'mdvAlert',
              alertType: (matched[1] ?? 'note').toLowerCase(),
              children: child.children,
            }
            walk(alert)
            return alert
          }
        }
      }
      walk(child)
      return child
    })
  }
  walk(tree)
}

const NS = 'http://www.w3.org/2000/svg'

/** 图标用线条绘制，深浅主题都吃 currentColor；导出 PDF 时随节点 toDOM 一起进 HTML */
const ICONS: Record<AlertType, Array<[string, Record<string, string>]>> = {
  note: [
    ['circle', { cx: '8', cy: '8', r: '6.2' }],
    ['path', { d: 'M8 7.2v4M8 4.8v.02' }],
  ],
  tip: [
    ['path', { d: 'M6.1 11.2c-.5-.9-1.6-1.8-1.6-3.6a3.5 3.5 0 017 0c0 1.8-1.1 2.7-1.6 3.6z' }],
    ['path', { d: 'M6.2 13.2h3.6' }],
  ],
  important: [
    ['rect', { x: '1.9', y: '2.4', width: '12.2', height: '11.2', rx: '2.4' }],
    ['path', { d: 'M8 5.4v3.4M8 11.3v.02' }],
  ],
  warning: [
    ['path', { d: 'M8 2.3 14.5 13.5H1.5z' }],
    ['path', { d: 'M8 6.4v3M8 11.6v.02' }],
  ],
  caution: [
    ['path', { d: 'M5.3 2h5.4L14 5.3v5.4L10.7 14H5.3L2 10.7V5.3z' }],
    ['path', { d: 'M8 5.4v3.4M8 11.3v.02' }],
  ],
}

/** 必须用 createElementNS 建 SVG，ProseMirror 的 createElement 只会生成 HTML 未知元素 */
function alertIcon(type: AlertType): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.4')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  for (const [tag, attrs] of ICONS[type]) {
    const el = document.createElementNS(NS, tag)
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
    svg.appendChild(el)
  }
  return svg
}

export const alertSchema = $node('alert', () => ({
  group: 'block',
  content: 'block+',
  defining: true,
  attrs: { type: { default: 'note' as AlertType } },
  toDOM: (node: any) => {
    const type = node.attrs.type as AlertType
    return [
      'div',
      { class: `mdv-alert mdv-alert--${type}`, 'data-alert': type },
      ['p', { class: 'mdv-alert__title' }, alertIcon(type), ['span', {}, ALERT_TITLES[type]]],
      ['div', { class: 'mdv-alert__body' }, 0],
    ]
  },
  parseMarkdown: {
    match: (node: any) => node.type === 'mdvAlert',
    runner: (state: any, node: any, type: any) => {
      state.openNode(type, { type: node.alertType })
      if (node.children?.length) state.next(node.children)
      else state.addNode(state.schema.nodes.paragraph)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'alert',
    runner: (state: any, node: any) => {
      state.openNode('blockquote')
      state.openNode('paragraph')
      state.addNode('text', undefined, `[!${String(node.attrs.type).toUpperCase()}]`)
      state.closeNode()
      state.next(node.content)
      state.closeNode()
    },
  },
}))
