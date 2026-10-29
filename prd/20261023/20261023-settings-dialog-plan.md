# 设置窗口改版（基础样式设置）

> 设计稿：`20261023-settings-dialog-preview.html`（同目录）；实现与验证见同目录 `20261023-settings-dialog-modification.md`。

## 目标

现有设置弹窗把「字号」做成一排按钮，不符合桌面软件惯例，且没有字体效果的直观反馈。改为标准设置行 + 下拉选择，并把现有 store 已支持的 `theme` / `typewriter` 纳入同一入口。

## 设计

- 单页弹窗，540 px 宽，分「外观 / 编辑器」两组；标准设置行：左标签 + 说明，右控件。
- 字号改原生 `<select>`（12–20 px，默认 14），字体同款下拉（Maple Mono / 系统界面 / 系统等宽）。
- 主题用双段控件，打字机模式用开关；控件统一 32 px 高、7 px 圆角。
- 内嵌实时预览：用当前字体与字号渲染标题、正文与行内代码，代码块始终等宽。
- 底部「恢复默认」在左、「完成」在右；设置即时生效，完成只关闭弹窗，因此不设「取消」。
- 颜色全部取 `light.scss` / `dark.scss` 的变量，主色 `#e95f59`；落地时尺寸写 rem（1rem = `--text-size`）。

## 实现要点（确认后执行）

- 改 `src/components/SettingsDialog.vue`：沿用 `store.font` / `store.fontSize` / `store.theme` / `store.typewriter`，不新增 store 字段与偏好项。
- 设置已有的项不再在外部重复提供：菜单、状态栏、快捷键中的主题 / 打字机入口移除，统一走设置弹窗。
- 预览区字体随 `store.font`、字号随 `store.fontSize`；主题切换走现有 `store.theme`（`data-theme` 由 store 写入）。
- `20261023-settings-dialog-preview.html` 支持 `?theme=dark` 直接查看深色稿；字体按相对路径读取 `src/assets/fonts/`，加载失败时回退系统等宽。

## 验证

- 浅色 / 深色、三种字体、字号 12–20、恢复默认、Esc / 完成关闭与重新打开。
- `pnpm build` 通过；`pnpm tauri dev` 中确认设置即时生效且刷新后保留。
