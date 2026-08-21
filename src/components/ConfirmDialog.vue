<template>
  <Teleport to="body">
    <div class="confirm-overlay" @click.self="onCancel">
      <div class="confirm-dialog">
        <div class="confirm-dialog__header">
          <span class="confirm-dialog__icon">⚠</span>
          <span class="confirm-dialog__title">{{ title }}</span>
        </div>
        <div class="confirm-dialog__body">
          <p class="confirm-dialog__message">{{ message }}</p>
        </div>
        <div class="confirm-dialog__footer">
          <button class="confirm-dialog__btn confirm-dialog__btn--cancel" @click="onCancel">
            {{ cancelLabel }}
          </button>
          <button class="confirm-dialog__btn confirm-dialog__btn--confirm" @click="onConfirm">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
}
</script>

<style scoped lang="scss">
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.confirm-dialog {
  min-width: 400px;
  max-width: 480px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
  animation: slideIn 0.2s ease;
  user-select: none;

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 24px 28px 0;
  }

  &__icon {
    font-size: 28px;
    line-height: 1;
  }

  &__title {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__body {
    padding: 16px 28px 0;
  }

  &__message {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 24px 28px;
  }

  &__btn {
    min-width: 80px;
    padding: 8px 20px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;

    &--cancel {
      background: var(--bg-secondary);
      color: var(--text-primary);

      &:hover {
        background: var(--bg-hover);
      }
    }

    &--confirm {
      background: #e53e3e;
      color: #fff;
      border-color: #e53e3e;

      &:hover {
        background: #c53030;
        border-color: #c53030;
      }
    }

    &:active {
      transform: scale(0.97);
    }
  }
}
</style>
