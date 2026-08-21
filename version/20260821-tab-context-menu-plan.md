# 需求计划 — Tab Context Menu (右键菜单)

## 目标

为标签页（FileTabs）添加右键上下文菜单，支持「关闭」、「关闭其它」、「关闭所有」操作。关闭时检查文件是否已保存，未保存则弹出确认对话框（与关闭软件时的提示一致）。

## 实现方案

### 新增组件

- `TabContextMenu.vue`：标签页右键上下文菜单组件
  - Props：`visible`、`x`、`y`、`canCloseOthers`、`canCloseAll`
  - Events：`close`、`close-others`、`close-all`、`close-menu`
  - 使用 Teleport 渲染到 body，固定定位
  - 样式复用项目 CSS 变量（`--bg-primary`、`--border-color` 等）

### 修改 Store

- `useMarkdownStore.ts`：
  - 新增 `closeOtherTabs(id)` — 关闭除指定标签外的所有标签
  - 新增 `closeAllTabs()` — 关闭所有标签

### 修改组件

- `FileTabs.vue`：
  - 标签项添加 `@contextmenu.prevent` 事件，记录鼠标位置和目标标签
  - 使用 `showConfirm` 替代 `window.confirm`，与关闭软件提示风格一致
  - 新增右键菜单处理函数：`handleMenuClose`、`handleMenuCloseOthers`、`handleMenuCloseAll`
  - 支持点击外部和 Escape 键关闭菜单

## 确认对话框文案

| 操作 | title | message | confirmLabel | cancelLabel |
|------|-------|---------|-------------|-------------|
| 关闭 | Unsaved Changes | "{filename}" has unsaved changes. Are you sure you want to close it? | Quit | Stay |
| 关闭其它 | Unsaved Changes | {names} has unsaved changes. Are you sure you want to close other tabs? | Quit | Stay |
| 关闭所有 | Unsaved Changes | You have unsaved files. Are you sure you want to close all tabs? | Quit | Stay |

## 边界情况

- 只有一个标签时，「关闭其它」不显示
- 没有标签时，「关闭所有」不显示
- 所有标签已保存时，直接执行操作，不弹出确认框
- 右键菜单打开后点击外部或按 Escape 关闭菜单
