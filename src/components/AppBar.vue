<template>
  <div class="app-bar">
    <div class="app-bar__left">
      <span class="app-bar__logo">M</span>
      <span class="app-bar__title">
        {{ store.fileName }}{{ store.isSaved ? '' : ' *' }}
      </span>
    </div>

    <div class="app-bar__right">
      <button class="app-bar__btn" @click="store.loadDefaultContent" title="Load template">
        <span>ℹ</span>
      </button>
      <button class="app-bar__btn" @click="fileOps.newFile" title="New">
        <span>📄</span>
      </button>
      <button class="app-bar__btn" @click="fileOps.openFile" title="Open">
        <span>📂</span>
      </button>
      <button class="app-bar__btn" @click="fileOps.saveFile" title="Save">
        <span>💾</span>
      </button>
      <button class="app-bar__btn" @click="fileOps.saveFileAs" title="Save As">
        <span>📋</span>
      </button>
      <button class="app-bar__btn" @click="handleExportPdf" title="Export PDF">
        <span>📤</span>
      </button>
      <button
        class="app-bar__btn"
        :class="{ 'app-bar__btn--active': store.showOutline }"
        @click="store.toggleOutline"
        title="Toggle outline"
      >
        <span>☰</span>
      </button>
      <button class="app-bar__btn" @click="store.toggleTheme" :title="`Switch to ${store.theme === 'light' ? 'dark' : 'light'} mode`">
        <span>{{ store.theme === 'light' ? '🌙' : '☀️' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { useFileOperation } from '../composables/useFileOperation'
import { currentEditor } from '../shared/editor'

const store = useMarkdownStore()
const fileOps = useFileOperation()

async function handleExportPdf() {
  const editor = currentEditor.value
  if (!editor) return

  store.loading = true

  try {
    const markdown = editor.getValue()
    const cdn = '/vditor'

    const iframe = document.createElement('iframe')
    iframe.id = 'vditorExportIframe'
    iframe.style.cssText = 'position:fixed;left:-9999px;width:800px;height:600px;'
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument!
    doc.open()
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="${cdn}/dist/index.css"/>
  <style>
    @page { margin: 0; }
    @media print { body { padding: 0 !important; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div id="preview" style="width: 800px; margin: 0 auto; padding: 40px;"></div>
  <script src="${cdn}/dist/method.min.js"><\/script>
  <script>
    window.addEventListener("message", (e) => {
      if (!e.data) return;
      Vditor.preview(document.getElementById('preview'), e.data, {
        cdn: "${cdn}",
        markdown: { callout: {}, theme: "classic" },
        hljs: { style: "github" }
      });
      setTimeout(() => { window.print(); window.parent.postMessage('__pdfDone__', '*'); }, 3000);
    }, false);
  <\/script>
</body>
</html>`)
    doc.close()

    await new Promise<void>((resolve) => {
      const handler = (e: MessageEvent) => {
        if (e.data === '__pdfDone__') {
          window.removeEventListener('message', handler)
          resolve()
        }
      }
      window.addEventListener('message', handler)

      setTimeout(() => {
        iframe.contentWindow!.postMessage(markdown, '*')
      }, 200)
    })

    iframe.remove()
  } catch {
  } finally {
    store.loading = false
  }
}
</script>

<style scoped lang="scss">
.app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  user-select: none;
  -webkit-app-region: drag;

  &__left,
  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__logo {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background: var(--accent-color);
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__title {
    font-size: 13px;
    color: var(--text-primary);
    font-weight: 500;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.15s;
    -webkit-app-region: no-drag;

    &:hover {
      background: var(--bg-hover);
    }

    &--active {
      color: var(--accent-color);
      background: var(--bg-active);
    }
  }

  &__export {
    position: relative;
  }

  &__export-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    z-index: 1000;
    min-width: 120px;
  }

  &__export-menu-inner {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  &__export-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-primary);
    text-align: left;
    transition: background 0.15s;

    &:hover {
      background: var(--bg-hover);
    }
  }
}
</style>
