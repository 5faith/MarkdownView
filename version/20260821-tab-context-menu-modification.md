# 变更记录 — Tab Context Menu (右键菜单)

## src/stores/useMarkdownStore.ts

- 新增 `closeOtherTabs(id: string)` 函数：关闭除指定 id 外的所有标签页，将 activeId 设为目标标签
- 新增 `closeAllTabs()` 函数：清空所有标签页，activeId 设为空字符串
- 在 return 对象中导出 `closeOtherTabs` 和 `closeAllTabs`

## src/components/TabContextMenu.vue (新增)

- 标签页右键上下文菜单组件
- Props：`visible`（是否显示）、`x`/`y`（菜单定位坐标）、`canCloseOthers`（是否有其它标签可关闭）、`canCloseAll`（是否有标签可关闭）
- Events：`close`（关闭当前标签）、`close-others`（关闭其它标签）、`close-all`（关闭所有标签）、`close-menu`（关闭菜单）
- 使用 `<Teleport to="body">` 渲染，`position: fixed`，`z-index: 10000`
- 样式使用项目 CSS 变量，带淡入动画

## src/components/FileTabs.vue

- 导入 `showConfirm`（替代原来的 `window.confirm`）和 `TabContextMenu` 组件
- 新增 `ref` 状态：`menuVisible`、`menuX`、`menuY`、`menuTargetId`
- 标签项添加 `@contextmenu.prevent="onContextMenu($event, tab.id)"` 事件
- `handleClose(id)` 改用 `showConfirm` 弹出确认对话框，文案与关闭软件一致
- 新增 `onContextMenu(e, id)` — 记录右键位置和目标标签，显示菜单，注册 document 监听
- 新增 `closeMenu()` — 隐藏菜单，移除 document 监听
- 新增 `onOutsideClick(e)` — 点击菜单外部时关闭菜单
- 新增 `onEscape(e)` — Escape 键关闭菜单
- 新增 `handleMenuClose()` — 关闭当前标签（带未保存检查）
- 新增 `handleMenuCloseOthers()` — 关闭其它标签（检查其它标签是否有未保存内容）
- 新增 `handleMenuCloseAll()` — 关闭所有标签（检查是否有未保存内容）
- 模板末尾添加 `<TabContextMenu>` 组件渲染

## src/App.vue

- 移除 `.app` div 上的 `:data-theme="store.theme"` 绑定
- 新增 `watchEffect` 将 `store.theme` 同步到 `document.documentElement.dataset.theme`
- 原因：`TabContextMenu` 和 `ConfirmDialog` 通过 Teleport 渲染到 `body`，不在 `.app` 内，需要 theme 属性在 `html` 上才能继承正确的 CSS 变量
