import { onBeforeUnmount, watch } from 'vue'
import { Crepe } from '@milkdown/crepe'
import { containerPlugin } from '@xz-summer/milkdown-container'
import { editorViewCtx } from '@milkdown/kit/core'
import type { EditorView } from '@milkdown/kit/prose/view'
import { linkSchema } from '@milkdown/kit/preset/commonmark'
import { replaceAll } from '@milkdown/kit/utils'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { currentEditor } from '../shared/editor'
import { cmThemeExtension } from '../shared/cmTheme'
import { saveImageFile } from '../utils/imageStore'
import { toDisplayUrl } from '../utils/localImage'

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

    crepe = new Crepe({
      root,
      defaultValue: store.content,
      featureConfigs: {
        [Crepe.Feature.CodeMirror]: {
          // 代码块语法高亮按明暗主题着色（默认亮色 token 在暗底上不可读）
          theme: cmThemeExtension(store.theme),
        },
        [Crepe.Feature.ImageBlock]: {
          // 粘贴/上传的图片落盘到 md 同级图片目录，markdown 里保存相对路径；
          // 文件还没存过盘（或写失败）时退回内存 blob URL（旧行为，重启即失效）
          onUpload: async (file) => {
            const mdPath = store.activeFile?.path
            if (!mdPath) return URL.createObjectURL(file)
            try {
              return await saveImageFile(file, mdPath, store.imageDir)
            } catch {
              return URL.createObjectURL(file)
            }
          },
          // markdown 里的本地相对/绝对路径经 asset 协议显示；远程/内联 URL 原样
          proxyDomURL: (url) => toDisplayUrl(url, store.activeFile?.path ?? null),
        },
      },
    })
    currentEditor.value = crepe

    // 容器指令插件（:::details 折叠块等）：Crepe 无自定义插件入口，借 addFeature 注入
    crepe.addFeature((editor) => {
      editor.use(containerPlugin)
    })

    // 链接 mark 不越过边界（inclusive: false）：光标在链接首/尾输入的新文字是普通文本，
    // 不再被吸进链接里，方便在链接后续写（Typora 行为；链接中段输入仍正常延伸）
    crepe.editor.config((ctx) => {
      ctx.update(linkSchema.ctx.key, (prev) => (c) => ({ ...prev(c), inclusive: false }))
    })

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
    ;(window as unknown as Record<string, unknown>).__crepe = crepe // 调试探针
    ;(window as unknown as Record<string, unknown>).__editorViewCtx = editorViewCtx

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
