# 实现记录：工具栏水平线位置 + 插入图片/链接按钮

对应计划：`20261025-toolbar-image-link-plan.md`。2026-10-25 实现。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `src/shared/editor.ts` | `FormatKind` 扩展 `link` / `image`；新增 `FormatPayload { href? }`，`runFormat(kind, payload?)`；导入 `toggleLinkCommand`；新增 `insertImageFromPicker`（选图 → 落盘/直接引用 → WYSIWYG 建 image-block 节点或源码插文本）；`applySourceFormat` 支持 link |
| `src/components/EditorToolbar.vue` | 水平线按钮移到「行内代码」后；新增「插入图片」按钮（feather image 图标）与「链接」按钮（feather link 图标 + URL 输入弹层 `.editor-toolbar__pop--form`）；`onDocMousedown` / `onDocKeydown` 同时管两个弹层 |

## 实现要点

- `runFormat('image')` 在进入源码分支**之前**拦截：弹文件框是异步流程，源码/所见即所得在流程内部按 `store.sourceMode` 判定（弹窗期间模式可能已切换）。
- 所选图片若已在图片目录内（`dirname(选中路径) === md目录/图片目录`）直接写相对引用，不复制副本；未保存过盘的文件引用绝对路径（asset 协议可显示，保存后再粘同类图才会归置）。
- WYSIWYG 建 `image-block` 节点用 `schema.nodes['image-block']`，`ratio: 1` —— Crepe 的 image-block 把 alt 由 ratio 序列化（`![1.00](src)`），与粘贴行为一致。
- 链接弹层与列表下拉共用「fixed 定位 + document mousedown/Esc 关闭」的模式；`linkHref` 关闭时清空。

## 验证记录

- `pnpm build` 通过。
- CDP 实测：
  1. 顺序：`…行内代码 → 水平线 → …折叠块 → 插入图片 → 链接 → 保存…`（与计划一致）。
  2. WYSIWYG 链接：选中 "link" → 弹层输入 URL → Enter → `hello [link](https://example.com) world`，渲染 `<a>`，弹层关闭。
  3. 源码链接：有选区 → `[world](https://example.com)`；无选区 → 插入 `[链接文本](href)` 占位。
  4. 图片按钮存在且位置正确（不点击——原生文件对话框无法自动化；落盘与节点插入链路同粘贴，已另行实测）。

## 后续修复（同日）：空选区点链接无任何可见变化

**现象**：源码模式点链接会插入 `[链接文本](url)` 占位；切到所见即所得模式再点链接，屏幕上什么都不出现。

**原因**：所见即所得分支用的是 `toggleLinkCommand`（`toggleMark`）。空选区时 `toggleMark` 只设置 ProseMirror 的 stored mark（之后输入的文字才带链接），不产生任何可见节点——与源码模式的占位行为不对齐。

**修复**（`src/shared/editor.ts` 的 `case 'link'`）：
- 空选区：改为插入带 link mark 的占位文本节点「链接文本」。注意 `tr.replaceSelectionWith(text, false)` 必须传 `inheritMarks=false`，默认 `true` 会丢掉节点自带的 link mark（实测 markdown 序列化成裸文本）。
- 有选区：维持 `toggleLinkCommand`（对已链接文本再次执行 = 取消链接）。

**验证**（CDP 真实点击路径）：WYSIWYG 空选区点链接 → markdown 得到 `hello world[链接文本](https://milkdown.nodejs.cn/playground)`，渲染 `<a href>`；`pnpm build` 通过。

**测试脚手架补充坑**：vite HMR 后页面里会同时存在 `/src/shared/editor.ts` 与 `/src/shared/editor.ts?t=<时间戳>` 两个模块实例——裸 import 拿到的是旧实例（`currentEditor` 为 null），直接调它测格式命令会得到「什么都不发生」的假象。测命令前先 `Page.reload` 整页刷新，或用真实按钮点击路径。

## 后续修复（同日）：链接弹层在窗口边缘时「确定」按钮被裁掉

**现象**：链接按钮靠近窗口右缘（或窗口窄）时，固定宽度的弹层整体超出视口，确定按钮不可见，必须手动拉宽窗口。

**修复**（`EditorToolbar.vue`）：
- 新增 `placePop` 通用定位：锚点按钮下方打开后，`nextTick` 量弹层实际尺寸，超出视口右缘 8px 时整体左移夹紧；列表下拉与链接弹层共用。
- 弹层加 `max-width: calc(100vw - 1rem)`，输入框 `flex: 1 1 auto; min-width: 5rem` 可收缩——窗口再窄也是输入框变窄，确定按钮不再被挤出屏。
- **顺带修了一个隐藏 bug**：原先 `placePop` 在 `linkMenu.value = true` 之前调用，Vue 的 `nextTick` 此时只是普通微任务，会排在渲染 flush **之前**执行，量到的是 null（早退不夹紧），弹层输入框的自动聚焦也因此失效。改为先置状态再定位，nextTick 链在 flush 之后，夹紧与聚焦同时生效。

**验证**（CDP + `Emulation.setDeviceMetricsOverride` 窄视口）：600px 窄视口下点链接按钮，弹层自动左移、右缘贴近视口内，确定按钮完整可见；真实点击全流程（弹层聚焦 → 输入 URL → Enter）插入正常。`pnpm build` 通过。

## 后续修复（同日）：链接后输入文字被吸进链接

**现象**：光标放在链接末尾继续输入（含中文），新文字自动变成链接的一部分，无法在链接后添加普通文字。

**原因**：ProseMirror 的 link mark 默认 `inclusive: true`——光标在 mark 边界时 stored marks 包含链接，输入的文字（含输入法 composition）都被追加进链接。

**修复**（`useMilkdown.ts`）：编辑器初始化时覆写 commonmark 预设的 link schema 工厂，加 `inclusive: false`：

```ts
crepe.editor.config((ctx) => {
  ctx.update(linkSchema.ctx.key, (prev) => (c) => ({ ...prev(c), inclusive: false }))
})
```

`inclusive: false` 让 PM 在光标处于 mark 边界时不把该 mark 计入 storedMarks，普通输入与 IME 输入都生效；链接中段（两侧都有链接 mark）输入仍正常延伸链接文本，`toggleLinkCommand` / LinkTooltip 悬浮编辑不受影响。

**验证**（CDP）：链接末尾输入「测试」→ `前文[链接文本](https://note.youdao.com/)测试`（链接外）；链接中段输入 X → `[链接X文本](url)`（链接内延伸）。`pnpm build` 通过。
