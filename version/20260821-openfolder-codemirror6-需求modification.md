# 变更记录 — Open Folder & CodeMirror 6

## src-tauri/src/lib.rs

- 移除 `is_markdown_file()` 函数，不再限制只打开 Markdown 文件
- `get_file_args()` 改为直接返回所有文件参数，不做过滤
- 单实例模式下 `file-open` 事件也传递所有文件参数

## src-tauri/capabilities/default.json

- 新增 `"windows": ["main"]` 限定能力作用范围
- 新增 `"core:event:default"`、`"core:event:allow-listen"`、`"core:event:allow-emit"` 权限

## src/utils/fileType.ts (新增)

- `isMarkdownFile(name)` — 判断扩展名是否为 md/markdown/txt/mdown/mkd
- `getLanguageFromExtension(name)` — 映射扩展名到 CM6 语言包 key（支持 js/ts/vue/json/css/html/py/rs/xml/md 等）

## src/components/CodeMirrorEditor.vue (新增)

- 使用 `vue-codemirror` 的 `Codemirror` 组件
- Props: `modelValue`、`fileName`
- 根据 `fileName` 自动选择语言扩展（javascript/html/css/json/python/rust/xml/markdown）
- 根据 `store.theme` 条件应用 `oneDark` 暗色主题
- 使用 `basicSetup` 提供基础编辑器功能（行号、括号匹配、搜索等）

## src/components/FileTree.vue (新增)

- 读取工作区根目录，渲染 `FileTreeNode` 列表
- 点击文件通过 `readTextFile` 读取内容并调用 `store.setCurrentFile`

## src/components/FileTreeNode.vue (新增)

- 递归渲染文件/文件夹树节点
- 目录点击展开/折叠（懒加载 `readDir`）
- `getFileIcon()` 按扩展名返回对应 emoji 图标
- 过滤隐藏文件（以 `.` 开头）

## src/App.vue

- 导入 `CodeMirrorEditor`、`isMarkdownFile`
- 新增 `activeIsMarkdown` computed（基于 `store.activeFile?.name`）
- 新增 `cmContent` computed（get/set 桥接 `store.content` 与 CM6）
- `OutlinePane` 添加 `activeIsMarkdown` 条件，非 Markdown 文件时隐藏
- 编辑区域：`VditorEditor`（v-if）/ `CodeMirrorEditor`（v-else），均绑定 `:key="store.activeId"`

## src/components/AppBar.vue

- `.app-bar__dropdown-item` 添加 `white-space: nowrap` 防止 "Open Folder" 文本换行

## src/composables/useDragDrop.ts

- 导入共享 `isMarkdownFile` 替代本地定义的同名函数
- 移除文件内的 `isMarkdownFile()` 函数

## src/composables/useFileOperation.ts

- `openFile()` 对话框过滤器从 `['md', 'markdown', 'txt']` 改为 `['*']`

## src/composables/useVditor.ts

- Vditor 默认编辑模式从 `'sv'`（分屏）改为 `'ir'`（即时渲染）

## package.json / pnpm-lock.yaml

- 新增依赖：vue-codemirror、codemirror、@codemirror/lang-javascript、@codemirror/lang-html、@codemirror/lang-css、@codemirror/lang-json、@codemirror/lang-python、@codemirror/lang-rust、@codemirror/lang-xml、@codemirror/lang-markdown、@codemirror/theme-one-dark、@codemirror/view、@codemirror/state、@codemirror/language、@codemirror/autocomplete、@codemirror/search
