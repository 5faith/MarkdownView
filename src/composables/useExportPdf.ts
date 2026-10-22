import { marked } from 'marked'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { currentEditor } from '../shared/editor'
import { isMarkdownFile } from '../utils/fileType'

/**
 * Markdown → HTML → 隐藏 iframe 打印为 PDF（替代 vditor preview 方案）。
 * 配色/字体/尺度全部读主题变量（prd/style.md §4），导出与屏幕是同一套主题。
 */
export async function exportPdf(): Promise<void> {
  const store = useMarkdownStore()
  const crepe = currentEditor.value
  if (!crepe || !store.activeFile || !isMarkdownFile(store.activeFile.name)) return

  store.loading = true
  try {
    const markdown = crepe.getMarkdown()
    const bodyHtml = await marked.parse(markdown)

    const cs = getComputedStyle(document.documentElement)
    // 自定义属性的 var() 链在部分内核里不会被 getComputedStyle 展开，这里手动递归
    const v = (name: string, fallback: string, depth = 0): string => {
      const value = cs.getPropertyValue(name).trim()
      if (!value) return fallback
      const ref = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(value)
      if (!ref || depth >= 5) return value
      return v(ref[1] ?? name, ref[2] ?? fallback, depth + 1)
    }

    // iframe 是独立文档，拿不到应用样式表里的 @font-face：把内置字体声明复制过去，
    // 否则导出 PDF 会回退到系统 monospace。跨源样式表读不到规则时跳过。
    const fontFaces: string[] = []
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSFontFaceRule) fontFaces.push(rule.cssText)
        }
      } catch {
        // 忽略不可读样式表
      }
    }

    const css = `
      ${fontFaces.join('\n')}
      html { font-size: ${v('--text-size', '14px')}; }
      body { margin: 0; background: ${v('--bg-color', '#ffffff')}; color: ${v('--text-color', '#333333')};
        font-family: ${v('--text-font', 'monospace')}; font-size: 1rem; line-height: ${v('--text-line-height', '1.6')}; }
      .prose { max-width: ${v('--prose-width', '55.714rem')}; margin: 0 auto; padding: 2.857rem 2.286rem; }
      .prose p, .prose blockquote, .prose ul, .prose ol, .prose table { margin: ${v('--p-spacing', '0.8rem')} 0; }
      .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
        color: ${v('--title-color', '#273849')}; font-family: ${v('--title-font', 'monospace')}; line-height: 1.3; }
      .prose h1 { font-size: 2rem; }
      .prose h2 { font-size: 1.8rem; }
      .prose h3 { font-size: 1.4rem; }
      .prose h4 { font-size: 1.2rem; }
      .prose h5, .prose h6 { font-size: 1rem; }
      .prose strong { color: ${v('--strong-color', '#273849')}; }
      .prose :not(pre) > code { font-family: ${v('--monospace', 'monospace')}; font-size: 0.95em;
        color: ${v('--drake-highlight', '#d63200')}; background: ${v('--input-bg-color', '#e5e5e596')};
        border-radius: 0.286rem; padding: 0.1em 0.35em; }
      .prose pre { background: ${v('--code-block-bg-color', '#2b2b2b')}; color: ${v('--code-block-color', '#a9b7c6')};
        border-radius: 0.571rem; padding: 0.8rem 1rem; overflow-x: auto;
        line-height: ${v('--code-line-height', '1.6')}; }
      .prose pre code { background: transparent; padding: 0; color: inherit; }
      .prose blockquote { border-left: 0.25rem solid ${v('--blockquote-border-color', '#e95f59')};
        background: ${v('--blockquote-bg-color', '#fdefee')}; color: ${v('--blockquote-color', '#333333')};
        padding: 0.2rem 1rem; border-radius: 0 0.429rem 0.429rem 0; }
      .prose a { color: ${v('--a-color', '#d63200')}; }
      .prose hr { border: none; border-top: 0.1em solid ${v('--horizontal-divider-color', '#273849')}; margin: 1.6em 0; }
      .prose img { max-width: 100%; border-radius: 0.429rem; }
      .prose table { border-collapse: collapse; background: ${v('--table-bg-color', '#ffffff')}; }
      .prose th, .prose td { border: 0.1em solid ${v('--table-border-color', '#dfe2e5')};
        padding: 0.35rem 0.9rem; text-align: left; }
      .prose th { background: ${v('--table-header-bg-color', '#f8f8f8')}; }
      .prose tbody tr:nth-child(even) td { background: ${v('--table-n2-bg-color', '#f8f8f8')}; }
      @media print {
        @page { margin: 16mm; }
        .prose { max-width: none; padding: 0; }
      }
    `
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="prose">${bodyHtml}</div></body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:820px;height:1000px;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument!
    doc.open()
    doc.write(html)
    doc.close()

    await new Promise((r) => setTimeout(r, 300))
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    await new Promise((r) => setTimeout(r, 1000))
    iframe.remove()
  } catch {
    // 导出失败静默
  } finally {
    store.loading = false
  }
}
