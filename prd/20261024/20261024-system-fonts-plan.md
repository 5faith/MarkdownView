# 删除内置字体 + 设置可选本地字体

> 实现记录：同目录 `20261024-system-fonts-modification.md`。

## 目标

1. 删除内置的 Maple Mono NF CN 字体资产（`src/assets/fonts/` 共 38MB），减小软件体积。
2. 设置中的「字体」可以选系统已安装的任意字体。

## 方案

- **字体偏好模型**：`AppFont` 由三值枚举（maple/system/mono）改为字符串——`''` 系统默认（正文系统界面栈、代码等宽栈）、`'mono'` 全等宽（保留原选项）、其它为本地字体族名。旧偏好值 `maple`/`system` 在读取时迁移为 `''`。
- **字体栈**：`global.scss` §4.3 删除 6 个 `@font-face`，默认值改为系统界面栈（正文）+ 系统等宽栈（代码）；store 的 `applyAppearance` 按偏好写根元素内联变量（`''` 走 CSS 默认；本地字体正文/界面用 `"族名", 系统栈兜底`，代码保持等宽）。
- **本地字体枚举**：Rust 新命令 `list_system_fonts()`，用 `font-kit`（DirectWrite/CoreText/fontconfig）返回系统字体族名，小写排序去重。前端在设置弹窗打开时拉取一次，填充下拉（含「系统默认」「系统等宽」两项）；当前偏好值不在列表里时补一个选项避免显示空白。
- 新增依赖：`font-kit = "0.14"`。

## 验证

- `pnpm build`、`cargo check`、`cargo build` 通过；dist 无 Maple 字体产物，体积 43MB → 5.1MB。
- CDP 实测（真实 dev 窗口）：
  - `list_system_fonts` 返回 163 个族名、小写有序，中文字体含本地化名（微软雅黑、宋体等）。
  - 选 `Microsoft YaHei UI` → `--text-font = "Microsoft YaHei UI", system-ui…`，`--monospace` 保持等宽栈；
  - 选 `mono` → 全部等宽栈；选 `''` → 内联变量移除、走 CSS 默认。

## 已知限制

- 字体族名以 DirectWrite 返回的名称为准（英文名 + 部分本地化名都有）；用户所选字体若已卸载，CSS 会回退到系统栈，且下拉会补显当前值。
- 删除内置字体后，老用户的偏好 `maple` 会迁移为「系统默认」，界面字体外观会变一次。
