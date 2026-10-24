# 20261024 应用图标与 .md 文件关联图标

## 目标

把 Tauri 默认图标换成设计稿方案三（`style3-dark`）：

- 软件图标（exe / 窗口 / 安装包 / macOS app）：`style3-dark-app-icon.*`
- .md 文件图标（资源管理器里的关联图标）：`style3-dark-file-icon.ico`

图标源在设计仓库 `D:\workspace\zcode\markdownview-icons\`（`README.md` 的「使用建议」指定：桌面图标用 app-icon，文件关联用 file-icon 注册到 `.md`）。

## 方案

1. `src-tauri/icons/` 只保留 `style3-dark-*` 两套；旧的 `32x32.png` / `128x128.png` / `128x128@2x.png` / `icon.icns` / `icon.ico` / `icon.png` 删除（文件树里列的就是这几个）。
2. macOS 缺 `.icns`：用 `pnpm tauri icon src-tauri/icons/style3-dark-app-icon.png -o .tmp-icons` 生成后只取 `icon.icns`，存成 `style3-dark-app-icon.icns`（源图 512px，够 16–512 各档）。
3. `tauri.conf.json` 的 `bundle.icon` 指向新的 app 图标；`.ico` 供 Windows exe，`.icns` 供 macOS，png 供 Linux。
4. 文件关联图标 Tauri 不开放配置（`FileAssociation` 无 `icon` 字段，NSIS 模板把 `DefaultIcon` 固定指向 `$INSTDIR\markdown-view.exe,0`），因此：
   - `bundle.resources` 带上 `icons/style3-dark-file-icon.ico`（安装到 `$INSTDIR\icons\`）；
   - `windows/hooks.nsh` 的 `NSIS_HOOK_POSTINSTALL` 覆盖 `Software\Classes\Markdown\DefaultIcon`（关联的 ProgID 就是 `fileAssociations[].name` 的 `Markdown`），并 `SHChangeNotify` 刷新资源管理器图标缓存。

## 验收

- `pnpm tauri build --bundles nsis` 通过（图标路径、NSIS 钩子语法、资源打包一起验证）。
- 安装后：exe/开始菜单图标为 M↓ 方标；新建或已有 `.md` 显示文档图标（图标缓存未刷新时重启资源管理器）。
- 便携版 zip 不走安装脚本，`.md` 关联图标不生效，属预期。
