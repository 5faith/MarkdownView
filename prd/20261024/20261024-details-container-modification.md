# 折叠块（:::details）修改记录

## 改动文件

- `package.json` — 新增依赖 `@xz-summer/milkdown-container@^0.1.10`（带 `remark-directive`）。
- `src/composables/useMilkdown.ts` — `create()` 前 `crepe.addFeature((editor) => editor.use(containerPlugin))`。
- `src/main.ts` — 引入 `@xz-summer/milkdown-container/style.css`（排在 Crepe 基础样式之后）。
- `src/composables/useExportPdf.ts` — 导出前把 `:::details[标题]` / `:::` 还原为 `<details><summary>`。
- `src/assets/TEMPLATE.md` — 「隐藏细节」示例改为 `:::details[…]` 语法。
- `.operator/specs/milkdown-v2.md` — 补「容器指令插件」契约。

## 验证结果

- `pnpm build`（vue-tsc + vite build）通过。
- 运行态最小页面验证（Crepe + containerPlugin + 模板片段）：

  ```json
  {
    "detailsExists": true,
    "className": "milkdown-details",
    "summary": "这里是摘要部分。",
    "content": "这里是细节部分。",
    "roundTrip": "### 隐藏细节\n\n:::details[这里是摘要部分。]\n这里是细节部分。\n:::"
  }
  ```

  即：渲染成原生 `<details>`，摘要/正文正确，序列化后语法不变。

## 未做

- 其它容器类型（info/tip/warning/caution/note/important）未做主题色与 PDF 适配。
- 插件自带 CSS 用 px 与自带色变量，未按 `prd/style.md` 改写（第三方样式，仅折叠块相关选择器生效）。

## 第二轮：工具栏列表下拉 + 隐藏细节入口

- `EditorToolbar.vue` — 无序/有序/任务三个按钮合并为一个下拉菜单（列表图标）；下拉用 `position: fixed` 按按钮 rect 定位（工具栏 `overflow-x: auto` 会裁切绝对定位），外部 mousedown / Esc 关闭；表格、隐藏细节也改为图标（SVG 用工具栏统一的描边样式）。
- `MenuBar.vue` — 格式菜单补「隐藏细节」，与工具栏一致。
- `shared/editor.ts` — `FormatKind` 增加 `details`；WYSIWYG 直接构造 `details > details_summary + details_content` 节点插入并选中占位标题「摘要」，源码模式插入 `\n:::details[摘要]\n正文\n:::\n` 并选中「摘要」。

### 验证结果

浏览器内最小页（Crepe + 插件 + 挂载真实 `EditorToolbar`）：

```json
{ "details": { "exists": true, "open": true, "summary": "摘要", "selectionText": "摘要",
    "markdown": ":::details[摘要]\n正文\n:::\n\n原有段落\n" },
  "source": { "text": "\n:::details[摘要]\n正文\n:::\n", "selected": "摘要" },
  "menu": { "open": true, "items": ["•无序列表","1.有序列表","☑任务列表"], "insideViewport": true, "closedAfterPick": true } }
```

修掉的两个坑：`TextSelection` 端点必须按插入后文档实测（`from + 2` 会落在 details 外层，报 "endpoint not pointing into inline content"）；`details_content` 放空段落会序列化成 `<br />`，因此占位正文用「正文」而非空段落。

`pnpm build` 通过。
