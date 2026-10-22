# 主题样式目录拆分

## 目标

把 `src/styles/global.scss` 里混在一起的「骨架 + 明暗两套颜色」拆开：骨架全局一份，每个主题一个 scss 文件，以后加主题只加文件。

## 方案

```
src/styles/
├── global.scss     与主题无关：§4.3 排版尺度、派生别名层、Crepe 变量映射、.milkdown 骨架、全局基线
├── themes.ts       主题注册：import.meta.glob('./themes/*.scss', { eager: true })
└── themes/
    ├── light.scss  默认主题，选择器 :root（兼作 data-theme 写入前的首帧兜底）
    └── dark.scss   html[data-theme='dark']，只写与浅色不同的值
```

关键约定：

- 新主题 = `themes/<name>.scss` 一个文件，选择器写 `html[data-theme='<name>']`，再加 `AppTheme` 类型与 MenuBar 菜单项。不要维护手工 `@use` 清单。
- 默认主题用 `:root`，其余用 `html[data-theme='<name>']`：后者的特异性 0,1,1 高于 `:root` 的 0,1,0，配色与 CSS 加载顺序无关（glob 按字母序，dark 会排在 light 之前）。
- 纯别名变量（`--a-color`、`--table-bg-color`、`--active-file-bg-color` 等）留在 light 的 `:root` 指向 `--text-color`/`--drake-highlight`，深色自动跟随；literal 值（`--text-secondary`、`--border-color`）才在 dark 覆盖。
- 字号、字体、行距、间距（§4.3）留在 `global.scss`，等价于 Drake 的 `font.css`，主题文件不重复定义。

## 验收

- `pnpm build` 通过。
- `pnpm tauri dev`（或 `pnpm dev`）下切换浅/深主题，`html` 的计算样式分别为 `#ffffff / #2e2e2e` 与 `#1d1f21 / #d6d6d6`。
- 新增一个 scss 文件即可出现对应主题样式（无需改 `main.ts`）。

## 不做（另立需求）

- 组件里 36 处 px 字号与 px 间距改成 rem。
- PDF 导出复用 Drake 变量（`useExportPdf.ts` 目前是独立硬编码配色）。
