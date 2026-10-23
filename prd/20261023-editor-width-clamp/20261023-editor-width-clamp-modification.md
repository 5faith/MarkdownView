# 编辑区宽度响应式（最小值 / 随屏增长 / 最大值） — 修改记录

## 改动

- `src/styles/global.scss`：
  - `--prose-width: 55.714rem` → `clamp(55.714rem, 72vw, 85.714rem)`
  - 注释同步为三段说明（下限 780px / 72vw 增长 / 上限 1200px）

## 取值

| 窗口宽度 | 14px 字号下内容宽度 |
| --- | --- |
| ≤ 1083px | 780px（下限） |
| 1280px | 921px |
| 1440px | 1037px |
| ≥ 1667px | 1200px（上限） |

字号切到 16px 时上下限等比放大到约 891px / 1371px；中间段仍按视口 72vw 计算，受上下限约束。

## 验证

- `pnpm build` 通过（vue-tsc + vite）。
- Vite 页面实测（视口约 1313px）：`.ProseMirror` 计算宽度 945px（= 72vw），不再是旧固定值 780px；文件树与大纲同时展开时无横向溢出。
- `useExportPdf` 复用该变量：820px 导出 iframe 中 72vw=590px 落回下限 780px，打印媒体仍 `max-width: none`，导出 PDF 与原行为一致。

## 备注

- 纯 CSS 变量改动，未改组件、Python/Rust 或 Tauri 权限。
- 浏览器直开 Vite 页面时控制台有 Tauri `metadata` 报错，属无 Tauri 运行时的既有现象，与本次改动无关。
