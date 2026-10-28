import { $node, $prose } from '@milkdown/kit/utils'
import { InputRule, inputRules } from '@milkdown/kit/prose/inputrules'
import { gemoji } from 'gemoji'

/**
 * GitHub 风格的表情短代码：源文件里保持 `:smile:`，编辑区显示成 😄。
 *
 * 用**行内原子节点**而不是文本装饰：装饰方案要把短代码文本压成 0 宽，
 * 点图标右侧时 ProseMirror 会把光标算进不可见的短代码里，输入的字也跟着不可见。
 * 节点方案下表情本身占位，光标只能落在节点前后，输入正常。
 */

export const emojiByName = new Map<string, string>()
for (const item of gemoji) {
  for (const name of item.names) emojiByName.set(name, item.emoji)
}

/** 菜单/工具栏展示的常用短代码 */
export const EMOJI_MENU: Array<{ name: string; emoji: string }> = [
  'smile', 'heart', 'rocket', 'warning', 'information_source', 'bulb', 'checkered_flag',
  'thumbsup', '+1', 'tada', 'fire', 'sparkles', 'star', 'white_check_mark', 'x',
  'eyes', 'thinking', 'pray', 'muscle', 'coffee', 'book', 'memo', 'lock', 'key',
  'wrench', 'bug', 'zap', 'hourglass', 'package', 'art',
]
  .map((name) => ({ name, emoji: emojiByName.get(name) ?? '' }))
  .filter((item) => item.emoji)

const SHORTCODE = /:([a-z0-9_+-]+):/g

const emojiText = (name: string) => emojiByName.get(name) ?? `:${name}:`

export const emojiSchema = $node('emoji', () => ({
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  draggable: false,
  attrs: { name: { default: 'smile' } },
  parseDOM: [
    {
      tag: 'span.mdv-emoji',
      getAttrs: (dom: any) => ({ name: (dom as HTMLElement).getAttribute('data-name') ?? 'smile' }),
    },
  ],
  toDOM: (node: any) => {
    const name = String(node.attrs.name)
    return ['span', { class: 'mdv-emoji', 'data-name': name, title: `:${name}:` }, emojiText(name)]
  },
  parseMarkdown: {
    match: (node: any) => node.type === 'mdvEmoji',
    runner: (state: any, node: any, type: any) => {
      state.addNode(type, { name: node.name })
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'emoji',
    runner: (state: any, node: any) => {
      state.addNode('text', undefined, `:${String(node.attrs.name)}:`)
    },
  },
}))

/** remark 转换：把文本里的 `:name:` 拆成 mdvEmoji 节点（代码/行内代码不在 text 节点里，天然跳过） */
export function remarkEmoji(tree: any): void {
  const walk = (node: any) => {
    if (!Array.isArray(node.children)) return
    node.children = node.children.flatMap((child: any) => {
      if (child.type === 'text' && typeof child.value === 'string' && child.value.includes(':')) {
        const parts: any[] = []
        let last = 0
        SHORTCODE.lastIndex = 0
        let matched: RegExpExecArray | null
        while ((matched = SHORTCODE.exec(child.value))) {
          if (!emojiByName.has(matched[1] ?? '')) continue
          if (matched.index > last) parts.push({ type: 'text', value: child.value.slice(last, matched.index) })
          parts.push({ type: 'mdvEmoji', name: matched[1] })
          last = matched.index + matched[0].length
        }
        if (!parts.length) return [child]
        if (last < child.value.length) parts.push({ type: 'text', value: child.value.slice(last) })
        return parts
      }
      walk(child)
      return [child]
    })
  }
  walk(tree)
}

/** 输入 `:smile:` 时即时转成表情节点（源文件回写仍是短代码） */
export const emojiInputRule = $prose(
  () =>
    inputRules({
      rules: [
        new InputRule(/:([a-z0-9_+-]+):$/, (state, match, start, end) => {
          const name = match[1] ?? ''
          const type = state.schema.nodes.emoji
          if (!type || !emojiByName.has(name)) return null
          return state.tr.replaceWith(start, end, type.create({ name }))
        }),
      ],
    }),
)

/** 导出 PDF 用：把文本节点里残留的短代码替换成 emoji（代码块内不动） */
export function replaceEmojiInElement(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const targets: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (!parent || parent.closest('pre, code')) continue
    if (node.nodeValue?.includes(':')) targets.push(node as Text)
  }
  const resolved: Array<[Text, string]> = []
  for (const text of targets) {
    const replaced = String(text.nodeValue).replace(SHORTCODE, (raw, name: string) => emojiByName.get(name) ?? raw)
    if (replaced !== text.nodeValue) resolved.push([text, replaced])
  }
  for (const [text, replaced] of resolved) text.nodeValue = replaced
}
