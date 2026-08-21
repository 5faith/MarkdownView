# 需求计划 — Material File Icons

## 目标

为文件树（FileTree）和标签页（FileTabs）添加材料风格的文件图标，替换原有的 emoji 图标方案。

## 实现方案

### 新增依赖

- `material-file-icons` (^2.4.0)：提供基于文件扩展名的 SVG 图标

### 新增组件

- `FileIcon.vue`：通用文件图标组件
  - Props：`name`（文件名）、`size`（图标尺寸，默认 16）
  - 使用 `getIcon(name).svg` 获取图标并渲染

### 修改组件

- `FileTreeNode.vue`：
  - 移除 `getFileIcon()` 函数（emoji 映射表）
  - 文件节点改用 `FileIcon` 组件
  - 目录节点保留原有 emoji（📂/📁）

- `FileTabs.vue`：
  - 标签页项新增 `FileIcon` 图标

### 样式调整

- `.tree-node__icon`：从 `font-size: 14px` 改为 `inline-flex` + 固定宽高
- 新增 `.file-tabs__icon`：`inline-flex` 容器样式

## 验证

- 文件树显示正确的材料风格图标
- 标签页显示正确的材料风格图标
- 主题切换时图标正常显示
