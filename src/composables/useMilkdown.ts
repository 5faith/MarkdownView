import { onBeforeUnmount, watch } from 'vue'
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx } from '@milkdown/kit/core'
import type { EditorView } from '@milkdown/kit/prose/view'
import { replaceAll } from '@milkdown/kit/utils'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { currentEditor } from '../shared/editor'

/**
 * Crepe 编辑器生命周期与 store 双向同步。
 * lastSynced 防回环：编辑器内输入 → markdownUpdated → setContent；
 * 外部改内容（watch/模板/重载）→ replaceAll。
 */
export function useMilkdown(root: HTMLElement, scrollEl: HTMLElement | null) {
  const store = useMarkdownStore()
  let crepe: Crepe | null = null
  let lastSynced = store.content
  let disposed = false

  function getView(): EditorView | null {
    if (!crepe) return null
    try {
      return crepe.editor.action((ctx) => ctx.get(editorViewCtx))
    } catch {
      return null
    }
  }

  function scrollCaretIntoCenter(view: EditorView) {
    if (!scrollEl) return
    const coords = view.coordsAtPos(view.state.selection.from)
    if (!coords) return
    const rect = scrollEl.getBoundingClientRect()
    // 光标趋向滚动容器垂直居中（Typora 打字机行为）
    scrollEl.scrollTop += coords.top - (rect.top + rect.height / 2)
  }

  function updateCaretFromView() {
    const view = getView()
    if (!view) return
    if (!root.contains(document.activeElement)) return
    const $from = view.state.selection.$from
    store.setCaret({ line: $from.index(0) + 1, col: $from.parentOffset + 1 })
    if (store.typewriter) scrollCaretIntoCenter(view)
  }

  function onSelectionChange() {
    if (store.readingMode || store.sourceMode) return
    updateCaretFromView()
  }

  async function createEditor() {
    if (crepe) {
      await crepe.destroy()
      crepe = null
    }

    crepe = new Crepe({ root, defaultValue: store.content })
    currentEditor.value = crepe

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown, prevMarkdown) => {
        if (markdown === prevMarkdown) return
        if (markdown === lastSynced) return
        lastSynced = markdown
        store.setContent(markdown)
      })
    })

    await crepe.create()
    if (disposed) return
    crepe.setReadonly(store.readingMode)
    lastSynced = store.content

    document.addEventListener('selectionchange', onSelectionChange)
  }

  watch(() => store.content, (newContent) => {
    if (!crepe || newContent === lastSynced) return
    lastSynced = newContent
    crepe.editor.action(replaceAll(newContent))
  })

  watch(() => store.readingMode, (v) => {
    if (!crepe) return
    crepe.setReadonly(v)
    if (!v) getView()?.focus()
  })

  onBeforeUnmount(async () => {
    disposed = true
    document.removeEventListener('selectionchange', onSelectionChange)
    currentEditor.value = null
    if (crepe) {
      await crepe.destroy()
      crepe = null
    }
  })

  return { createEditor }
}
