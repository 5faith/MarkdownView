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
    <button class="editor-toolbar__btn" title="插入表格" @click="runFormat('table')">
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 10v10" /></svg>
    </button>
    <button class="editor-toolbar__btn" title="插入代码块" @click="runFormat('codeblock')">{ }</button>
    <button class="editor-toolbar__btn" title="隐藏细节（折叠块）" @click="runFormat('details')">
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="m9 12 3 3 3-3" /></svg>
    </button>
    <button class="editor-toolbar__btn" title="水平线" @click="runFormat('hr')">—</button>

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
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { runFormat } from '../shared/editor'
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
] as const

/** 工具栏在 overflow 容器里，下拉菜单用 fixed 定位，避免被裁切 */
function toggleListMenu() {
  if (!listMenu.value && listBtn.value) {
    const r = listBtn.value.getBoundingClientRect()
    popStyle.value = { top: `${r.bottom + 4}px`, left: `${r.left}px` }
  }
  listMenu.value = !listMenu.value
}

function pickList(kind: 'ul' | 'ol' | 'task') {
  listMenu.value = false
  runFormat(kind)
}

function onDocMousedown(e: MouseEvent) {
  if (!listMenu.value) return
  const t = e.target as Node
  if (listBtn.value?.contains(t) || listPop.value?.contains(t)) return
  listMenu.value = false
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') listMenu.value = false
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
