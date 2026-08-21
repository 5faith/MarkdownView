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
}>()
</script>

<style scoped lang="scss">
.tab-context-menu {
  position: fixed;
  z-index: 10000;
  min-width: 160px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18),
              0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 4px 0;
  user-select: none;
  animation: menuFadeIn 0.1s ease;
}

@keyframes menuFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.tab-context-menu__item {
  padding: 8px 16px;
  font-size: 13px;
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
