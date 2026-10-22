# 设置弹窗与浅色对比度调整 — 修改记录

## 浅色对比度

- `src/styles/themes/light.scss`：
  - `--text-color: #333333` → `#1f2328`
  - `--title-color: #273849` → `#111827`
  - `--text-secondary: rgba(51,51,51,0.6)` → `rgba(31,35,40,0.75)`
  - `--blur-text-color` 同步改为 `rgba(31,35,40,0.5)`
- `src/components/MenuBar.vue`：
  - 顶级菜单文字 `--text-secondary` → `--text-primary`；字号 `0.929rem` → `1rem`
  - 下拉项字号 `0.929rem` → `1rem`，`font-weight: 500`；弹层最小宽度 `15.429rem` → `17.5rem`

## 设置弹窗

- `src/types/index.ts`：新增 `AppFont = 'maple' | 'system' | 'mono'`；`Preferences` 增加 `font`、`fontSize`；默认 `maple` / `14`。
- `src/utils/preferences.ts`：读入时校验字体枚举，字号限制在 12–20（手改 localStorage 不会把界面撑坏）。
- `src/stores/useMarkdownStore.ts`：
  - `FONT_STACKS` 定义系统界面 / 系统等宽两套方案；`applyAppearance()` 写根元素内联变量 `--text-font`、`--title-font`、`--monospace`、`--text-size`。
  - 默认 `maple` 不写字体内联值，直接移除覆盖回到 `global.scss` 的唯一字体栈（避免两处维护）；只写 `--text-size`。
  - setup 时立即应用一次（首帧不闪回默认），`watchEffect(applyAppearance)` 响应变化。
  - 偏好持久化增加 `font`、`fontSize`；导出 `font`、`fontSize`。
- `src/components/MenuBar.vue`：
  - 移除原来的顶级「设置」菜单；「帮助」菜单中新增「设置…」（加载模板与关于之间）。
  - 引入并挂载 `SettingsDialog`，用 `settingsOpen` 控制显隐。
- `src/components/SettingsDialog.vue`（新增）：
  - Teleport 模态框；字体 3 个 chip、字号 4 个 chip，底部「恢复默认」「完成」。
  - Esc 关闭、点遮罩关闭；打开后焦点落在关闭按钮。
  - 直接读写 store 的 `font` / `fontSize`，改动即时生效。
- 主题文件不改：设置写的是根元素内联变量，优先级高于主题 `:root`，明暗切换不受影响。

## 验证

- `pnpm build` 通过（4.89s）。
- Playwright(Edge) 实测：
  - 帮助菜单项：加载模板 / 设置… / 关于 MarkdownView；点击「设置…」后菜单关闭、弹窗可见。
  - 下拉项计算样式：`rgb(31, 35, 40)` / `14px` / `500`。
  - 选「系统界面」：`--text-font` 为系统栈、`--monospace` 为 Consolas（代码仍等宽）；切回 Maple 后内联覆盖被移除。
  - 选「16 px」：根 `--text-size` 与界面字号均为 16px，布局等比放大。
  - Esc、点遮罩均可关闭；「恢复默认」回到 14px + Maple Mono + 新正文色。
  - 重载后 `font: mono` / `fontSize: 15` 保留（localStorage 生效）。
- 截图：帮助菜单、设置弹窗、16px、持久化后四张，中文与代码块均正常。

## 注意

- 浅色正文色是**有意偏离** `style.md` §4.1（基准 `#333333`），已写入 AGENTS/spec，后续同步主题时不要改回。
- 字号设置会同时缩放 `--prose-width`（rem），阅读列宽随字号等比变化，符合 §4.3 的单点缩放约定。
