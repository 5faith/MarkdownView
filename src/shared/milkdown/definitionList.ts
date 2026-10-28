import { $node, $remark } from '@milkdown/kit/utils'
import { remarkDefinitionList } from 'remark-definition-list'

/**
 * 定义列表（php-markdown / GitHub 扩展）：
 *
 *   术语
 *   : 释义
 *
 * 解析与回写交给 remark-definition-list（micromark + mdast 扩展），
 * 这里只补 ProseMirror 的节点与 DOM。
 */

export const remarkDefinitionListPlugin = $remark('remarkDefinitionList', () => remarkDefinitionList)

export const definitionTermSchema = $node('definition_term', () => ({
  content: 'inline*',
  defining: true,
  isolating: true,
  parseDOM: [{ tag: 'dt' }],
  toDOM: () => ['dt', { class: 'mdv-deflist__term' }, 0],
  parseMarkdown: {
    match: (node: any) => node.type === 'defListTerm',
    runner: (state: any, node: any, type: any) => {
      state.openNode(type)
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'definition_term',
    runner: (state: any, node: any) => {
      state.openNode('defListTerm')
      state.next(node.content)
      state.closeNode()
    },
  },
}))

export const definitionDescriptionSchema = $node('definition_description', () => ({
  content: 'block+',
  defining: true,
  isolating: true,
  parseDOM: [{ tag: 'dd' }],
  toDOM: () => ['dd', { class: 'mdv-deflist__description' }, 0],
  parseMarkdown: {
    match: (node: any) => node.type === 'defListDescription',
    runner: (state: any, node: any, type: any) => {
      state.openNode(type)
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'definition_description',
    runner: (state: any, node: any) => {
      state.openNode('defListDescription', undefined, { spread: false })
      state.next(node.content)
      state.closeNode()
    },
  },
}))

export const definitionListSchema = $node('definition_list', () => ({
  group: 'block',
  content: '(definition_term definition_description+)+',
  defining: true,
  parseDOM: [{ tag: 'dl' }],
  toDOM: () => ['dl', { class: 'mdv-deflist' }, 0],
  parseMarkdown: {
    match: (node: any) => node.type === 'defList',
    runner: (state: any, node: any, type: any) => {
      state.openNode(type)
      state.next(node.children)
      state.closeNode()
    },
  },
  toMarkdown: {
    match: (node: any) => node.type.name === 'definition_list',
    runner: (state: any, node: any) => {
      state.openNode('defList')
      state.next(node.content)
      state.closeNode()
    },
  },
}))
