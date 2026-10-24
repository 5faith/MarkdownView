# 文件树筛选迁移到 Rust 侧（修复搜索崩溃）

> 实现记录：同目录 `20261024-filetree-search-rust-modification.md`。前置：`prd/20261024-filetree-search-perf/`、`prd/20261024-filetree-filter-options/`。

## 问题

文件树筛选有时导致软件崩溃。崩溃根因是前端遍历：32 路并发递归扇出后实际在飞的 IPC 调用可达上千个，全部挤 WebView2 消息桥（确切机制需崩溃日志确认，但该负载形态是明显异常源）。

## 方案

**保留筛选功能，把遍历与匹配整体迁到 Rust**，前端一次 IPC 拿全部命中：

- 新命令 `search_workspace(root, query, is_regex, case_sensitive, file_type)`：
  - 深度优先遍历（深度上限 8），`file_type()` 不跟随符号链接防软链环；
  - `SEARCH_SKIP` 生成目录跳过清单（大小写不敏感），上限 1000 条命中；
  - 匹配三种形态：子串（按大小写开关折叠）、正则（`regex` crate，构建失败返回「正则表达式无效」）；
  - 类型过滤 `file` / `directory` / `all` 在遍历时应用。
- 前端 `FileTree.vue` 删除 JS 遍历（`walk`、`SEARCH_SKIP`、并发分批等），`triggerSearch` 改为单次 `invoke`；排序（目录优先）与 200 条截断仍在前端；取消令牌保留（丢弃过期响应）。
- 正则有效性由 Rust 侧判定：`catch` 且正则模式开启时显示「正则表达式无效」。注意 Rust `regex` crate 不支持回溯类特性（反向引用、前瞻），与 JS 正则子集不同。
- 新增依赖：`regex = "1"`。

## 验证

- `pnpm build`、`cargo check`、`cargo build` 通过。
- CDP 在页面内直接逐参数断言（工作区 5603 目录 / 11137 文件）：
  - `manual`：全部 19（3 目录）/ 仅文件 16 / 仅目录 3；`CODE` 不区分 656、区分 1；正则 `^(manuals|write-manual)$|\.js$` 561；无效正则返回「正则表达式无效」。
  - 单次搜索耗时约 450ms（原前端串行 15s、并行 JS 约 1.5s），且全程只有 1 次 IPC。
  - UI 集成：输入 "manual" 稳定出 19 命中 / 3 目录。
- 崩溃无法主动复现；如修复后仍有崩溃，需抓取 WebView2 崩溃日志进一步定位。
