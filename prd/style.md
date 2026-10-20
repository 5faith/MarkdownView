# Drake Typora 主题 CSS 规范

本文件描述本仓库主题的 CSS 编写标准。它同时可作为**其他项目**移植主题变量契约时的规范依据。

---

## 1. 目录与文件约定

```
DrakeTyporaTheme/
├── drake.css                 默认主题（浅色，骨架基准）
├── drake-<variant>.css       其余变体主题，每个文件 = 一个主题
├── drake/
│   ├── font.css              共享字体定义 + 快速自定义区（所有主题 @import）
│   └── *.woff2               本地字体文件
├── img/thumbnail-<variant>.png  主题缩略图，文件名与变体名一一对应
└── README.md                 安装说明 + 预览表
```

规则：

- 一个主题 = **一个根级 CSS 文件**，文件名 `drake-<variant>.css`，默认主题为 `drake.css`。
- 字体、字体参数、字号、行距、间距等全局可调项**只**写在 `drake/font.css`，主题文件不重复定义。
- 缩略图命名必须为 `img/thumbnail-<variant>.png`，并在 `README.md` 预览表登记一行。

---

## 2. 三层结构

主题 CSS 分三层，改动范围严格区分：

| 层 | 位置 | 职责 | 新增主题是否需要改 |
|---|---|---|---|
| 骨架层 | `drake.css` 全文件（除去变量与配色块） | 选择器、布局、间距、交互 | **不改，保持所有主题逐字一致** |
| 变量层 | 各主题文件开头 `:root { … }` | 颜色、背景、边框 | **只改这里就能换肤** |
| 代码高亮层 | 各主题文件末尾 `code render` 块 | CodeMirror token 配色 | 可选替换（有则连同注释来源一起替换） |

**不变式**：任意两个主题文件做 diff，差异应只落在 `:root` 变量值、代码高亮块，以及极少数必要的局部覆盖上。骨架任何一处结构性修改都必须在全部 12 个文件中同步。

---

## 3. 文件头部格式

每个主题文件固定 3 段，顺序不可变：

```css
/* MIT License … 版权声明（23 行，原样保留） */

@import url(./drake/font.css);                      /* 1. 共享字体 + 快速自定义变量 */
@include-when-export url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap'); /* 2. Typora 导出时注入的在线字体 */

:root { … }                                        /* 3. 主题变量 */
```

- `@import` 必须在 `@include-when-export` 之前。
- `@include-when-export` 是 Typora 专有指令，浏览器导出（PDF/HTML）时才注入远程字体。
- 变量层必须自带默认值，不依赖 `font.css` 中的任何数值（`font.css` 只提供字体与排版尺度）。

---

## 4. 变量层契约（`:root`）

### 4.1 主题色变量

| 变量 | 作用 / 消费位置 | 浅色基准值 |
|---|---|---|
| `--text-color` | 全局文字色（`body`、mermaid 文字、`kbd`、侧栏） | `#333333` |
| `--bg-color` | 页面/侧栏/菜单背景、mermaid 标签底 | `#ffffff` |
| `--drake-accent` | **点缀色**：引用左边条、文件树激活左边框 | `#e95f59` |
| `--drake-highlight` | **高亮色**：行内代码、脚注标记、主按钮文字 | `#d63200` |
| `--a-color` | 链接色 | `var(--drake-highlight)` |
| `--title-color` | h1–h6 标题色 | `#273849` |
| `--strong-color` | 加粗文字色 | `var(--title-color)` |
| `--variable-color` | `<var>` 标签色 | `var(--drake-highlight)` |
| `--outline-active-color` | 大纲激活项 | `var(--a-color)` |
| `--blur-text-color` | 焦点模式下非当前行文字 | `rgba(51,51,51,.5)` |
| `--horizontal-divider-color` | `hr` 颜色 | `var(--title-color)` |
| `--blockquote-border-color` | 引用块左侧 4px 竖条 | `var(--drake-accent)` |
| `--blockquote-color` | 引用块文字 | `var(--text-color)` |
| `--blockquote-bg-color` | 引用块背景 | `#fdefee` |
| `--code-block-bg-color` | 围栏代码块 / 行号栏背景 | `#2b2b2b` |
| `--code-block-color` | 代码块默认文字、mermaid 节点文字 | `#A9B7C6` |
| `--yaml-color` / `--yaml-bg-color` | front-matter（`pre.md-meta-block`） | `#777777` / `#f7f7f7` |
| `--height-light-color` / `--height-light-border-color` | `==高亮==` 文字色 / 描边 | `var(--drake-highlight)` |
| `--table-border-color` | 表格边框 | `#dfe2e5` |
| `--table-header-bg-color` | 表头背景 | `#f8f8f8` |
| `--table-bg-color` | 表格底色 | `var(--bg-color)` |
| `--table-n2-bg-color` | 表格斑马纹偶数行 | `#f8f8f8` |
| `--footnotes-bg-color` | 脚注悬浮气泡背景 | `#3c3d3e` |
| `--footnotes-highlight` | 气泡内链接/代码色 | `#FFD760` |
| `--item-hover-bg-color` | 列表项/工具栏悬浮底色（深色主题的万能底色源） | `#E5E5E596` |
| `--active-file-bg-color` | 文件树激活项底色 | `var(--item-hover-bg-color)` |
| `--active-file-border-color` | 文件树激活项边框 | `var(--drake-accent)` |
| `--input-bg-color` | 搜索框、插入表格输入框 | `var(--item-hover-bg-color)` |
| `--btn-hover-bg-color` | 按钮/图标悬浮底色 | `var(--item-hover-bg-color)` |
| `--control-text-color` | Typora 控件文字 | `var(--text-color)` |
| `--meta-content-color` | 图片 meta 等注释文字 | `var(--text-color)` |
| `--rawblock-edit-panel-bd` | raw block 编辑面板边框 | `var(--code-block-bg-color)` |
| `--checkbox-checked` / `--checkbox-unchecked` | 任务列表勾选框图标（`data:image/svg+xml`） | 见源码，`fill` 色写在 URI 内 |
| `--h2-underline-color` | **已废弃**：仅声明未被消费，新主题可省略 | — |

### 4.2 Typora 内置变量（浅色主题无需声明，深色主题必须覆盖）

| 变量 | 作用 | 深色主题建议值 |
|---|---|---|
| `--mermaid-theme` | mermaid 渲染主题 | `night` |
| `--side-bar-bg-color` | 侧边栏背景 | `var(--bg-color)` |
| `--md-char-color` | Markdown 标记符号（`#`、`*`）色 | `#535455` |
| `--select-text-bg-color` | 文本选中底色 | `#3473B068` |
| `--search-select-bg-color` / `--search-select-text-color` | 搜索命中项底/字色 | `#ffffff` / `var(--bg-color)` |
| `--window-border` | 窗口分隔线 | `1px solid #282828` |

### 4.3 快速自定义变量（`drake/font.css`，全局唯一）

| 变量 | 作用 | 默认 |
|---|---|---|
| `--monospace` | 代码字体族 | `"Iosevka Curly", "JetBrains Mono", …` |
| `--text-font` | 正文字体 | `var(--monospace)` |
| `--title-font` | 标题字体 | `var(--monospace)` |
| `--latex-font` | LaTeX 公式字体（不含英文） | `var(--monospace)` |
| `--text-line-height` | 正文行距 | `1.6` |
| `--code-line-height` | 代码块行距 | `1.6` |
| `--p-spacing` | 段间距（`p/blockquote/ul/ol/dl/table` 统一消费） | `0.8rem` |
| `--file-tree-text-size` | 文件树字号 | `1.1rem` |
| `--toc-text-size` | 大纲字号 | `1rem` |
| `--text-size` | 根字号，`html { font-size: var(--text-size) }` | `14px` |

> **关键约定**：全主题使用 `rem`（间距为 `rem`，边框为 `.1em`）。改字号只需改 `--text-size`，全站等比缩放。标题尺度固定为 `h1 = 2rem / h2 = 1.8rem / h3 = 1.4rem / h4 = 1.2rem / h5、h6 = 1rem`，不允许用 px 硬编码字号。

---

## 5. 骨架层分段（顺序固定，全主题一致）

| 段 | 注释标记 | 覆盖内容 |
|---|---|---|
| 1 | — | `html` / `body` / `p` 排版基线、连字 `liga/calt`、抗锯齿 |
| 2 | `/*code block*/` | `.md-fences` 代码块容器、焦点模式淡出 |
| 3 | — | 行内/块级 LaTeX 缩放（`.MathJax` 120% / 块级 130%） |
| 4 | `/*mermaid*/` | `[id^=mermaidChart]` 全部 mermaid 图形配色，全部映射到变量 |
| 5 | — | 时序图 `.md-diagram-panel-preview`（actor / message / loop / edge） |
| 6 | `/*code snippet*/` | 行内 `code`、`tt` |
| 7 | `/*variable*/` | `var` |
| 8 | `/*raw block*/` | HTML 块编辑态 |
| 9 | `/*quote block*/` | 引用块与 `::before` 竖条 |
| 10 | `/*link*/` | 链接、`md-plain` 下划线、焦点模式降级下划线 |
| 11 | — | 图片圆角、内容区宽度 `#write { max-width: 1200px; padding: 20px 30px 100px }` |
| 12 | — | 首/尾元素 margin 归零组、标题 h1–h6 定义与 `md-focus:before` 定位 |
| 13 | — | 表格全套（`thead` / `th` / `td` / 斑马纹） |
| 14 | `/* height light */`、`/*shortcut*/` | `mark`、`kbd`、`del`、任务列表 |
| 15 | `@media print` | 打印字号与分页 |
| 16 | `/*YAML*/` | front-matter |
| 17 | — | 快速打开面板、导出面板、源码模式、搜索面板、焦点模式 |
| 18 | `/*sidebar*/` | 文件树、大纲 |
| 19 | — | 脚注全套（标记 / 定义 / 气泡） |
| 20 | `/*checkbox*/` | 任务列表 checkbox（隐藏原生 + `::before` 画 data-URI 图标） |
| 21 | `/*insert table*/` | 按钮、模态框 |
| 22 | `/*preference panel*/` | 设置界面、桌面端标题栏、菜单 |
| 23 | `code render` | **CodeMirror token 配色**（唯一允许大块替换的段落，必须保留/更新 `Name:` `From` 注释标注来源与协议） |

---

## 6. 新增一个主题的清单

1. 复制 `drake.css` → `drake-<variant>.css`，文件头版权注释不动。
2. **只改 `:root`**：至少确定 `--text-color`、`--bg-color`、`--title-color`、`--drake-accent`、`--drake-highlight`、`--blockquote-*`、`--code-block-*`、`--table-*`。
3. 深色主题补齐第 4.2 节的内置变量（尤其 `--mermaid-theme: night`），并同步修改 checkbox 的 data-URI `fill` 色。
4. 可选：替换末尾代码高亮块，注释中标明来源（如 `Ayu` / `IntelliJ IDEA darcula` / `material`）。
5. 骨架其余部分保持不动；`grep` 校验除 `:root` 与配色块外无残留旧色值。
6. 导出缩略图 `img/thumbnail-<variant>.png`，在 `README.md` 预览表加一行。

---

## 7. 编写规范

- 注释：中文用于说明用途（`/*快速自定义配置*/`、`/*方块文字*/`），英文用于分段标记（`/*code block*/`），分段标记全主题保持一致。
- `!important`：仅在与 Typora 内置样式冲突、且必须压过时才加（现有用法集中在焦点模式、`.MathJax`、搜索面板）。
- 颜色书写：统一小写十六进制；需要透明度时用 `rgba()` 或 8 位十六进制。
- 变量复用优先：能在 `:root` 声明成 `var(--x)` 的，不要再硬编码；深色主题尤其依赖 `--item-hover-bg-color` 作为派生底色源。
- `data:image/svg+xml` 内颜色必须 URL 编码（`#` → `%23`），否则图标不显示；导出 PDF 时勾选框图标依赖该变量。
- 改动骨架后必须逐主题回归：12 个文件需保持同步。

---

## 8. 移植到其他项目

可移植的是**契约**，不是选择器：

- 可直接搬：第 4 节的变量名与语义映射、第 4.3 节的排版尺度变量、第三章的头部结构约定。
- 需重写：第 5 节的选择器（依赖 Typora 的 DOM / `#write` / `md-*` 类名）。
- 移植后必须保留的不变式：**单主题单文件 + 变量层与骨架层分离 + 全 rem 缩放 + 一处改字号全站生效**。
