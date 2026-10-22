# AGENTS.md

Tauri 2（Rust）+ Vue 3 `<script setup>` + Pinia + Milkdown Crepe 的桌面 Markdown 编辑器。包管理器 **pnpm**。代码注释与文档用中文。

## 命令

- `pnpm tauri dev` — 唯一能跑全功能的开发方式。单独 `pnpm dev` 只是 Vite，页面能开但所有 `@tauri-apps/*` 调用都会失败。
- `pnpm build` — 唯一的类型检查（`vue-tsc -b && vite build`）。仓库**没有** lint / test 脚本，也没有测试框架；改动靠 build + `pnpm tauri dev` 手动验证。
- `pnpm tauri build` — 打安装包（`beforeBuildCommand` 会再跑一次 `pnpm build`）。
- Vite 端口 14200 是 `strictPort`，改端口必须同步 `src-tauri/tauri.conf.json` 的 `devUrl`。

## 容易踩的坑

- `vue-tsc -b` 没有 `outDir`/`noEmit`，会在 `src/` 里就地生成同名 `.js` / `.vue.js`。这些是产物：不要编辑、不要提交（`.gitignore` 已忽略）；`predev` 与 `pnpm clean` 会删掉它们。
- 新增任何 `@tauri-apps/plugin-*` 调用，必须先在 `src-tauri/capabilities/default.json` 加权限（`fs:scope` 已放行 `**`，但 API 权限仍需逐项声明）。
- JS 侧 Tauri API 一律在函数内 `await import('@tauri-apps/plugin-fs')` 动态导入，不要顶层静态导入。
- 版本号三处必须同时改：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`。
- `README.md` 已过时（还写 Vditor），编辑器实际是 Milkdown Crepe 7.x。

## 编辑器同步契约（改编辑器、工具栏、菜单前先读）

细节见 `.operator/specs/milkdown-v2.md`。

- `src/composables/useMilkdown.ts` 用 `lastSynced` 防回环：编辑器 `markdownUpdated` → `store.setContent`，外部 `store.content` 变化 → `replaceAll`。两条路径都要更新 `lastSynced`，漏一处就会回环或丢字。
- 所有格式命令走 `src/shared/editor.ts` 的 `runFormat(kind)`：它同时实现 WYSIWYG（Crepe 命令）与源码模式（直接改 textarea 文本 + 前缀 toggle）。`EditorToolbar`、`MenuBar`、快捷键都只调它，不要直接发 Crepe 命令。
- `currentEditor` 必须保持 `shallowRef`：Vue 深代理会让 Crepe 类的 `#private` 字段抛错。
- `MilkdownEditor` 由 `:key="${activeId}-${theme}"` 驱动整实例重建；切文件/切主题不是增量更新。代码块高亮主题通过 `Crepe.Feature.CodeMirror` 的 `featureConfigs` 传入。
- `store.content` 是 `activeFile.content` 的 computed；写入一律 `store.setContent()`（同时置 `saved = false`）。`watchEffect` 会监听 `activeFile` 并在标签切换时从磁盘重读。

## 结构

- `src/App.vue` — 布局与启动流程：`?workspace=` 参数、`get_file_args`、`file-open` 事件（单实例转发）、拖放、关闭确认。
- `src/stores/useMarkdownStore.ts` — 唯一 Pinia store，setup 语法、全 `ref()`；偏好存 localStorage `markdownview-preferences`。
- `src/composables/` — `useFileOperation`（打开/保存/另存）、`useMilkdown`、`useExportPdf`（marked → 隐藏 iframe 打印）、`useKeyboardShortcuts`、`useDragDrop`、`useCloseConfirmation`。
- `src-tauri/src/lib.rs` — 全部 Rust 逻辑：`get_file_args`、`reveal_in_file_manager`、插件注册、single-instance、ctrlc。`main.rs` 只是入口；新增命令必须加进 `generate_handler!`，命令名 snake_case。
- `src/styles/global.scss` — 骨架层（与主题无关）；`src/styles/themes/<name>.scss` — 每主题一个变量文件；规则见下一节「主题与样式契约」，标准来源是 `prd/style.md`。
- `prd/`、`version/` — 需求计划与修改记录，命名 `{yyyyMMdd}-{需求名}-plan.md` / `-modification.md`。

## 主题与样式契约（改样式前必读）

`prd/style.md`（Drake 契约）是唯一标准；本节是它在本仓库的落地方式，冲突时以 `style.md` 为准。

### 文件与层次

- `src/styles/global.scss` — **骨架层**，与主题无关：§4.3 排版尺度（等价 Drake 的 `font.css`）→ 应用扩展（派生别名 + `--crepe-*` 映射）→ §5 骨架各段 → 应用基线。这里**不允许出现主题色字面值**（含 `--drag-overlay` 这类带色别名）。
- **§5 分段顺序固定**：global.scss 内的骨架段按 `style.md` §5 的段号排列，分段注释用规范里的英文标记（`/*code block*/`、`/*code snippet*/`、`/*variable*/`、`/*quote block*/`、`/*link*/`、`/* height light */`、`/*YAML*/`、`/*sidebar*/`）；本仓库没有对应 UI 的段（LaTeX/mermaid/时序图/raw block/脚注/checkbox/insert table/偏好设置）在文件头一次性列出，不写空段。
- `src/assets/fonts/` — 本地字体资产：Maple Mono NF CN 的 woff2（400/500/600/700 + 斜体）+ OFL 许可。新增字重或换字体只改 `global.scss` 的 `@font-face` 与 `--monospace`（§4.3 唯一入口），主题文件不参与。
- `src/styles/themes/<name>.scss` — **变量层**，一个主题一个文件，只放颜色/背景/边框。默认主题 `light.scss` 用 `:root`（兼作 `data-theme` 写入前的首帧兜底）；其余主题用 `html[data-theme='<name>']`（特异性 0,1,1，高于 `:root` 的 0,1,0，因此与文件加载顺序无关）。**不要**给新主题写 `:root`。
- 主题文件头按 §3 写 3 段：来源/许可、导出字体（本仓库为「无」，不走 `@include-when-export`）、变量范围；文件末尾固定一段 `/* code render */` 注释，指向 `src/shared/cmTheme.ts`（§5 段 23 的等价实现）。
- `src/styles/themes.ts` — `import.meta.glob('./themes/*.scss', { eager: true })`。不要改成手工 `@use`/`import` 列表，否则“加主题只加一个文件”失效。
- `src/shared/cmTheme.ts` — **代码高亮层**（`style.md` §5 段 23 的等价物：CM6 用 `HighlightStyle` 而非 CSS），明暗两套 token，文件头必须保留 `Name:` / `From:` / `License:` 注释。
- `src/composables/useExportPdf.ts` — 导出内联 CSS 必须用 `getComputedStyle(document.documentElement).getPropertyValue('--x')` 从主题变量取值，**禁止写死颜色**；`@media print` 只负责 `@page` 边距与去掉预览 padding（本应用的打印走独立 iframe，global.scss 里写 print 不会生效）。

### 变量契约（style.md §4）

- 每个主题文件必须**全量**声明 §4.1 变量（深色也照抄变量名，不允许只写差异、依赖 `light.scss` 兜底）。
- **已知偏离**：浅色正文/标题色按用户要求加深为 `#1f2328` / `#111827`（§4.1 基准是 `#333333` / `#273849`），不要再「纠正」回基准；改对比度前先确认这是产品决定。
- §4.2 内置变量：深色必须覆盖 `--mermaid-theme`、`--side-bar-bg-color`、`--md-char-color`、`--select-text-bg-color`、`--search-select-bg-color`、`--search-select-text-color`、`--window-border`。
- `--footnotes-*`、`--rawblock-edit-panel-bd`、`--checkbox-*` 目前无对应 UI，但按契约先声明占位（未消费≠可删）。
- 应用扩展变量（`--text-secondary`、`--border-color`、`--prose-width`、`--bg-primary` 等）只允许出现在两处：`global.scss` 的派生层，或主题文件末尾的「应用扩展」段。新增前先确认 `style.md` 里没有现成变量；`--side-bar-bg-color` / `--select-text-bg-color` 属 §4.2，浅色可选声明、深色必须覆盖。
- 变量复用优先：能写成 `var(--x)` 的不要写字面值；深浅切换只靠变量，**禁止**在组件里写 `[data-theme='dark']` 分支。
- 颜色统一小写十六进制；透明度用 `rgba()` 或 8 位十六进制；`data:image/svg+xml` 里的 `#` 必须编码为 `%23`。
- 应用扩展变量在深浅两套里都要有值（`--border-color` 深色为 `#282828`，与 `--window-border` 一致）。

### 尺寸与缩放（style.md §4.3）

- `html { font-size: var(--text-size) }` 是唯一缩放入口；`--text-size` 是全仓库唯一允许的 px 字号，默认 14px，`帮助 → 设置…` 弹窗可选 13/14/15/16px（写入根元素内联变量）。
- 字号、间距、内边距、圆角、图标尺寸、行高**一律 rem**（1rem = 14px；13px → `0.929rem`，8px → `0.571rem`）。组件 `<style>` 里出现 `font-size: 13px` 即不合规。
- 例外：1px 发丝线边框、`--window-border: 1px solid #282828`、用户拖拽产生的像素宽度（`store.fileTreeWidth` 等 JS 内联值）、`data:` URI 内的像素尺寸。
- 标题尺度固定 `h1 2rem / h2 1.8rem / h3 1.4rem / h4 1.2rem / h5,h6 1rem`，不得改写。
- 任何依赖字号的计算（如打字机行高）必须读实际样式（`getComputedStyle`），不能写死 `14px`。

### 新增主题清单

1. 复制 `themes/light.scss` → `themes/<name>.scss`。
2. 选择器改为 `html[data-theme='<name>']`，只改颜色值；变量顺序固定 §4.1 → §4.2 公有项 → 应用扩展 → §4.2 深色专有项，两个主题文件 diff 应只落在值上。
3. 深色类主题补齐 §4.2 内置变量，并同步修改 `--checkbox-*` 里 data-URI 的 `fill` 色。
4. `src/types/index.ts` 的 `AppTheme` 加成员，`MenuBar.vue` 的主题菜单加一项。
5. 不改 `main.ts` / `themes.ts`（glob 自动收录）。
6. 验证：`pnpm build` 通过，`pnpm tauri dev` 手动切主题，检查编辑区/代码块/文件树/菜单/PDF 导出。

### 不适用（Typora 专属，勿照搬）

- `@import ./drake/font.css`、`@include-when-export`、`img/thumbnail-*.png`、README 预览表：桌面应用无对应物。本地字体已内置 woff2（`src/assets/fonts/` + `global.scss` 的 `@font-face`），`--monospace` 用它打头、系统字体兜底。
- §5 里依赖 Typora DOM 的选择器（`#write`、`.md-fences`、`.md-diagram-panel-preview`、`[id^=mermaidChart]` 等）由 Crepe / 组件替代；Mermaid、脚注、raw block、任务列表当前无 UI。
- §2 的「骨架三处结构性修改要在 12 个主题文件中同步」不适用：本仓库骨架只有 `global.scss` 一份，天然同步。

## 发布

打 tag 触发 CI：`git tag -f vX.Y.Z && git push origin -f vX.Y.Z` → `.github/workflows/build-and-release.yml`（Windows/macOS×2/Linux 构建，GitHub 草稿 release，Windows 另挂便携 zip）。dev → main 合并流程见 `command.md`。
