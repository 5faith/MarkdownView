# 工具栏：水平线位置调整 + 插入图片/链接按钮

> 实现记录：同目录 `20261025-toolbar-image-link-modification.md`。

## 需求

1. 水平线按钮从工具栏末尾移到「行内代码」之后。
2. 新增「插入图片」按钮：打开文件选择框 → 图片复制进图片目录（复用粘贴落盘链路）→ 编辑器插入图片块；源码模式插入 `![名称](相对路径)` 文本。
3. 新增「链接」按钮：点击弹出 URL 输入层，确定后把选区文本包成链接（空选区用占位文本）；源码模式插入 `[文本](href)`。

## 方案

- 三个按钮都走 `runFormat` 统一入口（编辑器契约），`FormatKind` 扩展 `link` / `image`，新增 `FormatPayload { href? }`。
- **link**：WYSIWYG 用 commonmark 的 `toggleLinkCommand`（`{ href }`，选区已带链接时 toggle 为取消）；源码模式在 `applySourceFormat` 里包 `[文本](href)`，空选区用 `链接文本` 占位。
- **image**：`insertImageFromPicker`（异步）——plugin-dialog 选图 → 所选图片已在图片目录里则直接引用相对路径（不产生重复副本），否则读文件字节经 `saveImageFile` 落盘（与粘贴同一条链路）；文件未保存过盘时引用绝对路径（asset 协议可显示）。WYSIWYG 建 `image-block` 节点（`{ src, caption: '', ratio: 1 }`，alt 由 ratio 序列化是 Crepe 既有约定）；源码模式在光标处插 `![名称](src)`。
- **链接弹层**：复用列表下拉的 fixed 定位弹层模式（`.editor-toolbar__pop--form`），输入框 + 确定按钮，Enter 确定 / Esc 关闭 / 点击外部关闭。
- 工具栏顺序：撤销 重做 | H1 H2 H3 | B I S `</>` `—`(水平线) | 引用 列表 表格 `{ }` 折叠块 `🖼图片` `🔗链接` | 保存 源码 阅读。

## 验证

- `pnpm build` 通过。
- CDP 实测（真实 dev 窗口）：
  - 按钮顺序与上述一致（`行内代码` 与 `水平线` 相邻，`插入图片`、`链接` 在折叠块之后）。
  - WYSIWYG：选中 "link" → 点链接按钮 → 弹层输入 `https://example.com` → Enter → markdown 变为 `hello [link](https://example.com) world`，渲染出 `<a>`，弹层自动关闭。
  - 源码模式：选中 `world` 执行 link → `hello [world](https://example.com)`；空选区 → 插入 `[链接文本](href)`。
  - 图片按钮：不点击（会弹原生文件框无法自动化）；落盘/插入与粘贴共用 `saveImageFile` + image-block 节点，粘贴链路已于前一日实测通过。
