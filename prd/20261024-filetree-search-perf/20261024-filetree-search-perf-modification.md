# 实现记录：文件树筛选性能修复

日期：2026-10-24

## 改动

`src/components/FileTree.vue`：

- `walk` 重写为按层并行遍历：每层子目录按 `SEARCH_READ_CONCURRENCY = 32` 并发分批 `readDir`。
- 新增 `searchSeq` 取消令牌与 `searching` 状态；`watch(query)` 在清空时令牌 +1 并取消搜索，完成的搜索凭令牌校验后才写入 `searchResults`。
- 模板增加「搜索中…」提示行（`v-if="searching"`），「无匹配文件」改为 `v-else-if`。
- `SEARCH_SKIP` 扩充 `.venv` / `venv` / `__pycache__` / `.idea` / `.cache` / `.mypy_cache` / `.pytest_cache` / `target` / `build`。
- `onBeforeUnmount` 中令牌 +1，组件卸载中止进行中的搜索。

## 验证

- `pnpm build` 通过。
- CDP 驱动真实 dev 窗口实测：出结果 14.5s → 2.0s；命中项一致；快速连续输入无旧结果覆盖。
