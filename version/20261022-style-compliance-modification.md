# 主题对齐 prd/style.md 修改记录

日期：2026-10-22

## 修改内容

### 1. `src/styles/themes/light.scss`

- 补齐 §4.1 全部变量（新增 `--footnotes-bg-color`、`--footnotes-highlight`、`--rawblock-edit-panel-bd`、`--checkbox-checked`、`--checkbox-unchecked`）。
- 基准值对齐规范：`--text-color: #333333`、`--code-block-color: #a9b7c6`、`--table-border-color: #dfe2e5`、`--table-header-bg-color: #f8f8f8`、`--table-n2-bg-color: #f8f8f8`、`--item-hover-bg-color: #e5e5e596`。
- 增加「应用扩展」段：`--side-bar-bg-color`、`--select-text-bg-color`、`--text-secondary`、`--border-color`，与 §4 变量分区。
- 勾选框 data-URI 内 `#` 编码为 `%23`。

### 2. `src/styles/themes/dark.scss`

- 改为**自包含**：全量声明 §4.1（纯别名也照写），不再依赖 light 兜底；`git diff light dark` 只剩值差异。
- 补 §4.2：`--mermaid-theme: night`、`--md-char-color`、`--search-select-bg-color`、`--search-select-text-color`、`--window-border`。
- 应用扩展：`--border-color: #282828`（与 `--window-border` 一致）。

### 3. `src/styles/global.scss` + 12 个组件

- 204 处 px 尺寸换算为 rem（14px 基准）：字号、间距、内边距、圆角、图标、行高、阴影偏移。
- 保留例外：1px/2px 发丝线、`--text-size: 14px`、拖拽宽度等。
- `--prose-width: 780px` → `55.714rem`；`calc(var(--toc-text-size) ± 1px)` → `± 0.071rem`。
- 保留 `--border-color: var(--table-border-color)` 派生映射。

### 4. `src/composables/useExportPdf.ts`

- 导出内联 CSS 全部改为 `getComputedStyle(document.documentElement).getPropertyValue('--x')` 取值（颜色、字体、行高、字号、段距、代码块、表格、引用）。
- 新增 `@media print { @page { margin: 16mm } .prose { padding: 0 } }`。
- 删掉按主题分支的硬编码配色。

### 5. `src/shared/cmTheme.ts`

- 文件头补 `Name: MarkdownView Light / MarkdownView Dark`、`From`、`License` 注释（§5 段 23 要求）。

### 6. `src/components/SourceEditor.vue`

- 打字机滚动行高改为 `getComputedStyle(ta).lineHeight`，不再写死 `1.7 * 14`。

### 7. `AGENTS.md`

- 新增「主题与样式契约（改样式前必读）」：文件与层次、变量契约、尺寸与缩放、新增主题清单、不适用清单。

### 8. `.operator/specs/milkdown-v2.md`

- 更新样式标准条目：主题自包含、占位变量、全 rem、PDF 导出取变量、高亮层位置。

## 验证

- `pnpm build`：通过（4.67s，仅 chunk 体积警告）。
- 变量自检：§4.1+§4.2 共 37 个变量，light/dark 仅缺已废弃的 `--h2-underline-color`；dark 与 light 差异仅为 §4.2 的 5 个深色专有项。
- Vite dev（14202）实测：
  - 浅色 `html` 计算样式 `#333333` / `#ffffff` / 14px；菜单栏下边框 `#dfe2e5`；表头 `#f8f8f8`。
  - 深色 `#d6d6d6` / `#1d1f21`，边框 `#282828`。
  - 字号仍是 1rem 基准时尺寸与改动前一致（菜单按钮 48×25、工具栏 28×28、状态栏 58×20）。
  - 临时把 `--text-size` 调到 18px：菜单按钮 48→62（1.29≈18/14）、高度 25→32，全站等比缩放成立；验证后已还原 14px。
- 残留 px 扫描：`src/**/*.vue|scss` 中无非例外 px（仅 1px/2px 发丝线与 `--text-size`）。

## 第二轮：骨架分段与文件头（同日）

style.md 的 §5 要求骨架按固定段序、用英文分段标记；§2 要求代码高亮层挂在主题文件末尾；§3 要求主题文件头三段。补齐：

- `src/styles/global.scss`：按 §5 段序重排（1 基线 → 2 code block → 6 code snippet → 7 variable → 9 quote → 10 link → 11 图片/宽度 → 12 标题/边距 → 13 表格 → 14 height light → 16 YAML → 18 sidebar → 应用基线），分段注释换成规范里的英文标记；文件头列出本仓库无 UI 的段与 §5-15 print 的去向。**只调顺序/注释，无值变更**。
- `--drag-overlay` 从 global.scss 派生层移入两个主题文件：骨架层现在零颜色字面值。
- 两个主题文件补 §3 三段头（来源/许可、导出字体为无、变量范围）与末尾 `/* code render */` 注释（指向 `shared/cmTheme.ts`）。

验证：`pnpm build` 通过；dev 实测浅色 `#333333/#ffffff`、深色 `#d6d6d6/#1d1f21`、字号 14px，与重排前一致。
