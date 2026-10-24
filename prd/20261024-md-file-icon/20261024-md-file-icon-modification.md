# 修复：.md 文件在 Explorer 显示 app 图标而非文档图标

日期：2026-10-24

## 问题

Explorer 里 .md 文件全部显示软件图标（app icon），`icons/style3-dark-file-icon.ico` 没有被用上；软件自身图标正常。

## 排查结论

1. `bundle.resources` 只是把 ico 拷进安装目录，不参与文件关联注册。
2. Tauri 2 的 `fileAssociations` **没有 per-association icon 字段**（tauri-utils `FileAssociation` 结构无 icon），NSIS 模板（`APP_ASSOCIATE`）一律写 `DefaultIcon = $INSTDIR\{主程序}.exe,0`，所以注册出来的 ProgId 图标就是 app 图标。
3. 该机器实际生效的链路：`FileExts\.md\UserChoice = Applications\markdown-view.exe`（便携 exe + 手动"始终以此应用打开"）。`Applications\*` 类 ProgId 永远显示 exe 自带图标，任何 `DefaultIcon` 改写都不影响它。
4. 此前 `hooks.nsh` 里写 `Software\Classes\Markdown\DefaultIcon` 的钩子方向正确，但机器上是便携运行，安装器从未执行；且卸载后 `Markdown` ProgId 已不存在（只剩 `.md` 下 `Markdown_backup` 残值）。

## 修复

### 仓库（安装器路径）

- `tauri.conf.json`：4 个 fileAssociations 的 `name`（= ProgId）由通用的 `Markdown` 改为唯一的 `MarkdownView.md` / `.markdown` / `.mdown` / `.mkd`，避免与其它软件（WPS 等也注册 Markdown ProgId）互相覆盖。
- `windows/hooks.nsh`（UTF-8 重写）：`NSIS_HOOK_POSTINSTALL` 为 4 个 ProgId 写 `DefaultIcon = $INSTDIR\icons\style3-dark-file-icon.ico,0`，并保留 `SHChangeNotify` 刷新图标缓存。
- 生效条件：用新配置打出的安装器**重新安装**；此后在 Explorer 重新选择默认打开方式一次（UserChoice 会指向新 ProgId）。

### 本机（便携 exe 路径，立即生效）

- 拷贝 ico 到 `D:\mysoftware\MarkdownView\icons\style3-dark-file-icon.ico`。
- 注册 `HKCU\Software\Classes\MarkdownView.md`（DefaultIcon 指向该 ico，shell\open\command 指向便携 exe），并把 `MarkdownView.md` 加入 `.md\OpenWithProgids`。
- 剩余一步需用户操作：`UserChoice` 有 hash 保护不能程序化改写——在 Explorer 里对任意 .md 右键 → 打开方式 → 选择其他应用 → 选 "MarkdownView Markdown 文档" → 始终。完成后 `UserChoice` 指向新 ProgId，.md 图标变为文档图标。

## 验证

- `cargo check` 通过（配置 schema 合法）。
- 注册表确认：`HKCR\MarkdownView.md\DefaultIcon` = ico 路径；`.md\OpenWithProgids` 含 `MarkdownView.md`。
- 图标最终呈现待用户在 Explorer 重新选择默认应用后确认；若图标未刷新，重启 explorer.exe 清图标缓存。
