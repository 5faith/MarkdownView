<template>
  <div class="editor-toolbar" role="toolbar" aria-label="Markdown 格式工具栏">
    <button class="editor-toolbar__btn" title="撤销" @click="runFormat('undo')">
      <svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
    </button>
    <button class="editor-toolbar__btn" title="重做" @click="runFormat('redo')">
      <svg viewBox="0 0 24 24"><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>
    </button>
    <span class="editor-toolbar__sep" />
    <button class="editor-toolbar__btn editor-toolbar__btn--wide" title="标题 1" @click="runFormat('h1')">H1</button>
    <button class="editor-toolbar__btn editor-toolbar__btn--wide" title="标题 2" @click="runFormat('h2')">H2</button>
    <button class="editor-toolbar__btn editor-toolbar__btn--wide" title="标题 3" @click="runFormat('h3')">H3</button>
    <span class="editor-toolbar__sep" />
    <button class="editor-toolbar__btn" title="加粗 (Ctrl+B)" @click="runFormat('bold')"><b>B</b></button>
    <button class="editor-toolbar__btn" title="斜体 (Ctrl+I)" @click="runFormat('italic')"><i>I</i></button>
    <button class="editor-toolbar__btn" title="删除线" @click="runFormat('strike')"><s>S</s></button>
    <button class="editor-toolbar__btn" title="行内代码" @click="runFormat('code')"><code>&lt;/&gt;</code></button>
    <button class="editor-toolbar__btn" title="水平线" @click="runFormat('hr')">—</button>
    <span class="editor-toolbar__sep" />
    <button class="editor-toolbar__btn" title="引用" @click="runFormat('quote')">❝</button>
    <div class="editor-toolbar__menu">
      <button
        ref="listBtn"
        class="editor-toolbar__btn"
        :class="{ 'editor-toolbar__btn--active': listMenu }"
        title="列表"
        aria-haspopup="menu"
        :aria-expanded="listMenu"
        @click.stop="toggleListMenu"
      ><svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg></button>
      <div v-if="listMenu" ref="listPop" class="editor-toolbar__pop" role="menu" aria-label="列表" :style="popStyle">
        <button
          v-for="item in listItems"
          :key="item.kind"
          class="editor-toolbar__item"
          role="menuitem"
          @click="pickList(item.kind)"
        >
          <span class="editor-toolbar__item-icon" :class="`editor-toolbar__item-icon--${item.kind}`">
            <svg v-if="item.kind === 'task'" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m8 12 3 3 5-6" /></svg>
            <template v-else>{{ item.icon }}</template>
          </span>{{ item.label }}
        </button>
      </div>
    </div>
    <div class="editor-toolbar__menu">
      <button
        ref="chartBtn"
        class="editor-toolbar__btn"
        :class="{ 'editor-toolbar__btn--active': chartMenu }"
        title="图表"
        aria-haspopup="menu"
        :aria-expanded="chartMenu"
        @click.stop="toggleChartMenu"
      >
        <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
      </button>
      <div v-if="chartMenu" ref="chartPop" class="editor-toolbar__pop" role="menu" aria-label="图表" :style="chartStyle">
        <button
          v-for="item in MERMAID_TEMPLATES"
          :key="item.type"
          class="editor-toolbar__item"
          role="menuitem"
          @click="pickChart(item.code)"
        >{{ item.label }}</button>
      </div>
    </div>

    <button class="editor-toolbar__btn" title="插入表格" @click="runFormat('table')">
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 10v10" /></svg>
    </button>
    <button class="editor-toolbar__btn" title="插入代码块" @click="runFormat('codeblock')">{ }</button>
    <div class="editor-toolbar__menu">
      <button
        ref="insertBtn"
        class="editor-toolbar__btn"
        :class="{ 'editor-toolbar__btn--active': insertMenu }"
        title="插入"
        aria-haspopup="menu"
        :aria-expanded="insertMenu"
        @click.stop="toggleInsertMenu"
      >
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <div
        v-if="insertMenu"
        ref="insertPop"
        class="editor-toolbar__pop editor-toolbar__pop--insert"
        role="menu"
        aria-label="插入"
        :style="insertStyle"
      >
        <div class="editor-toolbar__group">表情符号</div>
        <div class="editor-toolbar__emoji">
          <button
            v-for="emoji in EMOJI_MENU"
            :key="emoji.name"
            class="editor-toolbar__emoji-item"
            :title="`:${emoji.name}:`"
            @click="pickInsert('emoji', { emojiName: emoji.name })"
          >{{ emoji.emoji }}</button>
        </div>
        <button class="editor-toolbar__more" @click="openEmojiSheet">查看完整表情表 ↗</button>
        <div class="editor-toolbar__group">告警块</div>
        <button
          v-for="alert in ALERT_OPTIONS"
          :key="alert.type"
          class="editor-toolbar__item"
          role="menuitem"
          @click="pickInsert('alert', { alertType: alert.type })"
        >{{ alert.title }}（{{ alert.label }}）</button>
        <div class="editor-toolbar__group">其他</div>
        <button class="editor-toolbar__item" role="menuitem" @click="pickInsert('details')">折叠内容</button>
        <button class="editor-toolbar__item" role="menuitem" @click="pickInsert('footnote')">脚注</button>
      </div>
    </div>
    <button class="editor-toolbar__btn" title="插入图片" @click="runFormat('image')">
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
    </button>
    <div class="editor-toolbar__menu">
      <button
        ref="linkBtn"
        class="editor-toolbar__btn"
        :class="{ 'editor-toolbar__btn--active': linkMenu }"
        title="链接"
        aria-haspopup="menu"
        :aria-expanded="linkMenu"
        @click.stop="toggleLinkMenu"
      ><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg></button>
      <div v-if="linkMenu" ref="linkPop" class="editor-toolbar__pop editor-toolbar__pop--form" :style="linkPopStyle">
        <input
          ref="linkInputEl"
          v-model="linkHref"
          type="text"
          placeholder="https://…"
          spellcheck="false"
          @keydown.enter.prevent="confirmLink"
          @keydown.esc.stop.prevent="closeLinkMenu"
        />
        <button class="editor-toolbar__ok" @click="confirmLink">确定</button>
      </div>
    </div>

    <span v-if="store.sourceMode" class="editor-toolbar__flag">源码模式</span>
    <span class="editor-toolbar__flex" />
    <button class="editor-toolbar__btn" title="保存 (Ctrl+S)" @click="fileOps.saveFile()">
      <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></svg>
    </button>
    <button class="editor-toolbar__btn" :class="{ 'editor-toolbar__btn--active': store.sourceMode }" title="切换源码模式" @click="store.toggleSourceMode()">
      <svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></svg>
    </button>
    <button class="editor-toolbar__btn" :class="{ 'editor-toolbar__btn--active': store.readingMode }" :title="store.readingMode ? '退出阅读模式 (Esc)' : '阅读模式 (Ctrl+R)'" @click="store.toggleReadingMode()">
      <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { runFormat } from '../shared/editor'
import type { FormatKind, FormatPayload } from '../shared/editor'
import { EMOJI_MENU } from '../shared/milkdown/emoji'
import { ALERT_OPTIONS } from '../shared/milkdown/alert'
import { MERMAID_TEMPLATES } from '../shared/milkdown/mermaid'
import { EMOJI_SHEET_URL, openExternal } from '../shared/openExternal'
import { useFileOperation } from '../composables/useFileOperation'

const store = useMarkdownStore()
const fileOps = useFileOperation()

const listMenu = ref(false)
const listBtn = ref<HTMLElement | null>(null)
const listPop = ref<HTMLElement | null>(null)
const popStyle = ref({ top: '0px', left: '0px' })
const listItems = [
  { kind: 'ul', icon: '•', label: '无序列表' },
  { kind: 'ol', icon: '1.', label: '有序列表' },
  { kind: 'task', icon: '', label: '任务列表' },
  { kind: 'deflist', icon: '::', label: '定义列表' },
] as const

/** 弹层定位：锚点按钮下方；打开后量实际尺寸，超出视口右缘时整体左移夹紧 */
function placePop(btn: HTMLElement, style: Ref<{ top: string; left: string }>, getPop: () => HTMLElement | null) {
  const r = btn.getBoundingClientRect()
  style.value = { top: `${r.bottom + 4}px`, left: `${r.left}px` }
  nextTick(() => {
    const pr = getPop()?.getBoundingClientRect()
    if (!pr) return
    const over = pr.right - (window.innerWidth - 8)
    if (over > 0) {
      style.value = { ...style.value, left: `${Math.max(8, r.left - over)}px` }
    }
  })
}

/** 工具栏在 overflow 容器里，下拉菜单用 fixed 定位，避免被裁切 */
function toggleListMenu() {
  listMenu.value = !listMenu.value
  // 先置状态再定位：placePop 的 nextTick 要链在本次渲染 flush 之后才能量到弹层尺寸
  if (listMenu.value && listBtn.value) {
    placePop(listBtn.value, popStyle, () => listPop.value)
  }
}

function pickList(kind: 'ul' | 'ol' | 'task' | 'deflist') {
  listMenu.value = false
  runFormat(kind)
}

// ── 插入弹层：表情 / 告警块 / 折叠内容 / 脚注 ──
const insertMenu = ref(false)
const insertBtn = ref<HTMLElement | null>(null)
const insertPop = ref<HTMLElement | null>(null)
const insertStyle = ref({ top: '0px', left: '0px' })

function toggleInsertMenu() {
  insertMenu.value = !insertMenu.value
  if (insertMenu.value && insertBtn.value) {
    placePop(insertBtn.value, insertStyle, () => insertPop.value)
  }
}

function pickInsert(kind: FormatKind, payload?: FormatPayload) {
  insertMenu.value = false
  runFormat(kind, payload)
}

function openEmojiSheet() {
  insertMenu.value = false
  void openExternal(EMOJI_SHEET_URL)
}

// ── 图表弹层：Mermaid 图表骨架 ──
const chartMenu = ref(false)
const chartBtn = ref<HTMLElement | null>(null)
const chartPop = ref<HTMLElement | null>(null)
const chartStyle = ref({ top: '0px', left: '0px' })

function toggleChartMenu() {
  chartMenu.value = !chartMenu.value
  if (chartMenu.value && chartBtn.value) {
    placePop(chartBtn.value, chartStyle, () => chartPop.value)
  }
}

function pickChart(code: string) {
  chartMenu.value = false
  runFormat('mermaid', { mermaidCode: code })
}

// ── 链接弹层：输入 URL 后包链接 ──
const linkMenu = ref(false)
const linkBtn = ref<HTMLElement | null>(null)
const linkPop = ref<HTMLElement | null>(null)
const linkInputEl = ref<HTMLInputElement | null>(null)
const linkPopStyle = ref({ top: '0px', left: '0px' })
const linkHref = ref('')

function toggleLinkMenu() {
  linkMenu.value = !linkMenu.value
  if (linkMenu.value && linkBtn.value) {
    placePop(linkBtn.value, linkPopStyle, () => linkPop.value)
    nextTick(() => linkInputEl.value?.focus())
  }
}

function closeLinkMenu() {
  linkMenu.value = false
  linkHref.value = ''
}

function confirmLink() {
  const href = linkHref.value.trim()
  if (!href) return
  runFormat('link', { href })
  closeLinkMenu()
}

function onDocMousedown(e: MouseEvent) {
  const t = e.target as Node
  if (listMenu.value && !listBtn.value?.contains(t) && !listPop.value?.contains(t)) listMenu.value = false
  if (linkMenu.value && !linkBtn.value?.contains(t) && !linkPop.value?.contains(t)) closeLinkMenu()
  if (insertMenu.value && !insertBtn.value?.contains(t) && !insertPop.value?.contains(t)) insertMenu.value = false
  if (chartMenu.value && !chartBtn.value?.contains(t) && !chartPop.value?.contains(t)) chartMenu.value = false
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    listMenu.value = false
    insertMenu.value = false
    chartMenu.value = false
    closeLinkMenu()
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onDocMousedown, true)
  document.addEventListener('keydown', onDocKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMousedown, true)
  document.removeEventListener('keydown', onDocKeydown)
})
</script>

<style scoped lang="scss">
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0.286rem 0.714rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  overflow-x: auto;
  flex-shrink: 0;
  user-select: none;

  &::-webkit-scrollbar {
    height: 0;
  }

  &__btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.429rem;
    border: none;
    border-radius: 0.429rem;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.929rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    &--active {
      color: var(--accent-color);
      background: var(--bg-active);
    }

    svg {
      width: 1.071rem;
      height: 1.071rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    code {
      font-family: var(--font-mono);
      font-size: 0.786rem;
    }
  }

  &__sep {
    width: 1px;
    height: 1.143rem;
    background: var(--border-color);
    margin: 0 0.429rem;
    flex-shrink: 0;
  }

  &__menu {
    position: relative;
    flex-shrink: 0;
  }

  &__pop {
    position: fixed;
    min-width: 8.571rem;
    padding: 0.286rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.571rem;
    box-shadow: 0 0.571rem 1.714rem rgba(0, 0, 0, 0.16);
    z-index: 1000;

    &--form {
      display: flex;
      align-items: center;
      gap: 0.429rem;
      padding: 0.429rem;
      /* 窄窗口时整体不超过视口，输入框收缩而不是把确定按钮挤出屏 */
      max-width: calc(100vw - 1rem);
      input {
        flex: 1 1 auto;
        width: 13rem;
        min-width: 5rem;
        height: 1.857rem;
        padding: 0 0.571rem;
        border: 1px solid var(--border-color);
        border-radius: 0.429rem;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font: inherit;
        font-size: 0.857rem;
        outline: none;
        transition: border-color 0.12s;

        &:focus {
          border-color: var(--accent-color);
        }

        &::placeholder {
          color: var(--text-secondary);
        }
      }
    }

    &--insert {
      width: 15.714rem;
      max-height: 22rem;
      overflow-y: auto;
    }
  }

  &__group {
    padding: 0.429rem 0.571rem 0.214rem;
    color: var(--text-secondary);
    font-size: 0.786rem;
    user-select: none;
  }

  &__emoji {
    display: flex;
    flex-wrap: wrap;
    gap: 0.143rem;
    padding: 0 0.286rem 0.286rem;
  }

  &__emoji-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.857rem;
    height: 1.857rem;
    border: none;
    border-radius: 0.357rem;
    background: transparent;
    font-size: 1.143rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: var(--bg-hover);
    }
  }

  &__more {
    width: 100%;
    margin-top: 0.143rem;
    padding: 0.357rem 0.571rem;
    border: none;
    border-top: 1px solid var(--border-color);
    border-radius: 0;
    background: transparent;
    color: var(--a-color);
    font: inherit;
    font-size: 0.821rem;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: var(--bg-hover);
    }
  }

  &__ok {
    flex: none;
    height: 1.857rem;
    padding: 0 0.714rem;
    border: none;
    border-radius: 0.429rem;
    background: var(--accent-color);
    color: #fff;
    font: inherit;
    font-size: 0.857rem;
    cursor: pointer;
    transition: background 0.12s;

    &:hover {
      background: var(--drake-highlight);
    }
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 0.571rem;
    width: 100%;
    padding: 0.429rem 0.571rem;
    border: none;
    border-radius: 0.429rem;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 0.929rem;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;

    &:hover {
      background: var(--bg-hover);
    }
  }

  &__item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.143rem;
    color: var(--text-secondary);
    font-size: 0.786rem;
    line-height: 1;
    text-align: center;

    // 圆点字符本身偏小，回退到菜单字号；数字「1.」保持小一号
    &--ul {
      font-size: 0.929rem;
    }

    svg {
      width: 0.929rem;
      height: 0.929rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  }

  &__flag {
    font-size: 0.786rem;
    color: var(--accent-color);
    background: var(--bg-hover);
    padding: 2px 0.643rem;
    border-radius: 7.071rem;
    white-space: nowrap;
  }

  &__flex {
    flex: 1;
  }
}
</style>
