# 实现记录：删除内置字体 + 设置可选本地字体

日期：2026-10-24

## 改动

- 删除 `src/assets/fonts/`（6 个 Maple Mono NF CN woff2 + OFL 许可，38MB）。
- `src/styles/global.scss`：删除 6 个 `@font-face`；§4.3 默认值改为 `--monospace`（系统等宽栈）与 `--text-font`（系统界面栈）。
- `src/types/index.ts`：`AppFont` 改为字符串（`''` 系统默认 / `'mono'` 全等宽 / 其它为本地字体族名），默认 `''`。
- `src/utils/preferences.ts`：`FONTS` 白名单校验改为旧值迁移表（`maple`/`system` → `''`）。
- `src/stores/useMarkdownStore.ts`：`FONT_STACKS` 替换为 `SYSTEM_STACK`/`MONO_STACK`；`applyAppearance` 三分支（`''` 移除内联走 CSS 默认、`mono` 全等宽、本地字体正文带兜底且代码保持等宽）。
- `src-tauri/Cargo.toml`：新增 `font-kit = "0.14"`。
- `src-tauri/src/lib.rs`：新增 `list_system_fonts` 命令并注册。
- `src/components/SettingsDialog.vue`：字体下拉改为「系统默认 / 系统等宽 + list_system_fonts 结果」，打开弹窗时拉取；偏好值不在列表时补显；预览 meta 与「恢复默认」同步调整。
- `AGENTS.md`：结构、主题契约字体条目、lib.rs 命令列表更新。

## 验证

- `pnpm build` / `cargo check` / `cargo build` 通过；dist 无 Maple 字体产物，体积 43MB → 5.1MB。
- CDP 实测：`list_system_fonts` 返回 163 个族名（有序，含中文本地化名）；三个偏好分支的内联变量与计算样式均符合预期（详见 plan 文档「验证」节）。

## 后续调整（同日）：字体下拉可搜索

原生 `<select>` 无法输入过滤，改为自绘 combobox：

- 输入框即搜索框：关闭时显示当前选中项，聚焦/打开时清空为搜索词并展示全量列表；输入按子串（大小写不敏感）实时过滤。
- 键盘支持：↑/↓ 移动高亮（滚动跟随）、Enter 选中、Esc 只收起列表（`stopPropagation`，不会关掉整个设置弹窗）；点击列表外部收起（document mousedown 监听）。
- 选中项在列表中标色加粗；无匹配时显示「无匹配字体」；偏好值不在系统列表时补显当前值。
- 实现位于 `SettingsDialog.vue`（`.settings-combo` 样式 + combobox 状态机：`showFontList` 打开并清空搜索词、`onFontInput` 仅确保列表打开以保留输入中的搜索词）。
- 验证（CDP 驱动真实菜单 → 设置弹窗）：打开显示 165 项全量；输入 "yahei" 过滤到 1 项；点选后 store.font 更新、列表收起、输入框回显；无匹配提示、Esc 行为、Esc 后输入框回显全部符合预期。
