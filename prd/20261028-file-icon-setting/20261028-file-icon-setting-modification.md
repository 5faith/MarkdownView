# 文件图标设置：修改记录

日期：2026-10-28

## 改动

### 前端

- `src/types/index.ts` — 新增 `FileIcon = 'app' | 'doc'`，`Preferences.fileIcon` 默认 `'app'`。
- `src/utils/preferences.ts` — 读取时收敛非法值为 `'app'`。
- `src/stores/useMarkdownStore.ts` — `fileIcon` 状态、随偏好持久化；`applyFileIcon()` 调 Rust；`setFileIcon()` 失败回滚选择并弹错误。
- `src/components/SettingsDialog.vue` — 新增「文件关联 → 文件图标」分段控件（仅 Windows 显示）：按钮里直接展示 app 图标与文档图标（48px，即 Windows「中图标」；`aria-label` 兜底），不写文字；选文档图标时提示需要在“打开方式”里选一次；恢复默认一并重置。两个 ico 由 Vite 直接从 `src-tauri/icons/` 打进前端 assets。
- `src/App.vue` — 启动时若偏好为文档图标，重放一次写入（便携目录搬家自愈）。

### Rust

- `src-tauri/Cargo.toml` — 新增 `winreg = "0.52"`（仅 Windows target）。
- `src-tauri/src/lib.rs`
  - `FILE_ASSOCS` / `FILE_ICON`（`include_bytes!` 内嵌 `icons/style3-dark-file-icon.ico`）。
  - `icon_dir()` — exe 旁 `icons/`，不可写时退到数据目录。
  - `set_file_icon(app, use_file_icon)` — 生成/覆盖 ico，写 HKCU ProgId（DefaultIcon、打开命令、OpenWithProgids），回读校验，`SHChangeNotify` 刷新；调试版直接返回错误。
  - 注册进 `generate_handler!`。

## 验证

- `cargo check` 通过。
- `pnpm build` 通过（仅既有的 chunk 体积警告）。
- 运行时（需正式包）：设置 → 文件图标 → 文档图标 → 应出现 `<exe目录>\icons\style3-dark-file-icon.ico`，注册表 `HKCU\Software\Classes\MarkdownView.md\DefaultIcon` 指向该文件；切回软件图标时指向 exe。
- 待用户确认：Explorer 里 .md 图标是否随切换变化（首次需在“打开方式”里选一次 “MarkdownView Markdown 文档”）。
