# 便携化数据目录（data/ 随 exe）

> 实现记录：同目录 `20261024-portable-data-modification.md`。

## 目标

打包后的 exe 把全部应用数据与缓存放在 exe 同目录的 `data/` 文件夹内，形成便携版：

- 偏好设置（localStorage：`markdownview-preferences`、`markdownview-launched`）
- WebView 配置档：HTTP / GPU 缓存、localStorage、崩溃转储等

## 现状分析

应用自身唯一的落盘点是 WebView 数据目录：

- Windows / Linux 上 Tauri 默认放在 `%LOCALAPPDATA%/{identifier}`（WebView2 user data folder），localStorage 也属于其中的一部分。
- 除此之外前端只在用户指定的路径上写 md 文件（`useFileOperation` / `FileTree`），没有其它应用数据或缓存。

因此只需把 WebView 数据目录指到 exe 旁，即可覆盖「所有数据和缓存」。

## 方案

- `tauri.conf.json` 窗口配置加 `create: false`，不在启动时自动建窗。
- `lib.rs` 的 setup 里手动 `WebviewWindowBuilder::from_config(...).build()`；构建前用 `portable_data_dir()` 探测 exe 同目录 `data/` 是否可写（`create_dir_all` + 探针文件），可写则链 `.data_directory(dir)`，不可写（如装进 Program Files）返回 None，走系统默认目录。
- Tauri 的 `data_directory` 会把整个 WebView 配置档搬过去，localStorage 随之迁移，前端代码零改动。

## 验证

- `pnpm build`、`cargo check` 通过。
- 直接运行 target/debug 的 exe，确认自动生成 `data/EBWebView/`。

## 已知限制

- macOS 的 WKWebView 不支持自定义数据目录，数据仍在系统位置（`~/Library`）。
- 切换后首次启动是全新配置档，旧偏好不会自动迁移，会重置一次。
- dev 模式数据在 `target/debug/data/`（`target/` 已被 git 忽略）。
