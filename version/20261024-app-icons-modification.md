# 20261024 应用图标与 .md 文件关联图标 — 修改记录

## 改动

| 文件 | 改动 |
| --- | --- |
| `src-tauri/icons/*` | 删除旧的 `32x32.png`、`128x128.png`、`128x128@2x.png`、`icon.icns`、`icon.ico`、`icon.png`；保留 `style3-dark-app-icon-*` / `style3-dark-file-icon-*` |
| `src-tauri/icons/style3-dark-app-icon.icns` | 新增，由 `pnpm tauri icon src-tauri/icons/style3-dark-app-icon.png` 生成（源图 512px，临时目录只取 icns） |
| `src-tauri/tauri.conf.json` | `bundle.icon` 改指新 app 图标；新增 `bundle.resources: ["icons/style3-dark-file-icon.ico"]` |
| `src-tauri/windows/hooks.nsh` | 新增 `NSIS_HOOK_POSTINSTALL`：把关联 ProgID 的 `DefaultIcon` 指到 `$INSTDIR\icons\style3-dark-file-icon.ico`，并 `SHChangeNotify` 刷新图标缓存 |

## 为什么文件图标要写 NSIS 钩子

Tauri 2.11 的 `FileAssociation` schema 只有 `ext/name/description/role/mimeType/contentTypes/rank/exportedType`，**没有 `icon`**；NSIS 模板里关联图标硬编码为：

```
!insertmacro APP_ASSOCIATE "<ext>" "Markdown" "..." "$INSTDIR\${MAINBINARYNAME}.exe,0" ...
```

而 `APP_ASSOCIATE` 把图标写在 `Software\Classes\<ProgID>\DefaultIcon`（ProgID 取 `fileAssociations[].name` = `Markdown`）。所以只能在 `POSTINSTALL`（模板里插在关联注册之后，生成的 `installer.nsi` 第 711 行）里覆盖一次。

## 验证

- `pnpm tauri build --bundles nsis` 通过，产出 `src-tauri/target/release/bundle/nsis/MarkdownView_0.2.6_x64-setup.exe`（43.5 MB）。
- 生成的 `target/release/nsis/x64/installer.nsi` 核对：第 643 行 `File /a "/oname=icons\style3-dark-file-icon.ico"`（与本机 `$INSTDIR\icons\...` 路径一致）、第 648–651 行四个扩展共用 ProgID `Markdown`、第 711 行钩子位于关联注册之后。
- 从产物 exe 提取关联图标，确认是新的 M↓ 深色图标。

## 未验证

- 安装后资源管理器里的 `.md` 图标：需要实际跑一次安装包（会改本机注册表），本次没装。若装完还显示旧图标，用 `ie4uinit.exe -show` 或重启资源管理器刷新缓存。
- 便携版 zip 不执行 NSIS 脚本，`.md` 关联图标不生效（关联本身也没有），属预期。
- macOS 的 `.icns` 只验证了文件生成，没在 mac 上打包。

## 追加修复：任务栏图标模糊

现象：exe 图标正常，运行中的窗口在任务栏 / Alt-Tab 里是糊的。

原因在 Tauri 的窗口图标取法（`tauri-codegen-2.6.3/src/image.rs:57`）：

```rust
let entry = &icon_dir.entries()[0];
```

Windows 分支（`context.rs:214`）只找 `bundle.icon` 里的第一个 `.ico`，然后把**目录第 0 项**解码成 RGBA 当 `default_window_icon`。这套 ICO 由图标生成器按 16→256 顺序写入，第 0 项是 16×16，Windows 要把它拉到 32/48px（100%/150% DPI）显示 → 糊。exe 资源里嵌的是完整多尺寸 ICO，所以资源管理器图标不糊，只有运行中的窗口糊。

修复：把 `style3-dark-app-icon.ico` 的目录项按尺寸从大到小重排（256 在前，16 在后），图像数据不动、只改目录偏移。窗口图标变成 256px，由 Windows 缩到目标尺寸。

注意：

- ICO 目录顺序对 Windows 自身没有影响（它按尺寸挑），只影响 Tauri 这个「取第 0 项」的路径。
- 换图标或重新生成 ICO 时必须保持 256 在前，否则任务栏又会糊。
- `.icns` 和文件关联用的 `style3-dark-file-icon.ico` 不走这段代码，无需处理。

