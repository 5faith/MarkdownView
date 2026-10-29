# 修复：下拉框弹出层在深色主题下显示白色

日期：2026-10-24

## 问题

设置弹窗的下拉框（`<select>`）在深色主题下，鼠标点开的原生选项弹出层是白底，不符合主题。原因：WebView2（Chromium）按 `color-scheme` 决定原生控件（弹出层、滚动条等）的配色，应用从未声明，默认浅色。

## 方案

按主题契约走变量：

- `themes/light.scss` / `themes/dark.scss` 的「应用扩展」段分别声明 `--color-scheme: light` / `dark`。
- `global.scss` 派生别名层的 `:root` 消费：`color-scheme: var(--color-scheme, light)`（骨架层无主题色字面值、无 `[data-theme]` 分支）。

## 验证

- `pnpm build` 通过。
- CDP 实测：`getComputedStyle(html).colorScheme` 浅色 = `light`、深色 = `dark`，随 `data-theme` 切换。

## 后续（同日）：color-scheme 不够，弹层仍白

WebView2 的 select 原生弹出层实际不跟随 `color-scheme`，深色下依旧白底。补充：在 `SettingsDialog.vue` 的 `.settings-select select` 内显式给 `option` 上色（`background: var(--bg-secondary)` / `color: var(--text-primary)`）——Chromium 系弹层会用 option 自身的背景/文字色渲染，随主题明暗切换。`pnpm build` 通过，产物 CSS 含该规则。
