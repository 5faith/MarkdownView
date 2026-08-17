import { useMarkdownStore } from '../stores/useMarkdownStore'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

function getPreviewHtml(): string | null {
  const el = document.querySelector('#vditor-editor')
  if (!el) return null

  const preview = el.querySelector('.vditor-preview')
  if (preview) {
    const clone = preview.cloneNode(true) as HTMLElement
    clone.querySelectorAll('.vditor-preview__action, .vditor-counter, [class*=" vditor-control"]')
      .forEach((e) => e.remove())
    const html = clone.innerHTML.trim()
    if (html) return html
  }

  const ir = el.querySelector('.vditor-ir')
  if (ir) return ir.innerHTML

  const sv = el.querySelector('.vditor-sv')
  if (sv) return sv.innerHTML

  return null
}

function buildContainerStyle(): string {
  return `
    position: fixed; left: -9999px; top: 0;
    width: 794px; background: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px; line-height: 1.8; color: #1a1a1a; padding: 48px 56px;
  `
}

function buildContentStyle(): string {
  return `
    h1 { font-size: 26px; font-weight: 700; margin: 1.2em 0 0.6em; color: #111; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }
    h2 { font-size: 22px; font-weight: 600; margin: 1em 0 0.5em; color: #1a1a1a; border-bottom: 1px solid #eee; padding-bottom: 6px; }
    h3 { font-size: 18px; font-weight: 600; margin: 0.8em 0 0.4em; color: #222; }
    h4 { font-size: 16px; font-weight: 600; margin: 0.6em 0 0.3em; color: #333; }
    h5 { font-size: 14px; font-weight: 600; margin: 0.5em 0 0.3em; color: #444; }
    h6 { font-size: 14px; font-weight: 600; margin: 0.5em 0 0.3em; color: #555; }
    p { margin: 0.6em 0; }
    a { color: #3b82f6; text-decoration: none; }
    strong { font-weight: 600; }
    pre {
      background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px;
      padding: 14px 16px; overflow-x: auto; font-size: 13px; line-height: 1.5; margin: 1em 0;
    }
    pre code { background: transparent; padding: 0; border-radius: 0; font-size: inherit; color: #24292e; }
    code {
      background: #f0f2f5; padding: 2px 6px; border-radius: 4px;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.9em; color: #e83e8c;
    }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 13px; }
    th, td { border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    tr:nth-child(even) { background: #f9fafb; }
    blockquote {
      border-left: 4px solid #3b82f6; margin: 1em 0; padding: 0.6em 1em;
      color: #4b5563; background: #f0f7ff; border-radius: 0 4px 4px 0;
    }
    blockquote p { margin: 0.3em 0; }
    ul, ol { margin: 0.5em 0; padding-left: 2em; }
    li { margin: 0.25em 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    del { color: #9ca3af; }
    .katex { font-size: 1.05em; }
    svg { max-width: 100%; }
    .vditor-attr { display: none; }
    .vditor-copy { display: none; }
    .vditor-ir__marker { display: none; }
    .vditor-linenumber { display: none; }
    .vditor-preview__action { display: none; }
  `
}

export function useExport() {
  const store = useMarkdownStore()

  async function exportPdf() {
    const html = getPreviewHtml()
    if (!html) return

    const container = document.createElement('div')
    container.setAttribute('style', buildContainerStyle())
    container.innerHTML = `<div style="${buildContentStyle()}">${html}</div>`
    document.body.appendChild(container)

    await new Promise((r) => setTimeout(r, 100))

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 794,
      windowWidth: 794,
    })

    document.body.removeChild(container)

    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const pdf = new jsPDF('p', 'mm', 'a4')

    let heightLeft = imgHeight
    let position = 0

    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft)
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    const baseName = store.fileName.replace(/\.[^.]+$/, '') || 'Untitled'

    const path = await save({
      defaultPath: `${baseName}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })

    if (path) {
      const buffer = pdf.output('arraybuffer')
      await writeFile(path, new Uint8Array(buffer))
    }
  }

  return { exportPdf }
}
