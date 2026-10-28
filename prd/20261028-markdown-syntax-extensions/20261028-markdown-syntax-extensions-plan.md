# 扩展 Markdown 语法：表情 / 告警块 / 脚注 / 定义列表 / `<details>`

> 实现记录：同目录 `20261028-markdown-syntax-extensions-modification.md`。
> 取代 `prd/20261024-details-container/`（`:::details` 写法废弃）。

## 目标

编辑区直接支持 GitHub 的五种写法，并在「插入」菜单里提供入口：

| 语法 | 源文件写法 | 渲染 |
| --- | --- | --- |
| 表情 | `:smile:` | 😄（源文件保留短代码） |
| 告警块 | `> [!NOTE]` 等 5 种 | 左侧色条 + 图标 + 标题 |
| 折叠块 | `<details><summary>…</summary>…</details>` | 可展开收起 |
| 脚注 | `正文[^1]` + `[^1]: 内容` | 上标 + 文末定义 |
| 定义列表 | `术语` + `: 释义` | `dl/dt/dd` |

## 方案

- **底座**：Milkdown 解析器对没有 schema 的 mdast 节点会直接抛错，而项目里没有 `html` 节点——先加块级 `html_block` 兜底节点（等宽文本显示），行内 HTML 降级成文本。
- **折叠块**：自研 `details` / `details_summary` / `details_content` 三个节点；remark 转换把 `<details>` 开标签、中间 Markdown、`</details>` 闭标签合并成 `mdvDetails`，回写同样的 HTML。点击展开的状态由 NodeView 同步回 `open` 属性。
- **告警块**：自研 `alert` 节点（`attrs.type`），remark 转换识别引用首行的 `[!TYPE]` 标记；`toDOM` 输出带内联 SVG 图标与英文标题的 `div.mdv-alert--*`，导出 PDF 复用同一份 DOM。
- **脚注**：Crepe 的 GFM 预设本来就带 `footnote_definition` / `footnote_reference`，只补样式。
- **定义列表**：`remark-definition-list` 负责解析/回写，补 `definition_list` / `definition_term` / `definition_description` 三个 schema。
- **表情**：`gemoji` 提供短代码表；ProseMirror 行内原子节点显示 emoji（源文件回写 `:name:`），配合输入规则即时转换。
- **导出**：不再用 `marked`，改为 `DOMSerializer` 序列化当前文档（节点 `toDOM`），文本节点上替换短代码；五种语法在 PDF 里与编辑区一致。
- **菜单**：`MenuBar` 增加二级下拉，新增「插入」菜单（表情符号 / 告警块 / 折叠内容 / 脚注 / 定义列表）；「格式 → 隐藏细节」移入其中并改名「折叠内容」。
- **依赖**：新增 `gemoji`、`remark-definition-list`；移除 `@xz-summer/milkdown-container`、`marked`。

## 验证

- `pnpm build` 通过。
- `pnpm tauri dev`：模板里的五种语法都能渲染；明暗主题各看一遍。
- 切源码模式检查源文本仍是 GitHub 写法，切回所见即所得不丢内容。
- 打开含未识别 HTML 的文件不崩。
- 导出 PDF 五种语法都正确。

## 已知限制

- `<details>`：`<summary>` 与正文之间需要空行（模板按 GitHub 习惯写）；summary 内不支持行内 Markdown；不支持嵌套 details。
- 告警块回写时标记与正文是两个引用段（`> [!NOTE]` + 空引用行 + 正文），GitHub 仍能识别。
- 旧文件里的 `:::details` 不再折叠，会显示成普通文本。
