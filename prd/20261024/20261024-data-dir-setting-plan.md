# 数据目录设置（默认 exe 旁，可在设置中修改）

> 实现记录：同目录 `20261024-data-dir-setting-modification.md`。前置需求：同目录 `20261024-portable-data-*`（便携化数据目录）。

## 目标

- 默认数据目录 = exe 同目录 `data/`（延续便携化改动）。
- 设置弹窗新增「存储」分组：展示当前生效目录，可点「修改…」换到任意可写目录，「恢复默认」清除自定义目录。
- 修改后需重启应用生效（WebView 数据目录只能在窗口创建前指定），确认后自动重启。

## 方案

- 配置存放：exe 同目录 `data-dir.txt`，内容一行路径。数据目录本身决定配置的存放位置，覆盖配置必须锚定在 exe 旁才能避免「先有鸡还是先有蛋」；缺失或空白 = 默认 `data/`。
- 启动解析（`resolve_data_dir`）：自定义目录（可写探测通过）→ 默认 `data/`（可写）→ None（Tauri 回退系统目录）。
- Rust 命令：`get_data_dir`（返回 `path` / `default_path` / `custom`）、`set_data_dir(Option<String>)`（写/删 `data-dir.txt`；写入前 probe 目录可写，失败返回错误信息）。
- 前端 `SettingsDialog`：「存储」分组展示路径（等宽小字、可选中、超长换行）；「修改…」用 plugin-dialog 目录选择 → `showConfirm` 提示重启与不迁移 → `set_data_dir` → plugin-process `relaunch()`；「恢复默认」仅在 custom 时显示；错误用原生 message 弹窗。
- 权限：capabilities 增加 `process:allow-restart`（dialog 的 `allow-message` 已含于 `dialog:default`）。

## 验证

- `pnpm build` / `cargo check` / `cargo build` 通过。
- 冒烟：exe 旁写 `data-dir.txt` 指向测试目录 → 启动后 EBWebView 落在测试目录；删除 `data-dir.txt` → 回退默认 `data/`。两个方向均验证。

## 已知限制

- 切换目录不做数据迁移：WebView 配置档在运行期有锁文件，程序内拷贝不可靠；确认弹窗已提示。想保留偏好可关闭应用后手动把 `data/` 内容复制到新目录。
- macOS WKWebView 不支持自定义数据目录，设置界面仍可操作但 Tauri 会忽略（与前置需求一致）。
