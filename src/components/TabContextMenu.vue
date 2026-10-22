<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="tab-context-menu"
      :style="{ left: `${x}px`, top: `${y}px` }"
      @click.stop
      @mousedown.stop
    >
      <div class="tab-context-menu__item" @click="$emit('close')">
        Close
      </div>
      <div
        v-if="canCloseOthers"
        class="tab-context-menu__item"
        @click="$emit('close-others')"
      >
        Close Others
      </div>
      <div
        v-if="canCloseAll"
        class="tab-context-menu__item"
        @click="$emit('close-all')"
      >
        Close All
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  x: number
  y: number
  canCloseOthers: boolean
  canCloseAll: boolean
}>()

defineEmits<{
  'close': []
  'close-others': []
  'close-all': []
  'close-menu': []
}>()
</script>

<style scoped lang="scss">
.tab-context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 11.429rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.571rem;
  box-shadow: 0 0.571rem 2.143rem rgba(0, 0, 0, 0.18),
              0 2px 0.571rem rgba(0, 0, 0, 0.08);
  padding: 0.286rem 0;
  user-select: none;
  animation: menuFadeIn 0.1s ease;
}

@keyframes menuFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.tab-context-menu__item {
  padding: 0.571rem 1.143rem;
  font-size: 0.929rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.1s;

  &:hover {
    background: var(--bg-hover);
  }

  &:not(:last-child) {
    border-bottom: 1px solid var(--border-color);
  }
}
</style>
