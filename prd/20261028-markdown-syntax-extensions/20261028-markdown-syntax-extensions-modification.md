# 修改记录：扩展语法

> 需求见同目录 `20261028-markdown-syntax-extensions-plan.md`。

## 依赖

- 新增 `gemoji@8.1.0`、`remark-definition-list@2.0.1`。
- 移除 `@xz-summer/milkdown-container`、`marked`。

## 新增 `src/shared/milkdown/`

- `index.ts` — 汇总 `milkdownSyntaxPlugins`；`prependRemarkSyntax()` 把转换插件插到 `remarkPluginsCtx` 最前面（commonmark 预设的 `remarkHtmlTransformer` 会把块级 HTML 改写成段落，顺序反了折叠块失效）。
- `html.ts` — 块级 `html_block` 兜底节点（等宽文本）+ 行内 HTML 降级为文本。
- `details.ts` — `remarkDetails` 合并 `<details>` 兄弟节点为 `mdvDetails`；`details` / `details_summary` / `details_content` 三个 schema + NodeView（同步 `open`）；回写 HTML。
- `alert.ts` — `remarkAlerts` 识别引用首行 `[!TYPE]`；`alert` 节点（attr `type`），`toDOM` 输出五色块 + `createElementNS` 内联 SVG 图标 + 英文标题。
- `definitionList.ts` — `remarkDefinitionList` + `definition_list` / `definition_term` / `definition_description` 三个 schema。
- `emoji.ts` — gemoji 短代码表、行内原子节点 `emoji`（渲染 emoji 字符、回写 `:name:`）、`remarkEmoji`（文本拆节点）、输入规则（输入 `:tada:` 即时转换）、导出用文本替换、菜单列表 `EMOJI_MENU`。
- `mermaid.ts` — Mermaid 图表：`mermaid` 节点 + NodeView（默认渲染 SVG，点「源码」切回文本编辑）、`remarkMermaid`（```mermaid 围栏 → 节点）、10 个图表骨架 `MERMAID_TEMPLATES`（脑图/流程图/时序图/甘特图/XY 图表/类图/状态图/E-R 图/饼图/用户旅程图）。mermaid 动态加载，渲染结果缓存供导出 PDF 的 `toDOM` 取用，切主题自动重渲染。

## 修改

- `src/composables/useMilkdown.ts` — `containerPlugin` → `milkdownSyntaxPlugins`。
- `src/main.ts` — 去掉容器插件 CSS。
- `src/shared/editor.ts` — `insertDetails` 改用新 schema；新增 `insertFootnote` / `insertAlert` / `insertDefinitionList` / `insertEmoji`；`FormatKind` 增加 `footnote` / `deflist` / `emoji` / `alert`，源码模式插入对应文本。
- `src/components/MenuBar.vue` — `MenuItem` 支持 `children` 二级下拉；新增「插入」菜单（表情符号 ▸ / 告警块 ▸ / 折叠内容 / 脚注 / 定义列表）；「格式」里的「隐藏细节」移除。
- `src/components/EditorToolbar.vue` — 工具栏原「折叠内容」按钮换成「插入」下拉（表情符号网格 / 告警块五项 / 折叠内容 / 脚注）；表情网格下方带「查看完整表情表 ↗」链接（emoji-cheat-sheet），「列表」下拉新增「定义列表」；新增「图表」按钮（折线图图标）下拉 10 种 Mermaid 图表。
- `src/assets/TEMPLATE.md` — 新增「图表（Mermaid）」一节，10 种图表各一个示例（骨架与 `MERMAID_TEMPLATES` 一致）。
- `src/shared/openExternal.ts` — `openExternal()`（Tauri 走 `@tauri-apps/plugin-opener`，浏览器退回 `window.open`）+ `EMOJI_SHEET_URL`。
- `src-tauri` — 新增 `tauri-plugin-opener`（Cargo、`lib.rs` 注册、capabilities 加 `opener:default` / `opener:allow-open-url`）。版本必须与 NPM 侧成对：随本次升级整体对齐到 tauri 2.12 / opener 2.7.2（`package.json` 的 `@tauri-apps/*` 全部锁成精确版本，避免 Tauri 构建时的版本校验因漂移报错）。
- `src/composables/useExportPdf.ts` — `marked` → `DOMSerializer` 序列化当前文档 + `replaceEmojiInElement`；补折叠块/告警块/脚注/定义列表的打印样式（告警五色读主题变量）。
- `src/styles/global.scss` — 新增五类语法的骨架样式（折叠块、告警块五色、脚注、定义列表、表情、原始 HTML 兜底），全部走主题变量 + rem。
- `src/styles/themes/light.scss` / `dark.scss` — 新增 5 组告警色变量（`--alert-*-color` / `--alert-*-bg`）。
- `src/assets/TEMPLATE.md` — 「表情符号」同时展示短代码与直接输入两种写法；「隐藏细节」→「折叠内容」（普通 + `open`，含代码块）；新增「告警块」「定义列表」；脚注沿用文末原有示例。
- `AGENTS.md`、`.operator/specs/milkdown-v2.md` — 同步新契约与目录说明。

## 验证（已做）

- `pnpm build` 通过。
- dev server + Chromium 实测模板：
  - 折叠块 2 个（`<details open>` 与默认收起）、告警块 5 个（Note/Tip/Important/Warning/Caution，图标 10 个 SVG 子节点）、定义列表 1 个（2 dt / 3 dd）、脚注 2 引用 + 2 定义、表情 7 个（😄❤️🚀⚠️ℹ️💡🏁）。
  - 切源码模式：`<details>` / `[!NOTE]` / `[^1]` / `: 释义` / `:smile:` 都保持，`:::` 已不存在；再切回所见即所得，节点数量不变、无控制台报错。
  - 未识别的原始 HTML 不再让解析器抛错（解析器崩溃问题一并修掉）。

## 已知限制

- `<summary>` 与正文之间必须空行；summary 内不支持行内 Markdown；不支持嵌套 `<details>`。
- 告警块回写为 `> [!TYPE]` + 正文引用（与 GitHub 一致）；标题固定英文（Note/Tip/…）。
- 旧文件里的 `:::details` 会显示成普通文本。
- 表情只在所见即所得与导出里渲染，源码模式保持短代码。
