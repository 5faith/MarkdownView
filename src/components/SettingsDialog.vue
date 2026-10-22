<template>
  <Teleport to="body">
    <div v-if="open" class="settings-overlay" @click.self="close">
      <div class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="settings-dialog__header">
          <span id="settings-title" class="settings-dialog__title">设置</span>
          <button ref="closeBtn" class="settings-dialog__close" aria-label="关闭" @click="close">×</button>
        </div>

        <div class="settings-dialog__body">
          <div class="settings-field">
            <span class="settings-field__label">字体</span>
            <div class="settings-field__options">
              <button
                v-for="item in FONT_OPTIONS"
                :key="item.value"
                class="settings-chip"
                :class="{ 'settings-chip--active': store.font === item.value }"
                :aria-pressed="store.font === item.value"
                @click="store.font = item.value"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div class="settings-field">
            <span class="settings-field__label">字号</span>
            <div class="settings-field__options">
              <button
                v-for="size in FONT_SIZES"
                :key="size"
                class="settings-chip"
                :class="{ 'settings-chip--active': store.fontSize === size }"
                :aria-pressed="store.fontSize === size"
                @click="store.fontSize = size"
              >
                {{ size }} px
              </button>
            </div>
          </div>

          <p class="settings-dialog__hint">字体同时作用于编辑器和界面，代码块始终使用等宽字体；字号会等比缩放整个界面。</p>
        </div>

        <div class="settings-dialog__footer">
          <button class="settings-dialog__btn" @click="reset">恢复默认</button>
          <button class="settings-dialog__btn settings-dialog__btn--primary" @click="close">完成</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMarkdownStore } from '../stores/useMarkdownStore'
import type { AppFont } from '../types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useMarkdownStore()
const closeBtn = ref<HTMLButtonElement | null>(null)

const FONT_OPTIONS: Array<{ value: AppFont; label: string }> = [
  { value: 'maple', label: 'Maple Mono（内置）' },
  { value: 'system', label: '系统界面' },
  { value: 'mono', label: '系统等宽' },
]
const FONT_SIZES = [13, 14, 15, 16]

function close() {
  emit('close')
}

function reset() {
  store.font = 'maple'
  store.fontSize = 14
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

// 打开时把焦点移进弹窗，Esc/回车都有落点
watch(
  () => props.open,
  (open) => {
    if (open) nextTick(() => closeBtn.value?.focus())
  },
)
</script>

<style scoped lang="scss">
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
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
  width: 32rem;
  max-width: 90vw;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.857rem;
  box-shadow: 0 1.429rem 4.286rem rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: slideIn 0.2s ease;
  user-select: none;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.429rem 1.714rem 0;
  }

  &__title {
    font-size: 1.214rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.714rem;
    height: 1.714rem;
    border: none;
    border-radius: 0.286rem;
    background: transparent;
    color: var(--text-secondary);
    font-size: 1.286rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 1.143rem;
    padding: 1.429rem 1.714rem 0;
  }

  &__hint {
    font-size: 0.929rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.714rem;
    padding: 1.714rem;
  }

  &__btn {
    min-width: 5.714rem;
    padding: 0.571rem 1.429rem;
    border: 1px solid var(--border-color);
    border-radius: 0.571rem;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font: inherit;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
      background: var(--bg-hover);
    }

    &--primary {
      background: var(--accent-color);
      border-color: var(--accent-color);
      color: #fff;

      &:hover {
        background: var(--drake-highlight);
        border-color: var(--drake-highlight);
      }
    }

    &:active {
      transform: scale(0.97);
    }
  }
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.571rem;

  &__label {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.571rem;
  }
}

.settings-chip {
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.571rem;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: var(--bg-hover);
  }

  &--active {
    border-color: var(--accent-color);
    background: var(--bg-hover);
    color: var(--accent-color);
    font-weight: 500;
  }
}
</style>
