import { marked } from 'marked'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { currentEditor } from '../shared/editor'
import { isMarkdownFile } from '../utils/fileType'

/** Markdown → HTML → 隐藏 iframe 打印为 PDF（替代 vditor preview 方案） */
export async function exportPdf(): Promise<void> {
  const store = useMarkdownStore()
  const crepe = currentEditor.value
  if (!crepe || !store.activeFile || !isMarkdownFile(store.activeFile.name)) return

  store.loading = true
  try {
    const markdown = crepe.getMarkdown()
    const bodyHtml = await marked.parse(markdown)
    const dark = store.theme === 'dark'

    const css = `
      body { margin: 0; background: ${dark ? '#16181d' : '#ffffff'}; color: ${dark ? '#e6e4de' : '#10172b'}; }
      .prose { max-width: 780px; margin: 0 auto; padding: 40px 32px; line-height: 1.75; font-size: 15.5px;
        font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }
      .prose h1 { font-size: 1.9em; line-height: 1.25; }
      .prose h2 { font-size: 1.45em; border-bottom: 1px solid ${dark ? '#33373f' : '#ded6c8'}; padding-bottom: .3em; }
      .prose h3 { font-size: 1.18em; }
      .prose h4 { font-size: 1.02em; }
      .prose code { font-family: "SF Mono", Consolas, monospace; font-size: .86em;
        background: ${dark ? '#23262d' : '#f1ece2'}; border-radius: 5px; padding: .12em .4em; }
      .prose pre { background: ${dark ? '#1d2026' : '#f7f3ec'}; border: 1px solid ${dark ? '#33373f' : '#ded6c8'};
        border-radius: 10px; padding: 14px 16px; overflow-x: auto; }
      .prose pre code { background: transparent; padding: 0; line-height: 1.6; }
      .prose blockquote { margin: 1em 0; padding: .2em 1em; border-left: 3px solid ${dark ? '#7aa2f7' : '#3b82f6'};
        color: ${dark ? '#9aa1ad' : '#5d6680'}; background: ${dark ? '#1d2026' : '#f7f3ec'}; border-radius: 0 8px 8px 0; }
      .prose img { max-width: 100%; }
      .prose table { border-collapse: collapse; margin: 1em 0; }
      .prose table, .prose th, .prose td { border: 1px solid ${dark ? '#33373f' : '#ded6c8'}; }
      .prose th, .prose td { padding: 6px 14px; font-size: .92em; text-align: left; }
      .prose th { background: ${dark ? '#1d2026' : '#f7f3ec'}; }
      .prose hr { border: none; border-top: 1px solid ${dark ? '#33373f' : '#ded6c8'}; margin: 2em 0; }
      .prose a { color: ${dark ? '#7aa2f7' : '#3b82f6'}; }
      @media print {
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
