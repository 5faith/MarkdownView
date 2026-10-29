# MarkdownView 重构计划：Vditor → Milkdown (Crepe)，Typora 风格

> 需求：将编辑器从 Vditor 迁移到 Milkdown，页面风格参考 Typora，精简功能。
> 完成情况记录到同目录 `20261019-milkdown-typora-refactor-modification.md`。

## 范围修订（20261020，用户确认）

以 `20261019-milkdown-typora-refactor-preview.html` 为 UI 目标 + `prd/PROJECT.md` 为功能清单，做**完整 v2.0**：
原第 3 条"删除文件树/大纲/CodeMirror/监听/多窗口"**作废**，全部功能保留并补全预览页新增能力：

- 顶部菜单栏（文件/格式/视图，替代 AppBar 按钮堆）
- 文件树增强：搜索筛选、新建文件/文件夹、双击重命名、删除（右键菜单保留"在文件管理器中显示"）
- 大纲面板保留（跳转适配 Milkdown）
- 状态栏：文件名、字数、字符、行/列、打字机开关
- 源码模式（md 用纯 textarea 编辑原始 markdown，替代原 Vditor sv 分屏语义）
- 打字机滚动模式
- CodeMirror 非 md 文件编辑、文件监听/F5、多窗口 ?workspace=、拖放（文件+文件夹）全部保留

## 已确认决策

1. **编辑器路线**：`@milkdown/crepe` 全家桶（内置气泡工具栏、斜杠命令、块拖拽手柄、LaTeX/KaTeX、图片上传块、链接气泡、CodeMirror 代码高亮、占位符），顶部简略工具栏自写
2. **保留范围**（标签页版）：文件打开/保存/另存为、多标签页、拖放打开、加载模板、导出 PDF、阅读模式、明暗主题
3. ~~删除：文件树/工作区、大纲面板、CodeMirror 代码文件编辑、文件监听（F5）、多窗口（?workspace=）、编辑器三模式（Crepe 单一 WYSIWYG）~~（见上方范围修订）
4. **Mermaid**：延后二期（官方无支持，社区包 @milkdown/plugin-diagram 7.7.0 落后官方 7.22，暂不接）
5. 主题：明/暗两套为默认

## 依赖变更

新增：`@milkdown/crepe`、`@milkdown/kit`（command 调用需要）、`marked`（仅 PDF 导出时 markdown→HTML）
移除：`vditor`、`codemirror`、`vue-codemirror`、全部 `@codemirror/*`（9 个）、`material-file-icons`

锁定 Crepe minor 版本，避免上游 breaking。

## 代码变更

### 新增
- `src/composables/useMilkdown.ts` — 封装 Crepe 实例创建/销毁、markdownUpdated→store 同步、setReadonly（阅读模式）、明暗主题切换（动态 import `frame.css` / `frame-dark.css`）
- `src/components/MilkdownEditor.vue` — 编辑器容器（替代 VditorEditor.vue），沿用 `:key` 重建策略与 externalUpdate 防回环思路
- `src/components/EditorToolbar.vue` — Typora 风简略工具栏（见下）

### 重写
- `App.vue` — 布局变为 AppBar(工具栏) + FileTabs + 编辑器 + 空状态 + 拖放遮罩；删除 workspace 参数、多窗口相关启动逻辑
- `AppBar.vue` — 精简为：左侧文件名+脏标记；右侧 新建/打开/保存/另存为 + 导出PDF + 阅读模式 + 主题切换
- `useKeyboardShortcuts.ts` — 删 Ctrl+B(大纲)/Ctrl+Shift+O(文件夹)/F5(重载)；保留 Ctrl+N/O/S/Shift+S、Ctrl+P、Ctrl+Shift+T、Ctrl+Shift+D、Ctrl+R、Esc
- `useDragDrop.ts` — 仅保留文件拖放（文件夹分支删除）
- `useFileOperation.ts` — 删 openFolder/openFolderInNewWindow

### EditorToolbar 简略版按钮（一期）
撤销 重做 | H1 H2 H3 | 加粗 斜体 删除线 行内代码 | 引用 无序列表 有序列表 代码块 | 链接 水平线

实现：`crepe.editor.action(callCommand(...))` 调 kit 内置 command（toggleStrikethroughCommand、wrapInHeadingCommand、wrapInBlockquoteCommand、toggleInlineCodeCommand、insertHrCommand、updateLinkCommand 等）；撤销/重做用 undoCommand/redoCommand

### 功能保留的实现方式
- **模板加载**：store.loadDefaultContent/TEMPLATE.md 不变，`:key` 重建编辑器载入
- **导出 PDF**：`crepe.getMarkdown()` → `marked` 渲染 HTML → 隐藏 iframe + 内置打印 CSS → window.print()（替代现有 vditor iframe 方案，不依赖编辑器 DOM）
- **阅读模式**：`crepe.setReadonly(true)`，Esc/Ctrl+R 切换；顶栏按钮状态同步
- **明暗主题**：`data-theme` 机制不变；Crepe 用 frame（素净、接近 Typora）+ frame-dark 动态加载，内容 prose 样式在 global.scss 微调
- **图片**：Crepe ImageBlock 支持拖拽/粘贴，一期仅本地 base64 预览，不写盘、无上传配置

### 删除（文件级）
- 组件：FileTree.vue、FileTreeNode.vue、FileTreeContextMenu.vue、FileIcon.vue、OutlinePane.vue、OutlineNode.vue、CodeMirrorEditor.vue、VditorEditor.vue
- store 字段/方法：workspacePath、showFileTree、fileTreeWidth、fileTreeVersion、showOutline、outlineWidth、editorMode 及 setWorkspace/clearWorkspace/toggleFileTree/toggleOutline/setFileTreeWidth/setOutlineWidth/refreshFileTree/startFileWatch/stopFileWatch/reloadActiveFile
- 其它：shared/editor.ts 改存 crepe 实例；types/index.ts 清理 EditorMode 与 Preferences 字段；utils/preferences.ts 字段缩减
- Rust：lib.rs 删 reveal_in_file_manager 命令；capabilities 删对应权限（fs 读写权限保留读文件所需部分）
- 构建链：scripts/patch-vditor.cjs、vite.config.ts 的 vditorPatch 插件、package.json 中 postinstall/prebuild 的 vditor patch 调用、public/vditor/ 整目录

## 样式（Typora 风）

- 顶栏：细高度、无边框按钮、hover 浅色反馈；编辑区居中最大宽度（~800px）、舒适行距与段距
- 全部继续走 CSS 自定义属性明暗双主题；BEM 命名、仅 Flexbox、间距 4/8/12/16/24/28px

## 步骤

1. **依赖切换**：装 crepe/kit/marked，卸 vditor/codemirror 全家，删 patch 脚本与 vite 插件
2. **编辑器核心**：useMilkdown.ts + MilkdownEditor.vue 接入，内容同步与主题跑通
3. **工具栏与快捷键**：EditorToolbar + AppBar 重写 + useKeyboardShortcuts 更新
4. **三功能保留**：模板、PDF 导出（marked 方案）、阅读模式
5. **删减清理**：文件树/大纲/多窗口/监听/CodeMirror 相关文件、store 字段、Rust 命令、capabilities
6. **样式 Typora 化**：global.scss 明暗双主题调优
7. **验证与收尾**：build 过类型 + tauri dev 手测清单；写 modification 记录、更新 prd/PLAN.md 勾选

## 验收标准

- `pnpm build` 类型检查通过；仓库中 vditor 痕迹清零（依赖、脚本、public/vditor）
- 手测：打开/保存/另存为、多标签切换与未保存关闭确认、拖入 md 打开、模板加载、PDF 导出、阅读模式进出、明暗切换、工具栏全部按钮、数学公式与表格代码块渲染

## 风险

- Crepe 主题为成品 CSS，深度定制靠 CSS 变量覆盖；若明暗动态切换 css 顺序有问题则改为两主题类名前缀方案
- Crepe 迭代快，锁版本；API 以安装版本为准
- marked 新增 ~30KB（仅导出用，可接受）
- base64 大图会增加文档体积（二期再做落盘/上传）
