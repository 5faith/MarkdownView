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
        class="file-tree-context-menu__item"
        :class="{ 'file-tree-context-menu__item--disabled': !canCreate }"
        @click="canCreate && $emit('create-file')"
      >
        新建文件
      </div>
      <div
        class="file-tree-context-menu__item"
        :class="{ 'file-tree-context-menu__item--disabled': !canCreate }"
        @click="canCreate && $emit('create-folder')"
      >
        新建文件夹
      </div>
      <div class="file-tree-context-menu__item" @click="$emit('copy')">
        复制
      </div>
      <div
        class="file-tree-context-menu__item"
        :class="{ 'file-tree-context-menu__item--disabled': !canRename }"
        @click="canRename && $emit('rename')"
      >
        重命名
      </div>
      <div
        class="file-tree-context-menu__item"
        :class="{ 'file-tree-context-menu__item--disabled': !canReveal }"
        @click="canReveal && $emit('open-file-location')"
      >
        在文件管理器中显示
      </div>
      <div class="file-tree-context-menu__item file-tree-context-menu__item--danger" @click="$emit('delete')">
        {{ selectionCount > 1 ? `删除 ${selectionCount} 项` : '删除' }}
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  x: number
  y: number
  isDirectory: boolean
  selectionCount: number
}>()

defineEmits<{
  'open-file-location': []
  'create-file': []
  'create-folder': []
  copy: []
  rename: []
  delete: []
}>()

// 一个菜单覆盖所有右键场景：用不了的项置灰而不是消失，菜单位置和尺寸不会跳
const canCreate = computed(() => props.isDirectory && props.selectionCount === 1)
const canRename = computed(() => props.selectionCount === 1)
const canReveal = computed(() => !props.isDirectory && props.selectionCount === 1)
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

  /* 当前选择用不了的项：置灰、不响应悬停 */
  &--disabled {
    color: var(--text-secondary);
    opacity: 0.45;
    cursor: default;

    &:hover {
      background: transparent;
    }
  }

  &--danger {
    color: #e53e3e;
  }
}
</style>
