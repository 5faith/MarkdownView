# 设置窗口改版（基础样式设置）— 修改记录

> 计划：`20261023-settings-dialog-plan.md`；设计稿：`20261023-settings-dialog-preview.html`。

## 结果

设置弹窗按设计稿重做，主题 / 字体 / 字号 / 打字机模式统一由 `帮助 → 设置…` 修改；原先散落在菜单、状态栏和快捷键里的重复入口已移除。

## 改动

### 设置弹窗（`src/components/SettingsDialog.vue`）

- 540 px 单页布局（`38.571rem`），分「外观 / 编辑器」两组；标准设置行：左侧标签 + 说明，右侧控件。
- 字号由 13–16 的按钮组改为原生下拉 12–20 px（默认 14），字体改为下拉；沿用 `store.font` / `store.fontSize`。
- 主题用浅色 / 深色双段控件，打字机模式用开关；绑定现有 `store.theme` / `store.typewriter`。
- 内嵌实时预览：标题、正文、行内代码随当前字体与字号渲染，代码使用 `--monospace`。
- 「恢复默认」重置四项为 light / maple / 14 / false；「完成」只关闭弹窗，设置即时生效并写入 Preferences。
- 打开时焦点移到弹窗容器（`tabindex="-1"`），Esc / 遮罩 / 关闭按钮 / 完成均可关闭；控件有 `:focus-visible` 焦点环。

### 移除重复入口

- `src/components/MenuBar.vue`：视图菜单删除「打字机模式」「浅色主题」「深色主题」。
- `src/components/StatusBar.vue`：删除右下角「打字机」按钮及其样式。
- `src/composables/useKeyboardShortcuts.ts`：删除 `Ctrl+Shift+D` 主题快捷键。
- `src/stores/useMarkdownStore.ts`：删除不再被引用的 `toggleTheme()` / `toggleTypewriter()`。
- `帮助 → 设置…` 保持为唯一设置入口；目录树 / 大纲 / 源码 / 阅读模式等视图开关仍留在菜单 / 工具栏。

### 文档

- 同步更新编辑器契约文档中的外观设置入口与快捷键说明。

## 验证

- `pnpm build` 通过（vue-tsc + vite build）。
- 用 Playwright（Edge）在 `pnpm dev` 页面验证，视口 1200×800：
  - 浅色 14 px 弹窗 540×539；20 px 弹窗 771×760；12 px 弹窗 463×463，均未横向溢出。
  - 深色切换即时生效；刷新后 `data-theme` 仍为 dark，字号、字体、打字机状态从 Preferences 恢复。
  - 「恢复默认」后为 light / maple / 14 / typewriter=false；「完成」和 Esc 均能关闭。
  - 视图菜单只剩 目录树 / 大纲 / 源码模式 / 阅读模式；状态栏不再有打字机按钮。
- 未在原生 Tauri 窗口里逐项点击回归：本次只改 Vue 层与 store 绑定，Tauri 命令、权限、文件操作未改动。

## 注意

- 20 px + 800 px 高窗口时弹窗接近高度上限，正文可滚动；默认 14 px 无需滚动。
- 字号范围 12–20 与 `src/utils/preferences.ts` 既有归一化范围一致，旧偏好（13–16）无需迁移。
- 本项目 `README.md` 已过时且仍列有 `Ctrl+Shift+D`，本次未修改该文件。
