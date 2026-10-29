# 文件图标设置（便携版）

日期：2026-10-28

## 需求

设置 → 文件关联里可切换资源管理器中 `.md` 文件的图标：

- **软件图标**（默认）：用 exe 内嵌的 app 图标。
- **文档图标**：在程序旁生成 `icons/style3-dark-file-icon.ico`，并让文件关联指向它。

## 背景

Explorer 取图标的链路取决于 `UserChoice` 指向的 ProgId：

- 手动「打开方式 → markdown-view.exe」→ `Applications\markdown-view.exe`，图标**固定取 exe 内嵌资源**，`DefaultIcon` 改不动。
- 指向自建 ProgId（`MarkdownView.md`）时才读 `DefaultIcon`。

安装版由 `windows/hooks.nsh` 在 POSTINSTALL 写 DefaultIcon；便携版既没有 ico 文件也没有注册代码，所以一直显示 app 图标。

## 方案

- ico 以 `include_bytes!` 嵌入 exe（40 KB），选文档图标时写到 exe 旁 `icons/`，写不了（Program Files）就退到数据目录。
- 写 `HKCU\Software\Classes`（免管理员）：
  - 4 个 ProgId（`.md/.markdown/.mdown/.mkd`，与 `tauri.conf.json`、`hooks.nsh` 一致）：描述、`DefaultIcon`、`shell\open\command`。
  - 各扩展名 `OpenWithProgids` 登记 ProgId。
- 回读校验 DefaultIcon，写失败直接报错给设置弹窗，不静默。
- `SHChangeNotify(SHCNE_ASSOCCHANGED)` 让 Explorer 立刻刷新。
- 启动时若偏好是文档图标则重放一次，便携目录搬家后自愈路径。

## 已知限制

- `UserChoice` 有 hash 保护，脚本无法改写：首次生效仍需在 `.md` 右键 → 打开方式 → 选 “MarkdownView Markdown 文档” → 始终。
- 调试版（`pnpm tauri dev`）拒绝执行：exe 在 `target/debug`，改写会把关联指到临时程序。
- 关闭（选回软件图标）只把 `DefaultIcon` 回指 exe，不删 ProgId，避免 `UserChoice` 指向已删除键导致文件打不开。
