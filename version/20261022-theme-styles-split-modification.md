# 修改记录 — 主题样式目录拆分

## src/styles/themes/light.scss（新增）

- 浅色主题全部 §4.1 颜色契约变量，选择器 `:root`（兼作 `data-theme` 写入前的首帧兜底）。
- 新增 `--text-secondary: rgba(51, 51, 51, 0.6)`：原先写在 global.scss 的派生层，属于主题色而非映射，移入主题文件。
- 纯别名变量（`--a-color`、`--strong-color`、`--variable-color`、`--outline-active-color`、`--horizontal-divider-color`、`--blockquote-border-color`、`--height-light-*`、`--table-bg-color`、`--active-file-bg-color`、`--input-bg-color`、`--btn-hover-bg-color`、`--control-text-color`、`--meta-content-color`）只在此声明一次，深色靠 `var()` 自动跟随。

## src/styles/themes/dark.scss（新增）

- 选择器 `html[data-theme='dark']`（特异性 0,1,1，高于 `:root`，与文件加载顺序无关）。
- 只写与浅色不同的值：颜色 literal、`--side-bar-bg-color`、`--text-secondary`、`--border-color: #282828`（原在 global.scss 的深色派生块），以及 §4.2 的 `--md-char-color` / `--window-border`。
- 显式注明 `--code-block-*` 两主题同为深底、不覆盖。

## src/styles/themes.ts（新增）

- `export const themeStyles = import.meta.glob('./themes/*.scss', { eager: true })`：构建期把 themes/ 下所有 scss 静态引入，新增主题无需改任何注册文件。

## src/styles/global.scss

- 删除变量层的明暗两套颜色（原第 14-85 行）与深色派生块、深色 Crepe 覆盖，只保留与主题无关的部分：§4.3 排版尺度 → 派生别名层 → `--crepe-*` 映射 → `.milkdown` 骨架 → chrome 字号 → 全局基线。
- `--crepe-color-on-surface-variant` 由硬编码的 `rgba(51,51,51,.65)` + 深色重复覆盖，改为 `var(--text-secondary)`（复用主题变量，去掉两处硬编码；透明度 .65 → .6，视觉无感）。
- 派生层移除 `--text-secondary`（改由主题文件提供），`--border-color: var(--table-border-color)` 保留在派生层，深色在主题文件里覆盖。

## src/main.ts

- 增加 `import './styles/themes'`（glob 注册表），加载顺序：Crepe 基础样式 → global.scss → themes。

## 验证

- `pnpm build` 通过；产物 CSS 中两套变量均在，`html[data-theme=dark]` 生效。
- 浏览器实测（localhost，Vite dev）：浅色 `html` 计算背景 `#ffffff`、文字 `#2e2e2e`、根字号 14px；深色 `#1d1f21` / `#d6d6d6`；字体族为 `--monospace`。菜单切换即时生效。

## 文档同步

- `.operator/specs/milkdown-v2.md`：样式标准一节的目录划分、注册方式、选择器约定与「深色只写差异」。
- `.operator/index/index.md`：新增 `src/styles` 条目，更新 `main.ts`。
- `AGENTS.md`：`src/styles/global.scss` 说明改为「骨架 + themes/ 契约」，顺带修正失效的 `prd/20261019-*/style.md` 路径为 `prd/style.md`。
