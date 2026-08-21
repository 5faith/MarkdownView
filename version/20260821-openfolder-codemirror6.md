# Open Folder & CodeMirror 6 Integration

## 需求概述

1. 支持打开任意文件夹浏览项目文件结构
2. 支持 CodeMirror 6 编辑非 Markdown 文件
3. Markdown 文件 (.md, .markdown, .txt, .mdown, .mkd) 使用 Vditor 打开
4. 其他文本文件使用 CodeMirror 6 打开，支持语法高亮和自动语言检测

## 涉及模块

- Tauri Rust 后端：文件参数处理、权限配置
- Vue 前端：编辑器切换逻辑、文件树组件、文件类型工具
- 依赖：vue-codemirror、codemirror 及语言包

## 设计方案

### 文件类型判断

- 提取共享 `isMarkdownFile()` 到 `src/utils/fileType.ts`
- 新增 `getLanguageFromExtension()` 映射扩展名到 CM6 语言包

### 编辑器切换

- `App.vue` 中根据 `activeIsMarkdown` computed 切换 Vditor / CodeMirrorEditor
- CM6 编辑器使用 `v-model` 双向绑定，通过 `cmContent` computed 桥接 store.content
- Key 属性绑定 `store.activeId`，切换 tab 时自动重建编辑器

### 文件树

- 新增 `FileTree.vue` + `FileTreeNode.vue` 组件
- 支持文件夹展开/折叠，点击文件自动打开编辑

### 权限

- Tauri capabilities 新增 `core:event:default`、`core:event:allow-listen`、`core:event:allow-emit`
- 文件对话框过滤器从 markdown-only 改为 `*`（所有文件）

## 变更文件清单

### 新增
- `src/utils/fileType.ts` — 文件类型工具函数
- `src/components/CodeMirrorEditor.vue` — CM6 编辑器组件
- `src/components/FileTree.vue` — 文件树组件
- `src/components/FileTreeNode.vue` — 文件树节点组件

### 修改
- `src/App.vue` — 编辑器条件渲染、outline 隐藏逻辑
- `src/components/AppBar.vue` — dropdown 样式修复
- `src/composables/useDragDrop.ts` — 使用共享 isMarkdownFile
- `src/composables/useFileOperation.ts` — 对话框过滤器改为全部文件
- `src/composables/useVditor.ts` — 默认模式改为 IR
- `src-tauri/src/lib.rs` — 移除 markdown-only 文件过滤
- `src-tauri/capabilities/default.json` — 新增 event 权限
- `package.json` — 新增 CM6 依赖
