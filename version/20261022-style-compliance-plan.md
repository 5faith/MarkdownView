# 主题全面对齐 prd/style.md + 规则写入 AGENTS.md

日期：2026-10-22
状态：已完成

## 背景

上一轮（`20261022-theme-styles-split`）只拆分了目录结构，复核仍发现与 `prd/style.md`（Drake 契约）的偏差：

1. 主题文件不自包含（dark 只写差异，违反 §3「变量层自带默认值」、§6「复制整份主题只改值」）。
2. §4.1 缺 8 个契约变量；6 处基准值与规范不一致。
3. 组件里 36 处 px 字号 + 大量 px 间距，违反 §4.3「全 rem、一处改字号全站生效」。
4. PDF 导出的内联 CSS 独立硬编码配色，且无 `@media print`。
5. 代码高亮层没有 §5 段 23 要求的 `Name/From` 来源注释。

## 方案

| 项 | 做法 |
|---|---|
| 变量契约 | light/dark 各自全量声明 §4.1；dark 补 §4.2；补齐 footnotes/rawblock/checkbox 占位变量；浅色值改为规范基准 |
| 尺寸 | 所有组件与 global.scss 的 px 尺寸批量换算为 rem（14px 基准），保留 1px 发丝线、`--text-size: 14px`、拖拽产生的 JS 像素宽度 |
| 导出 | `useExportPdf` 在导出瞬间读 `getComputedStyle` 的主题变量并内联，补 `@media print` |
| 高亮 | `shared/cmTheme.ts` 补 `Name/From/License` 注释，作为 §5 段 23 的 CM6 等价物 |
| 规范落地文档 | 把上述规则写进 `AGENTS.md`「主题与样式契约」一节，明确不适用项 |

## 不做的部分

- 不引入 Drake 的 woff2 字体文件（无来源，继续走系统回退链）。
- 不改 `--prose-width`（780px，阅读尺度是本应用的设计选择，已改为 rem）。
- 不为 Mermaid/脚注/任务列表实现 UI，只按契约声明变量。
- 不把 `prd/style.md` 的 Typora 专属段（`#write`、`.md-fences` 等）照搬进仓库。

## 第二轮（补做）

- global.scss 按 §5 固定段序重排，分段标记改英文；无 UI 的段在文件头说明。
- 主题文件补 §3 三段头 + 末尾 code render 指针。
- 把 `--drag-overlay` 移入主题文件，骨架层不再含颜色字面值。
