# 内置 Maple Mono NF CN 字体 — 修改记录

## 字体资产

- 来源：`D:\Desktop\MapleMono-NF-CN-unhinted`（v7.9，OFL），用 `fontTools 4.62.1 + brotli` 转 woff2。
- 产物（`src/assets/fonts/`，含 `MapleMono-LICENSE.txt`）：

| 文件 | 字重 | 大小 |
| --- | --- | --- |
| MapleMono-NF-CN-Regular.woff2 | 400 normal | 5.96 MB |
| MapleMono-NF-CN-Medium.woff2 | 500 normal | 6.05 MB |
| MapleMono-NF-CN-SemiBold.woff2 | 600 normal | 6.11 MB |
| MapleMono-NF-CN-Bold.woff2 | 700 normal | 6.07 MB |
| MapleMono-NF-CN-Italic.woff2 | 400 italic | 6.44 MB |
| MapleMono-NF-CN-BoldItalic.woff2 | 700 italic | 6.50 MB |

合计 37.1 MB（原 TTF 每个约 20 MB）。

未采用 `D:\Desktop\MapleMono-Woff2`：那批文件单字重仅 ~75 KB，`fontTools` 读出 1435 个字形、`中`（U+4E2D）不存在，是基础版 Maple Mono 的拉丁子集；NF CN 版本有 33091 个字形，中文与 NF 图标齐全。

## 代码改动

- `src/styles/global.scss`：§4.3 排版尺度段顶部新增 6 个 `@font-face`（`font-display: swap`），`--monospace` 改为 `"Maple Mono NF CN", ...` 打头；`--text-font` / `--title-font` / `--latex-font` 自动跟随。
- `src/components/CodeMirrorEditor.vue`：CM6 基础主题把 `.cm-scroller` 写死为 `monospace`，补 `font-family: var(--monospace)` 覆盖（非 md 文件与 Crepe 代码块同字体）。
- `src/composables/useExportPdf.ts`：导出前遍历 `document.styleSheets` 收集 `CSSFontFaceRule`，把 `@font-face` 一起写进 iframe（iframe 是独立文档，拿不到应用样式表的字体声明）；跨源不可读时跳过。
- 文档：`AGENTS.md`（字体资产与唯一改入口、去掉「字体未内置」）、`.operator/specs/milkdown-v2.md`（字体自托管 + Latin-only 陷阱）、`.operator/index/index.md`（assets/fonts）。

## 验证

- `pnpm build` 通过（5.32 s），`dist/assets/` 生成 6 个带 hash 的 woff2，CSS 引用正常。
- dev（Vite 14202）+ Playwright(Edge) 实测：
  - `document.fonts.check('14px "Maple Mono NF CN"')` → `true`；
  - 400/500/600/700 normal 与 400 italic 五个 face 状态 `loaded`（700 italic 未使用，按需加载）；
  - 同一字符串宽度：`MarkdownView` 100.81px（Maple）vs 92.38px（monospace）→ 字体确实生效；`中文测试` 67.2px（Maple 全角）vs 56px（微软雅黑）→ 中文走内置字体，不是回退。
- 视觉检查：浅色主题下菜单、标签、文件树、正文、引用、表格字体一致，中文无豆腐块。

## 注意

- 仓库与安装包各增加约 37 MB（woff2 已压缩，NSIS 压缩收益有限）。
- `***粗斜体***` 使用 BoldItalic；其余未内置字重（Thin/Light/ExtraBold）由浏览器就近取字重或合成。
