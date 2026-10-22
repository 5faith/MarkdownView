# 内置 Maple Mono NF CN 字体（woff2 自托管）

## 目标

把 Maple Mono NF CN 作为应用内置字体随包分发，不依赖用户系统安装；`--monospace` 首位换成它，正文、标题、代码块、菜单全站生效。

## 方案

- 源文件：`D:\Desktop\MapleMono-NF-CN-unhinted`（v7.9，OFL），用本机 `fontTools 4.62.1 + brotli` 转 woff2。
- 字重：400 / 500 / 600 / 700 + 斜体 400 / 700（对应项目实际使用的 `font-weight`，避免浏览器合成加粗）。
- 产物：`src/assets/fonts/*.woff2` + `MapleMono-LICENSE.txt`（OFL 要求随附）。
- 声明：`global.scss` 的 §4.3 排版尺度段顶部写 6 个 `@font-face`（`font-display: swap`），`--monospace` 改为 `"Maple Mono NF CN", ...` 打头。主题文件不动。
- Vite 自动处理 `url('../assets/fonts/*.woff2')`，Tauri `csp` 为 `null`，无需加权限。

## 为什么不用 `D:\Desktop\MapleMono-Woff2`

那批文件每个约 75KB，文件名是 `MapleMono-Bold.ttf.woff2`（基础版 Maple Mono，非 NF CN），只含拉丁字形：中文和 Nerd 图标都会回退到系统字体，等于没换。NF CN 单字重 woff2 约 6MB。

## 不做

- 不内置 Thin/Light/ExtraBold 等其余 10 个字重（项目未使用，白增 ~60MB）。
- 不引入第三方字体服务或 CDN。
- 不改主题变量（字体不属于 §4 颜色契约）。

## 验证

- `pnpm build` 通过，`dist/assets/` 出现 woff2。
- dev 下检查中文正文、代码块、菜单/文件树字重、斜体、Nerd 图标。
- 记录安装包体积增量。
