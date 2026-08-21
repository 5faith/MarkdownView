# 变更记录 — Material File Icons

## package.json

- 新增依赖：`material-file-icons` (^2.4.0)

## src/components/FileIcon.vue (新增)

- `FileIcon` 组件，接收 `name`（文件名）和可选 `size`（默认 16）
- 使用 `getIcon(name).svg` 从 `material-file-icons` 获取 SVG 图标
- 通过 `v-html` 渲染 SVG，CSS 限定容器尺寸

## src/components/FileTreeNode.vue

- 导入 `FileIcon` 组件
- 移除原有 `getFileIcon()` 函数（基于扩展名的 emoji 映射表）
- 文件图标从 `<span>{{ getFileIcon(name) }}</span>` 改为 `<FileIcon :name="name" :size="14" />`
- 目录图标保留原有 emoji（📂/📁）
- `.tree-node__icon` 样式从 `font-size: 14px` 改为 `inline-flex` + 固定宽高 14px

## src/components/FileTabs.vue

- 导入 `FileIcon` 组件
- 标签页项新增 `<FileIcon :name="tab.name" :size="14" />` 图标
- 新增 `.file-tabs__icon` 样式：`inline-flex` 容器

## public/material-file-icons-demo.html (新增)

- 材料文件图标演示页面，展示所有可用图标、文件树和标签页效果
