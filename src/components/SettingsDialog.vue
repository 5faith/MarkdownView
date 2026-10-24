<template>
  <Teleport to="body">
    <div v-if="open" class="settings-overlay" @click.self="close">
      <div
        ref="dialogEl"
        class="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabindex="-1"
      >
        <div class="settings-dialog__header">
          <span id="settings-title" class="settings-dialog__title">设置</span>
          <button class="settings-dialog__close" aria-label="关闭" @click="close">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </div>

        <div class="settings-dialog__body">
          <section class="settings-group">
            <h2 class="settings-group__title">外观</h2>

            <div class="settings-row">
              <div class="settings-row__copy">
                <span id="settings-theme-label" class="settings-row__label">主题</span>
                <span class="settings-row__desc">界面与编辑区的明暗配色</span>
              </div>
              <div class="settings-segmented" role="group" aria-labelledby="settings-theme-label">
                <button
                  v-for="item in THEME_OPTIONS"
                  :key="item.value"
                  type="button"
                  :aria-pressed="store.theme === item.value"
                  @click="store.theme = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div class="settings-row">
              <div class="settings-row__copy">
                <label class="settings-row__label" for="settings-font">字体</label>
                <span class="settings-row__desc">可输入搜索，界面与正文共用，代码块始终等宽</span>
              </div>
              <div class="settings-combo">
                <input
                  ref="fontInputEl"
                  v-model="fontQuery"
                  type="text"
                  role="combobox"
                  :aria-expanded="fontListOpen"
                  aria-label="字体"
                  placeholder="搜索字体…"
                  autocomplete="off"
                  @focus="showFontList"
                  @input="onFontInput"
                  @keydown.down.prevent="moveFontHighlight(1)"
                  @keydown.up.prevent="moveFontHighlight(-1)"
                  @keydown.enter.prevent="applyFontHighlight"
                  @keydown.esc.stop="closeFontList"
                />
                <svg viewBox="0 0 12 12" aria-hidden="true" @click="toggleFontList"><path d="M3 4.5 6 7.5 9 4.5" /></svg>
                <div v-if="fontListOpen" ref="fontListEl" class="settings-combo__list">
                  <div v-if="filteredFontOptions.length === 0" class="settings-combo__empty">无匹配字体</div>
                  <div
                    v-for="(opt, i) in filteredFontOptions"
                    :key="opt.value + i"
                    class="settings-combo__option"
                    :class="{
                      'settings-combo__option--active': i === fontHighlight,
                      'settings-combo__option--selected': opt.value === store.font,
                    }"
                    @mousedown.prevent="selectFont(opt)"
                    @mousemove="fontHighlight = i"
                  >{{ opt.label }}</div>
                </div>
              </div>
            </div>

            <div class="settings-row">
              <div class="settings-row__copy">
                <label class="settings-row__label" for="settings-size">字号</label>
                <span class="settings-row__desc">按比例缩放界面，12–20 px</span>
              </div>
              <div class="settings-select settings-select--size">
                <select id="settings-size" v-model.number="store.fontSize">
                  <option v-for="size in FONT_SIZES" :key="size" :value="size">{{ size }} px</option>
                </select>
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" /></svg>
              </div>
            </div>
          </section>

          <div class="settings-preview">
            <div class="settings-preview__head">
              <span class="settings-preview__label">实时预览</span>
              <span class="settings-preview__meta">{{ fontLabel }} · {{ store.fontSize }} px</span>
            </div>
            <div class="settings-preview__body">
              <p class="settings-preview__title">标题 Heading</p>
              <p class="settings-preview__text">字号等比缩放界面，<code>const n = 14</code> 始终等宽。</p>
            </div>
          </div>

          <section class="settings-group settings-group--editor">
            <h2 class="settings-group__title">编辑器</h2>
            <div class="settings-row">
              <div class="settings-row__copy">
                <label class="settings-row__label" for="settings-typewriter">打字机模式</label>
                <span class="settings-row__desc">输入时让当前行保持在视口中部</span>
              </div>
              <label class="settings-switch">
                <input id="settings-typewriter" v-model="store.typewriter" type="checkbox" />
                <span class="settings-switch__track" aria-hidden="true">
                  <span class="settings-switch__thumb" />
                </span>
              </label>
            </div>
          </section>

          <section class="settings-group settings-group--filetree">
            <h2 class="settings-group__title">文件树</h2>
            <div class="settings-row">
              <div class="settings-row__copy">
                <label class="settings-row__label" for="settings-search-debounce">搜索防抖</label>
                <span class="settings-row__desc">输入停顿后触发筛选的等待时间</span>
              </div>
              <div class="settings-select">
                <select id="settings-search-debounce" v-model.number="store.searchDebounceMs">
                  <option v-for="ms in SEARCH_DEBOUNCE_OPTIONS" :key="ms" :value="ms">{{ ms }} ms</option>
                </select>
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" /></svg>
              </div>
            </div>
            <div class="settings-row">
              <div class="settings-row__copy">
                <label class="settings-row__label" for="settings-search-interval">搜索间隔</label>
                <span class="settings-row__desc">两次搜索请求之间的最小间隔</span>
              </div>
              <div class="settings-select">
                <select id="settings-search-interval" v-model.number="store.searchIntervalMs">
                  <option v-for="ms in SEARCH_INTERVAL_OPTIONS" :key="ms" :value="ms">{{ ms }} ms</option>
                </select>
                <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" /></svg>
              </div>
            </div>
          </section>

          <section class="settings-group settings-group--storage">
            <h2 class="settings-group__title">存储</h2>
            <div class="settings-row">
              <div class="settings-row__copy">
                <span class="settings-row__label">数据目录</span>
                <span class="settings-row__desc">偏好设置与缓存所在位置，修改后重启应用生效</span>
                <span v-if="dataDir" class="settings-storage-path" :title="dataDir.path">
                  {{ dataDir.path }}<template v-if="dataDir.custom">（自定义）</template>
                </span>
                <span v-else class="settings-row__desc">读取中…</span>
              </div>
              <div class="settings-storage-actions">
                <button
                  type="button"
                  class="settings-mini-btn"
                  :disabled="dataDirBusy"
                  @click="changeDataDir"
                >修改…</button>
                <button
                  v-if="dataDir?.custom"
                  type="button"
                  class="settings-mini-btn"
                  :disabled="dataDirBusy"
                  @click="resetDataDir"
                >恢复默认</button>
              </div>
            </div>
          </section>

          <p class="settings-dialog__hint">字体同时作用于界面与编辑器，代码块始终等宽；选择会保存在本机。</p>
        </div>

        <div class="settings-dialog__footer">
          <button type="button" class="settings-dialog__btn settings-dialog__btn--ghost" @click="reset">恢复默认</button>
          <button type="button" class="settings-dialog__btn settings-dialog__btn--primary" @click="close">完成</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import { showConfirm } from '../composables/showConfirm'
import { DEFAULT_PREFERENCES } from '../types'
import type { AppTheme } from '../types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useMarkdownStore()
const dialogEl = ref<HTMLElement | null>(null)

interface DataDirInfo {
  path: string
  default_path: string
  custom: boolean
}

const dataDir = ref<DataDirInfo | null>(null)
const dataDirBusy = ref(false)

async function loadDataDir() {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    dataDir.value = await invoke<DataDirInfo>('get_data_dir')
  } catch {
    dataDir.value = null
  }
}

async function restartToApply() {
  const { relaunch } = await import('@tauri-apps/plugin-process')
  relaunch()
}

async function showDataDirError(text: string) {
  const { message } = await import('@tauri-apps/plugin-dialog')
  await message(text, { title: '数据目录', kind: 'error' })
}

async function changeDataDir() {
  if (dataDirBusy.value) return
  dataDirBusy.value = true
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const dir = await open({ directory: true, multiple: false, title: '选择数据目录' })
    if (typeof dir !== 'string' || dir === dataDir.value?.path) return
    const confirmed = await showConfirm({
      title: '修改数据目录',
      message: '重启应用后生效；未保存的修改会丢失，原目录的数据不会自动迁移。',
      confirmLabel: '重启应用',
      cancelLabel: '取消',
    })
    if (!confirmed) return
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('set_data_dir', { path: dir })
    await restartToApply()
  } catch (e) {
    await showDataDirError(String(e))
  } finally {
    dataDirBusy.value = false
  }
}

async function resetDataDir() {
  if (dataDirBusy.value) return
  dataDirBusy.value = true
  try {
    const confirmed = await showConfirm({
      title: '恢复默认数据目录',
      message: '将恢复为程序目录下的 data 文件夹，重启应用后生效。',
      confirmLabel: '重启应用',
      cancelLabel: '取消',
    })
    if (!confirmed) return
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('set_data_dir', { path: null })
    await restartToApply()
  } catch (e) {
    await showDataDirError(String(e))
  } finally {
    dataDirBusy.value = false
  }
}

const systemFonts = ref<string[]>([])

// 当前偏好值不在系统字体列表里（旧数据 / 已卸载字体）时补一个选项，避免下拉显示空白
const customFontMissing = computed(() => {
  const f = store.font
  return f !== '' && f !== 'mono' && !systemFonts.value.includes(f)
})

const fontLabel = computed(() => {
  if (store.font === '') return '系统默认'
  if (store.font === 'mono') return '系统等宽'
  return store.font
})

async function loadSystemFonts() {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    systemFonts.value = await invoke<string[]>('list_system_fonts')
  } catch {
    systemFonts.value = []
  }
}

// ── 字体可搜索下拉（combobox） ──
interface FontOption {
  value: string
  label: string
}
const FONT_SPECIAL_OPTIONS: FontOption[] = [
  { value: '', label: '系统默认' },
  { value: 'mono', label: '系统等宽' },
]

const fontInputEl = ref<HTMLInputElement | null>(null)
const fontListEl = ref<HTMLElement | null>(null)
const fontListOpen = ref(false)
const fontQuery = ref('')
const fontHighlight = ref(0)

const fontOptions = computed<FontOption[]>(() => {
  const list = [...FONT_SPECIAL_OPTIONS]
  if (customFontMissing.value) list.push({ value: store.font, label: store.font })
  for (const f of systemFonts.value) list.push({ value: f, label: f })
  return list
})

const filteredFontOptions = computed<FontOption[]>(() => {
  const q = fontQuery.value.trim().toLowerCase()
  if (!q) return fontOptions.value
  return fontOptions.value.filter((o) => o.label.toLowerCase().includes(q))
})

// 关闭时输入框显示当前选中项，打开时清空作为搜索词
watch([fontListOpen, () => store.font], () => {
  if (!fontListOpen.value) fontQuery.value = fontLabel.value
})

watch(fontHighlight, async () => {
  await nextTick()
  fontListEl.value?.querySelector('.settings-combo__option--active')?.scrollIntoView({ block: 'nearest' })
})

function showFontList() {
  fontQuery.value = ''
  fontHighlight.value = Math.max(
    0,
    fontOptions.value.findIndex((o) => o.value === store.font),
  )
  fontListOpen.value = true
}

/** 输入时若列表未开（如 Esc 关闭后继续打字）只需确保打开，不能清掉刚输入的搜索词 */
function onFontInput() {
  if (!fontListOpen.value) {
    fontHighlight.value = 0
    fontListOpen.value = true
  }
}

function toggleFontList() {
  fontInputEl.value?.focus()
  if (fontListOpen.value) closeFontList()
  else showFontList()
}

function closeFontList() {
  fontListOpen.value = false
}

function moveFontHighlight(delta: number) {
  if (!fontListOpen.value) {
    showFontList()
    return
  }
  const max = filteredFontOptions.value.length - 1
  if (max < 0) return
  fontHighlight.value = Math.min(max, Math.max(0, fontHighlight.value + delta))
}

function applyFontHighlight() {
  const opt = filteredFontOptions.value[fontHighlight.value]
  if (opt) selectFont(opt)
}

function selectFont(opt: FontOption) {
  store.font = opt.value
  closeFontList()
  fontInputEl.value?.blur()
}

// 点击下拉外部时收起
function onFontOutsideClick(e: MouseEvent) {
  const combo = e.target as HTMLElement | null
  if (fontListOpen.value && !combo?.closest('.settings-combo')) closeFontList()
}
const THEME_OPTIONS: Array<{ value: AppTheme; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]
const FONT_SIZES = [12, 13, 14, 15, 16, 17, 18, 19, 20]
const SEARCH_DEBOUNCE_OPTIONS = [100, 300, 500, 1000]
const SEARCH_INTERVAL_OPTIONS = [300, 800, 1500, 3000]

function close() {
  emit('close')
}

function reset() {
  store.theme = 'light'
  store.font = DEFAULT_PREFERENCES.font
  store.fontSize = 14
  store.typewriter = false
  store.searchDebounceMs = DEFAULT_PREFERENCES.searchDebounceMs
  store.searchIntervalMs = DEFAULT_PREFERENCES.searchIntervalMs
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) close()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('mousedown', onFontOutsideClick)
  fontQuery.value = fontLabel.value
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousedown', onFontOutsideClick)
})

// 打开时把焦点移进弹窗并读取数据目录信息，Esc 有落点且不抢关闭按钮的高亮
watch(
  () => props.open,
  (open) => {
    if (open) {
      nextTick(() => dialogEl.value?.focus())
      void loadDataDir()
      void loadSystemFonts()
    }
  },
)
</script>

<style scoped lang="scss">
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.45);
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-0.857rem) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.settings-dialog {
  display: flex;
  flex-direction: column;
  width: 38.571rem;
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 0.857rem;
  background: var(--bg-primary);
  box-shadow: 0 1.429rem 4.286rem rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: slideIn 0.2s ease;
  user-select: none;

  &:focus {
    outline: none;
  }

  &__header {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.143rem 1.143rem 0.571rem 1.571rem;
  }

  &__title {
    font-size: 1.143rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 0.429rem;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    svg {
      width: 1rem;
      height: 1rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linecap: round;
    }

    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    &:focus-visible {
      outline: 0.143rem solid var(--accent-color);
      outline-offset: 1px;
    }
  }

  &__body {
    min-height: 0;
    padding: 0.143rem 1.571rem 0.286rem;
    overflow-y: auto;
  }

  /* 供下拉弹层溢出行内容器显示（settings-body 可滚动，绝对定位弹层跟随内容滚动即可） */
  .settings-combo {
    position: relative;
  }

  &__hint {
    margin: 0.857rem 0 0.143rem;
    font-size: 0.821rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  &__footer {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.857rem;
    padding: 0.857rem 1.143rem 1rem 1.571rem;
    border-top: 1px solid var(--border-color);
  }

  &__btn {
    height: 2.286rem;
    padding: 0 1.286rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    font: inherit;
    font-size: 0.893rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.06s;

    &:active {
      transform: translateY(0.071rem);
    }

    &:focus-visible {
      outline: 0.143rem solid var(--accent-color);
      outline-offset: 1px;
    }

    &--ghost {
      height: 2.143rem;
      padding: 0 0.571rem;
      background: transparent;
      color: var(--text-secondary);

      &:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
    }

    &--primary {
      min-width: 5.571rem;
      background: var(--accent-color);
      color: #fff;

      &:hover {
        background: var(--drake-highlight);
      }
    }
  }
}

.settings-group {
  &__title {
    margin: 0.143rem 0;
    font-size: 0.786rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--text-secondary);
  }

  &--editor,
  &--filetree,
  &--storage {
    margin-top: 1.143rem;
  }
}

.settings-storage-path {
  font-family: var(--monospace);
  font-size: 0.786rem;
  line-height: 1.5;
  color: var(--text-secondary);
  word-break: break-all;
  user-select: text;
}

.settings-storage-actions {
  display: inline-flex;
  flex: none;
  gap: 0.429rem;
}

.settings-mini-btn {
  height: 1.857rem;
  padding: 0 0.857rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.857rem;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;

  &:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 0.143rem solid var(--accent-color);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.429rem;
  padding: 0.643rem 0;

  & + & {
    border-top: 1px solid var(--border-color);
  }

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 0.071rem;
    min-width: 0;
  }

  &__label {
    font-size: 0.929rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  &__desc {
    font-size: 0.821rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }
}

.settings-segmented {
  display: inline-flex;
  flex: none;
  gap: 0.143rem;
  padding: 0.143rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background: var(--bg-secondary);

  button {
    height: 1.857rem;
    padding: 0 0.857rem;
    border: 0;
    border-radius: 0.357rem;
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 0.857rem;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;

    &:hover {
      color: var(--text-primary);
    }

    &:focus-visible {
      outline: 0.143rem solid var(--accent-color);
      outline-offset: 1px;
    }

    &[aria-pressed='true'] {
      background: var(--bg-hover);
      color: var(--text-primary);
      font-weight: 600;
      box-shadow: inset 0 0 0 1px var(--accent-color);
    }
  }
}

.settings-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: none;

  select {
    -webkit-appearance: none;
    appearance: none;
    width: 15.429rem;
    height: 2.286rem;
    padding: 0 2rem 0 0.714rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.857rem;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;

    &:hover {
      background: var(--bg-hover);
    }

    &:focus-visible {
      outline: 0.143rem solid var(--accent-color);
      outline-offset: 1px;
    }

    /* 原生弹出层不跟随 color-scheme（WebView2），显式给 option 上色才能随主题 */
    option {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }
  }

  svg {
    position: absolute;
    right: 0.643rem;
    width: 0.786rem;
    height: 0.786rem;
    fill: none;
    stroke: var(--text-secondary);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }

  &--size select {
    width: 6.571rem;
  }
}

.settings-combo {
  position: relative;
  display: inline-flex;
  flex: none;
  width: 15.429rem;

  input {
    width: 100%;
    height: 2.286rem;
    padding: 0 2rem 0 0.714rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font: inherit;
    font-size: 0.857rem;
    outline: none;
    transition: background 0.12s, border-color 0.12s;

    &:hover {
      background: var(--bg-hover);
    }

    &:focus {
      border-color: var(--accent-color);
    }

    &::placeholder {
      color: var(--text-secondary);
    }
  }

  > svg {
    position: absolute;
    right: 0.643rem;
    top: 50%;
    transform: translateY(-50%);
    width: 0.786rem;
    height: 0.786rem;
    fill: none;
    stroke: var(--text-secondary);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: auto;
    cursor: pointer;
  }

  &__list {
    position: absolute;
    top: calc(100% + 0.286rem);
    left: 0;
    right: 0;
    z-index: 20;
    max-height: 14.286rem;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background: var(--bg-secondary);
    box-shadow: 0 0.571rem 1.714rem rgba(0, 0, 0, 0.2);
  }

  &__option {
    padding: 0.357rem 0.714rem;
    font-size: 0.857rem;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    transition: background 0.1s;

    &--active {
      background: var(--bg-hover);
    }

    &--selected {
      color: var(--accent-color);
      font-weight: 600;
    }
  }

  &__empty {
    padding: 0.5rem 0.714rem;
    font-size: 0.857rem;
    color: var(--text-secondary);
  }
}

.settings-preview {
  margin: 0.857rem 0 0.143rem;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 0.643rem;
  background: var(--bg-secondary);

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.857rem;
    padding: 0.5rem 0.857rem;
    border-bottom: 1px solid var(--border-color);
  }

  &__label {
    display: inline-flex;
    align-items: center;
    gap: 0.429rem;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    color: var(--text-secondary);

    &::before {
      content: '';
      width: 0.357rem;
      height: 0.357rem;
      border-radius: 50%;
      background: var(--accent-color);
    }
  }

  &__meta {
    overflow: hidden;
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.8;
  }

  &__body {
    padding: 0.857rem 1rem 0.929rem;
    line-height: 1.65;
  }

  &__title {
    margin: 0 0 0.214rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__text {
    margin: 0;
    color: var(--text-secondary);
  }

  code {
    padding: 0.071rem 0.286rem;
    border-radius: 0.286rem;
    background: var(--blockquote-bg-color);
    color: var(--drake-highlight);
    font-family: var(--monospace);
    font-size: 0.9rem;
    white-space: nowrap;
  }
}

.settings-switch {
  position: relative;
  display: inline-flex;
  flex: none;
  cursor: pointer;

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    opacity: 0;
  }

  &__track {
    position: relative;
    display: block;
    width: 2.571rem;
    height: 1.5rem;
    border-radius: 0.75rem;
    background: var(--border-color);
    transition: background 0.16s;
  }

  &__thumb {
    position: absolute;
    top: 0.143rem;
    left: 0.143rem;
    width: 1.214rem;
    height: 1.214rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0.071rem 0.143rem rgba(0, 0, 0, 0.25);
    transition: transform 0.16s ease;
  }

  input:checked + .settings-switch__track {
    background: var(--accent-color);
  }

  input:checked + .settings-switch__track .settings-switch__thumb {
    transform: translateX(1.071rem);
  }

  input:focus-visible + .settings-switch__track {
    outline: 2px solid var(--accent-color);
    outline-offset: 1px;
  }
}
</style>
