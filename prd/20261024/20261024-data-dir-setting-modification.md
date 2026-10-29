# 实现记录：数据目录设置

日期：2026-10-24

## 改动

- `src-tauri/src/lib.rs`：
  - 新增常量 `DATA_DIR_CONFIG`（`data-dir.txt`）、`DATA_DIR_NAME`（`data`）；`probe_dir` / `exe_dir` / `read_custom_data_dir` / `resolve_data_dir` 取代原 `portable_data_dir`。
  - 新命令 `get_data_dir`（返回 `DataDirInfo`：path / default_path / custom）与 `set_data_dir`（`Option<String>`，None 或空串即恢复默认），注册进 `generate_handler!`。
  - setup 内窗口创建改用 `resolve_data_dir()` 决定 `data_directory`。
- `src/components/SettingsDialog.vue`：新增「存储」分组（数据目录行：路径展示 + 「修改…」/「恢复默认」按钮）；打开弹窗时 `invoke('get_data_dir')`；修改流程 = 目录选择 → 确认重启 → `set_data_dir` → `relaunch()`；失败走原生 message 弹窗。
- `src-tauri/capabilities/default.json`：增加 `process:allow-restart`。

## 验证

- `pnpm build` 通过；`cargo check` / `cargo build` 通过。
- 冒烟测试（target/debug exe，逐项确认）：
  - exe 旁 `data-dir.txt` 指向 `target/testdata-portable` → 启动 6 秒后该目录生成 `EBWebView/`（Crashpad、BrowserMetrics 等齐全）。
  - 删除 `data-dir.txt` 与 `data/` → 启动后 `EBWebView/` 重新生成于默认 `data/`。
- 手工待验证：设置弹窗点「修改…」→ 选目录 → 确认后自动重启（GUI 流程，自动化无法覆盖）。

## 说明

- `data-dir.txt` 可手改，UTF-8 一行路径即可生效；相对路径按 exe 目录解析。
- 切换目录不迁移数据，确认弹窗已提示；旧偏好如需保留，关闭应用后手动复制 `data/` 内容到新目录。
