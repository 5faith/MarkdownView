# 实现记录：文件树筛选类型 / 正则 / 大小写开关

日期：2026-10-24

## 改动

`src/components/FileTree.vue`：

- 模板：输入框下新增 `.file-tree__filters` 一行 4 个开关按钮（仅文件 SVG / 仅目录 SVG / `.*` / `Aa`），`aria-pressed` 标记开启态；结果区在「搜索中…」与「无匹配文件」之间插入「正则表达式无效」提示。
- 脚本：新增 `filterType` / `useRegex` / `caseSensitive` / `regexInvalid` 状态与 `toggleType()`（互斥二选一，可取消）；`buildMatcher()` 按开关构造匹配函数（正则构造失败返回 null）；`walk` 增加类型过滤参数；`triggerSearch(delay)` 供关键词（200ms 防抖）与开关（立即）两条路径复用，正则无效时跳过遍历直接提示。
- 样式：`.file-tree__filter` 小图标按钮（rem 尺寸、主题变量、开启态 accent 描边）。

## 验证

- `pnpm build` 通过。
- CDP 驱动真实 dev 窗口逐项断言（详见 plan 文档「验证」节），类型互斥、取消恢复、正则命中、无效正则提示、大小写开关全部符合预期。
