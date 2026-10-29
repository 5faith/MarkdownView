import { InitReady, remarkPluginsCtx } from '@milkdown/kit/core'
import { htmlBlockSchema, remarkInlineHtmlToText } from './html'
import {
  detailsContentSchema,
  detailsNodeView,
  detailsSchema,
  detailsSummarySchema,
  remarkDetails,
} from './details'
import { alertSchema, remarkAlerts } from './alert'
import {
  definitionDescriptionSchema,
  definitionListSchema,
  definitionTermSchema,
  remarkDefinitionListPlugin,
} from './definitionList'
import { emojiInputRule, emojiSchema, remarkEmoji } from './emoji'
import { mermaidNodeView, mermaidSchema, remarkMermaid } from './mermaid'

/**
 * 扩展语法插件集合：原始 HTML 兜底、GitHub 折叠块、告警块、定义列表、表情短代码。
 *
 * 注意 remark 顺序：commonmark 预设自带 remarkHtmlTransformer，会把块级 HTML 改写成
 * 普通段落（只保留文本），所以我们的转换必须**排在它前面**。$remark 只能追加，
 * 这里用自定义插件把转换插到 remarkPluginsCtx 最前面。
 */
function prependRemarkSyntax(): (ctx: any) => () => Promise<() => void> {
  return (ctx: any) => async () => {
    await ctx.wait(InitReady)
    const entry = {
      plugin: () => (tree: any) => {
        remarkInlineHtmlToText(tree)
        remarkDetails(tree)
        remarkAlerts(tree)
        remarkEmoji(tree)
        remarkMermaid(tree)
      },
      options: {},
    }
    ctx.update(remarkPluginsCtx, (list: any[]) => [entry, ...list])
    return () => ctx.update(remarkPluginsCtx, (list: any[]) => list.filter((item: any) => item !== entry))
  }
}

export const milkdownSyntaxPlugins: any[] = [
  prependRemarkSyntax(),
  remarkDefinitionListPlugin,
  htmlBlockSchema,
  detailsSchema,
  detailsSummarySchema,
  detailsContentSchema,
  detailsNodeView,
  alertSchema,
  definitionListSchema,
  definitionTermSchema,
  definitionDescriptionSchema,
  emojiSchema,
  emojiInputRule,
  mermaidSchema,
  mermaidNodeView,
]
