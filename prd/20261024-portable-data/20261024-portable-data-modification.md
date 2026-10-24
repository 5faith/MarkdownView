# 实现记录：便携化数据目录

日期：2026-10-24

## 改动

- `src-tauri/tauri.conf.json`：窗口对象加 `"create": false`，窗口改由 setup 手动创建。
- `src-tauri/src/lib.rs`：
  - 新增 `portable_data_dir()`：取 exe 同目录 `data/`，`create_dir_all` + 写探针文件验证可写，失败返回 `None`。
  - setup 内改为 `WebviewWindowBuilder::from_config(app.handle(), &window_config)` 构建窗口；`portable_data_dir()` 有值时链 `.data_directory(dir)` 再 `window.build()`，保证 WebView2 环境创建前已指定数据目录。

前端零改动：localStorage 属于 WebView 配置档，随 `data_directory` 一起迁移。

## 验证

- `pnpm build` 通过（vue-tsc + vite）。
- `cargo check` 通过（同时校验 `tauri.conf.json` 的 `create` 字段合法）。
- `cargo build` 后直接启动 `target/debug/markdown-view.exe` 约 10 秒：exe 旁自动生成 `data/EBWebView/`（含 Default 配置档、GPUPersistentCache、Crashpad 等），随后结束进程。

## 说明

- Windows / Linux 生效；macOS 的 WKWebView 不支持自定义数据目录，Tauri 会忽略该设置，数据维持系统位置。
- 旧版本升级后，原 `%LOCALAPPDATA%/com.markdownview.app` 内的偏好不会自动迁移，首次启动偏好重置（主题、字号等重新选一次即可）。
- dev 模式数据落在 `target/debug/data/`，git 已忽略。
- 安装版若装进不可写目录（如 Program Files），探测失败自动回退系统目录，不影响启动。
