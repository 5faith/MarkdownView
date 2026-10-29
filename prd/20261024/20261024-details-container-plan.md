# 折叠块（:::details 容器指令）

> 实现记录：同目录 `20261024-details-container-modification.md`。

## 目标

让所见即所得编辑区把 `:::details[摘要]` … `:::` 渲染成原生 `<details>`，可点击展开/收起，并保留原始 Markdown 语法。

## 方案

- 采用 `@xz-summer/milkdown-container@0.1.10`（peer 仅 `@milkdown/kit`），不自己写 schema/NodeView。
- 语法：

  ```markdown
  :::details[这里是摘要部分。]
  这里是细节部分。
  :::
  ```

- 接入点：`useMilkdown.ts` 在 `create()` 前 `crepe.addFeature((editor) => editor.use(containerPlugin))`。
- 样式：`main.ts` 引入插件自带的 `style.css`（明暗随 `data-theme`）。
- `TEMPLATE.md` 的「隐藏细节」改用新语法，作为开箱示例与回归样例。
- PDF 导出（marked）不认指令，导出前正则还原成 `<details>/<summary>`。

## 验证

- `pnpm build` 通过。
- 起 dev server，用最小页面（Crepe + 插件 + 模板片段）确认：DOM 出现 `details.milkdown-details`、`summary` 与正文文本正确、`getMarkdown()` 原样回写指令。

## 已知限制

- 原生 `<details>` HTML 写法不再渲染为折叠块。
- 其它容器类型（info/tip/warning/caution/note/important）插件已内置，但样式与 PDF 导出未专门适配。
