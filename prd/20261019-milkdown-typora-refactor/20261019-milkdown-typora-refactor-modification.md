# 修改记录：Vditor → Milkdown (Crepe)，Typora 风格完整 v2.0

> 完成日期：20261020。范围见计划文档"范围修订（20261020）"：完整 v2.0 = Crepe 内核 + 预览页 UI + PROJECT.md 全量功能。
> 样式标准：`prd/style.md`（Drake 契约移植，见 §样式）。

## 依赖变更（package.json）

新增：`@milkdown/crepe@7.22.3`、`@milkdown/kit@7.22.3`、`marked@18.1.1`
移除：`vditor`
保留：`codemirror` 全家 + `vue-codemirror`（非 md 文件编辑）、`material-file-icons`（文件树图标）
脚本：删除 `prebuild`/`postinstall` 的 `scripts/patch-vditor.cjs` 调用；脚本文件与 `public/vditor/` 已删除；`vite.config.ts` 移除 vditor 拷贝与 `vditorPatch()` 插件。

## 新增文件

| 文件 | 职责 |
| --- | --- |
| `src/composables/useMilkdown.ts` | Crepe 生命周期、`lastSynced` 防回环双向同步（编辑器输入→markdownUpdated→setContent；外部变更→replaceAll）、阅读模式 setReadonly、selectionchange 跟踪光标行/列 + 打字机居中滚动 |
| `src/components/MilkdownEditor.vue` | Crepe 容器（scroll 包裹 + root），`:key="activeId"` 重建策略 |
| `src/components/SourceEditor.vue` | 源码模式：md 用 textarea 编辑原始 markdown，行/列跟踪 + 打字机滚动 |
| `src/components/EditorToolbar.vue` | 格式工具栏：撤销/重做 + H1–H3 + B/I/S/行内码 + 引用/列表/表格/代码块/水平线 + 保存/源码/阅读 |
| `src/components/MenuBar.vue` | 顶部菜单栏（文件/格式/视图），checked/disabled/快捷键提示，替代 AppBar |
| `src/components/StatusBar.vue` | 状态栏：文件名+脏标记、字数（CJK 按字/拉丁按词）、字符数、行/列、打字机开关 |
| `src/composables/useExportPdf.ts` | `crepe.getMarkdown()` → `marked` → 隐藏 iframe（内联主题化 CSS）→ print() |

## 删除文件

`VditorEditor.vue`、`useVditor.ts`、`AppBar.vue`、`scripts/patch-vditor.cjs`、`public/vditor/`。

## 重写/修改

- `src/shared/editor.ts`：`currentEditor` 改存 `Crepe` 实例；新增 `runFormat(kind)` 统一命令入口（`callCommand` 调 commonmark/gfm/history 命令；注意 `CmdKey` 不是 string，`Editor.action` 回调返回 boolean 需显式 break）。
- `src/stores/useMarkdownStore.ts`：删 `editorMode`/`contentTheme`/`codeTheme`；新增 `sourceMode`、`typewriter`（持久化）、`caret`、`toggleSourceMode`/`toggleTypewriter`/`setCaret`/`closeTabByPath`/`closeTabsUnderPath`。
- `src/types/index.ts`：删 `EditorMode`；Preferences 换 `sourceMode`+`typewriter`；新增 `CaretPosition`。
- `src/components/FileTree.vue`：搜索筛选（递归扫工作区、跳过 node_modules/.git 等、深度 8、200 条上限）、新建文件/文件夹（唯一命名 `未命名.md`→`未命名-2.md`，创建后直接进入行内重命名）、右键菜单（打开位置/重命名/删除）、删除走 `remove(recursive)` + `closeTabsUnderPath`。
- `src/components/FileTreeNode.vue`：双击行内重命名（Enter/Esc/blur，fs.rename + 同步已打开标签）、重命名态经 `renamingPath` prop 传导、文件树字号接 `--file-tree-text-size`。
- `src/components/FileTreeContextMenu.vue`：新增 重命名/删除 项，`isDirectory` 区分。
- `src/components/OutlinePane.vue`：跳转改查 `.milkdown-editor__scroll` 内 h1–h6 按文本匹配。
- `src/components/OutlineNode.vue`：大纲字号接 `--toc-text-size`。
- `src/composables/useFileOperation.ts`：新增 `closeActiveTab`、`exportPdf` 转发。
- `src/composables/useKeyboardShortcuts.ts`：Ctrl+P 直连 `exportPdf()`（去掉 querySelector hack）；**Ctrl+B/Ctrl+I 不再全局拦截**，交给 Milkdown 编辑器（Typora 键位加粗/斜体）；大纲切换改为菜单项无全局快捷键。其余（N/O/Shift+O/S/Shift+S/Shift+T/Shift+D/R/F5/Esc）不变。
- `src/App.vue`：新布局 MenuBar → body(FileTree + main(Tabs + editwrap(Outline + editorcol(Toolbar+编辑器)) + StatusBar))；阅读模式隐藏 Tabs/Toolbar/Outline/StatusBar + 右上浮层退出按钮；`:key` 重建仅按 activeId（阅读模式走 setReadonly）。
- `src/main.ts`：静态引入 `@milkdown/crepe/theme/common/style.css`（Crepe 基础样式）。
- `src/components/MenuBar.vue`（追加，20261020）：新增**帮助**菜单——`加载模板 (Ctrl+Shift+T)` 从文件菜单移入，新增 `关于 MarkdownView`（版本号取自 package.json，仓库地址 `https://github.com/5faith/MarkdownView`，弹窗内可一键复制地址）；`ConfirmDialog` 消息支持 `pre-line` 换行。
- `src/shared/editor.ts`（追加，20261020）：新增 `runFormat('task')` 任务列表（勾选框）切换——gfm 给 `list_item` 扩展可空 `checked` attr 但无现成命令，手动切事务：不在列表内先包无序列表，非任务列表→全部置未勾选，已是任务列表→还原普通列表（只处理最外层列表项，嵌套项跳过）。
- **关键修复（20261020）：`currentEditor` 从 `ref` 改为 `shallowRef`**。根因：Vue 深响应代理包裹 Crepe 实例后，带 `#private` 字段的 class getter（如 `readonly`）经 `Reflect.get` 转发时抛 `Cannot read from private field`，导致**所有**工具栏/格式菜单按钮点击即抛错、毫无反应。Playwright 实测（headless chromium + vite dev）验证修复：加粗/任务列表/菜单/勾选框点击全链路通过。契约：**存 class 实例（带私有字段）一律用 shallowRef，禁止深响应**。
- `stores/useMarkdownStore.ts`（追加）：首启模板标签名 `'Untitled'` → `'未命名.md'`——无扩展名会被 `activeIsMarkdown` 判为非 md 而走 CodeMirror。
- `TabContextMenu.vue`（追加）：补声明 `close-menu` emit，消除 Vue 警告。
- `EditorToolbar.vue` / `MenuBar.vue`（追加）：工具栏与格式菜单新增 `任务列表` 项。

## 样式（prd/style.md 契约移植）

`src/styles/global.scss` 按三层结构重写：
1. **变量层**：Drake §4 全量主题色契约（--drake-accent/--drake-highlight/--title-color/--blockquote-*/--code-block-*/--table-*/--item-hover-bg-color 等）+ §4.3 排版尺度（--monospace/--text-line-height/--p-spacing/--file-tree-text-size/--toc-text-size/--text-size）；深色主题补齐 §4.2 内置变量（--mermaid-theme: night 等）。
2. **派生别名层**：既有组件命名（--bg-primary/--text-primary/--border-color/--accent-color…）单向派生自 Drake 变量，组件无需改动。
3. **骨架层**：`html{font-size:var(--text-size)}` 全站 rem 缩放；`.milkdown` 内容骨架按 §5 分段（基线/代码块/行内码/引用 0.1em 竖条/链接/标题尺度 h1=2rem…/表格斑马纹/hr/mark/del/内容宽 1200px）。**未引入 frame.css/frame-dark.css**，Crepe 的 `--crepe-*` 变量在 global.scss 中直接映射到 Drake 变量（明暗随 data-theme 自动切换）。

## Rust / capabilities

无改动：`reveal_in_file_manager`/`get_file_args`/single-instance 保留；fs 写权限（mkdir/rename/remove/write）已被 `fs:write-all` + `fs:scope **` 覆盖。

## 已知取舍（shortcut）

- 源码模式下格式菜单/工具栏格式按钮禁用（格式命令只作用于 WYSIWYG）。
- 行/列在 WYSIWYG 下为近似值（顶层块序号 + 块内偏移），非源码行号。
- 文件树搜索为客户端递归扫描（深度 8、上限 200 条），超大工作区首扫有延迟。
- Ctrl+B 从"切换大纲"改为编辑器加粗（Typora 键位），大纲仍可经视图菜单/`Ctrl+B` 无冲突时菜单点击切换。
- Crepe 锁定 7.22.3（package.json 精确 caret），API 以该版本 .d.ts 为准。
- Mermaid 仍延后二期（与原计划一致）。

## 验证

- `pnpm build`（vue-tsc + vite）通过。
- 手测清单（需 `pnpm tauri dev`）：打开/保存/另存为、标签关闭确认、拖放文件+文件夹、模板、PDF 导出、阅读进出（Esc）、明暗切换、工具栏/菜单全部按钮、源码模式往返、打字机、文件树搜索/新建/重命名/删除、F5 重载、多窗口 `?workspace=`。
