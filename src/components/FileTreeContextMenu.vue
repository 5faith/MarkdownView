<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="file-tree-context-menu"
      :style="{ left: `${x}px`, top: `${y}px` }"
      @click.stop
      @mousedown.stop
    >
      <div
        v-if="!isDirectory"
        class="file-tree-context-menu__item"
        @click="$emit('open-file-location')"
      >
        在文件管理器中显示
      </div>
      <div class="file-tree-context-menu__item" @click="$emit('rename')">
        重命名
      </div>
      <div class="file-tree-context-menu__item file-tree-context-menu__item--danger" @click="$emit('delete')">
        删除
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  x: number
  y: number
  isDirectory: boolean
}>()

defineEmits<{
  'open-file-location': []
  rename: []
  delete: []
}>()
</script>

<style scoped lang="scss">
.file-tree-context-menu {
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

.file-tree-context-menu__item {
  padding: 0.5rem 1.143rem;
  font-size: 0.929rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;

  &:hover {
    background: var(--bg-hover);
  }

  &--danger {
    color: #e53e3e;
  }
}
</style>
