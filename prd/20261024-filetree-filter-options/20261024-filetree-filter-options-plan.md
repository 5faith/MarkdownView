# 文件树筛选：类型 / 正则 / 大小写开关

> 实现记录：同目录 `20261024-filetree-filter-options-modification.md`。前置：`prd/20261024-filetree-search-perf/`（筛选性能修复）。

## 目标

筛选框下方增加 4 个点击开关的图标按钮：

1. **仅文件** / 2. **仅目录**——类型二选一，点击开启，再次点击已选中的取消（互斥，不能同时开）；
3. **正则**——关键词按正则表达式匹配（默认子串匹配，不区分大小写）；
4. **Aa（区分大小写）**。

## 方案

- 状态：`filterType: 'all' | 'file' | 'directory'`、`useRegex`、`caseSensitive`、`regexInvalid`，均为组件内会话级状态，不持久化。
- `buildMatcher()` 按开关构造匹配函数：正则模式 `new RegExp(q, caseSensitive ? '' : 'i')`，构造失败返回 `null`；子串模式按大小写开关决定是否折叠大小写。
- `walk` 匹配处叠加类型过滤（`type === 'all' || nodeType === type`）；目录仅影响展示，递归不受影响。
- 开关变化（`watch([filterType, useRegex, caseSensitive])`）且有关键词时立即重搜（不走 200ms 防抖）；复用既有取消令牌，旧搜索结果不会覆盖。
- 正则无效时跳过搜索，直接显示「正则表达式无效」。
- UI：输入框下方一行 4 个小图标按钮（文件/目录为 SVG，正则为 `.*`、大小写为 `Aa` 文本，与 VS Code 搜索一致），开启态描边 accent 色 + `aria-pressed`；尺寸/间距/配色全部走 rem 与主题变量。

## 验证

- `pnpm build` 通过。
- CDP 驱动真实 dev 窗口逐项断言（查询 "manual"，19 全量命中其中 3 目录）：
  - 全部：19 命中（3 目录）；仅文件：16 命中 0 目录；仅目录：3 命中全是目录；取消后恢复 19。
  - `aria-pressed` 随点击正确切换且文件/目录互斥。
  - 正则 `^(manuals|write-manual)$|\.js$` 命中正确的文件与目录集合；无效正则 `(` 显示「正则表达式无效」。
  - `CODE` 不区分大小写 200 命中（触顶），区分大小写 1 命中；`code` 区分大小写 200。
