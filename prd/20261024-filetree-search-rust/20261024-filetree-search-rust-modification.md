# 实现记录：文件树筛选迁移到 Rust 侧

日期：2026-10-24

## 改动

- `src-tauri/Cargo.toml`：新增 `regex = "1"`。
- `src-tauri/src/lib.rs`：新增 `SearchHit`（serde camelCase）、`walk_search`（DFS、深度 8、跳过生成目录、上限 1000、不跟随符号链接）与命令 `search_workspace`，注册进 `generate_handler!`。
- `src/components/FileTree.vue`：删除前端遍历（`walk` / `SEARCH_SKIP` / 并发分批 / `buildMatcher`），`triggerSearch` 改为单次 `invoke('search_workspace', ...)`；排序与 200 条截断在前端；取消令牌与「搜索中…」「正则表达式无效」提示保留。
- `AGENTS.md`：lib.rs 结构说明补充 `search_workspace` 及「勿改回前端遍历」警告。

## 验证

- `pnpm build` / `cargo check` / `cargo build` 通过。
- CDP 直接调用命令逐参数断言全部符合预期（类型过滤、正则、大小写、无效正则错误消息），单次搜索约 450ms、仅 1 次 IPC；UI 集成输入 "manual" 稳定 19 命中 / 3 目录。

## 说明

- 崩溃无法主动复现验证「已修复」，但根因（上千并发 IPC）已消除；若仍崩溃需另查 WebView2 崩溃日志。
- Rust 正则与 JS 正则语法子集不同（不支持反向引用/前瞻），不支持的写法会走「正则表达式无效」提示。

## 后续调整（同日）：请求节流

用户反馈不要每次输入都发请求。原实现仅 200ms 防抖，而人的打字间隔普遍 200–400ms，慢速输入时几乎逐键触发搜索（每次后端全树遍历约 450ms）。

- `FileTree.vue`：`SEARCH_DEBOUNCE_MS = 300`（输入防抖）+ `SEARCH_MIN_INTERVAL_MS = 800`（两次请求最小间隔，节流）。`runSearch` 触发时若距上次请求不足间隔则顺延重试；开关切换的立即重搜同样受约束。
- 验证：CDP 观测「搜索中…」指示条出现次数——逐键输入 'm'/'a'/'n'（500ms 间隔）真实请求 2 次（首键 + 停手补查），最终结果为完整查询的正确命中；`pnpm build` 通过。

## 后续调整（同日）：防抖/间隔加入设置

- `types/index.ts`：`Preferences` 新增 `searchDebounceMs`（默认 300）/ `searchIntervalMs`（默认 800）。
- `useMarkdownStore`：新增同名 ref 并纳入 `savePreferences` 持久化；`preferences.ts` 归一化（防抖 0–2000、间隔 0–5000）。
- `SettingsDialog.vue`：新增「文件树」分组，两个下拉框（搜索防抖 100/300/500/1000、搜索间隔 300/800/1500/3000），「恢复默认」一并重置。
- `FileTree.vue`：防抖/节流常量改为读 store（`triggerSearch` 默认延迟与 `runSearch` 间隔均来自偏好，改完即时生效，无需重启）。
- 验证：旧偏好数据迁移为默认值 300/800；改值后写入 localStorage 且重载恢复；100/300 下快速输入搜索结果正常；`pnpm build` 通过。
