# 实现记录：本地图片显示 + 粘贴图片落盘

对应计划：`20261024-local-image-plan.md`。2026-10-24 实现。

## 改动清单

| 文件 | 改动 |
| --- | --- |
| `src-tauri/tauri.conf.json` | 开启 `app.security.assetProtocol`（`enable: true, scope: ["**"]`）；连带 Cargo.lock 新增 `http-range` 依赖（tauri asset 协议所需） |
| `src/utils/localImage.ts` | 新增：路径解析与 asset URL 转换（`isWebUrl` / `isDiskAbsolutePath` / `joinPath` / `dirname` / `basename` / `sanitizeImageDir` / `encodeMdPath` / `resolveLocalImagePath` / `toDisplayUrl` / `extractImageSrcs`） |
| `src/utils/imageStore.ts` | 新增：`saveImageFile` 把剪贴板/上传图片写盘并返回转义后的相对 src |
| `src/composables/useMilkdown.ts` | `featureConfigs[Crepe.Feature.ImageBlock]` 接 `onUpload`（落盘，失败/无路径退 blob）与 `proxyDomURL`（asset URL 渲染） |
| `src/types/index.ts` | `Preferences.imageDir: string`，默认 `'assets'` |
| `src/utils/preferences.ts` | `imageDir` 读取时经 `sanitizeImageDir` 规范化 |
| `src/stores/useMarkdownStore.ts` | `imageDir` ref + 持久化 + 导出 |
| `src/components/SettingsDialog.vue` | 编辑器分组新增「图片保存目录」输入框（`.settings-textinput` 样式）；恢复默认含该项 |
| `src/composables/useFileOperation.ts` | `saveFileAs` 后调 `copyReferencedImages`：正文相对路径图片复制到新目录（相同子路径） |
| `src/composables/useExportPdf.ts` | 导出前把 HTML 里 `img[src]` 的本地路径重写为 asset URL |

## 设计要点

- markdown 文本里**始终保存相对路径**（正斜杠 + percent-encoding），asset URL 只存在于渲染层（`proxyDomURL`）与打印层，md 与图片目录一起移动后引用依然有效。
- `convertFileSrc` 来自 `@tauri-apps/api/core`，是纯字符串转换（读注入的 `__TAURI_INTERNALS__`），静态导入安全，不违反「plugin-* 动态导入」约定。
- `resolveLocalImagePath` 先 `decodeURIComponent` 再解析，兼容手写中文路径与转义路径两种写法。
- 写盘用 plugin-fs（`mkdir recursive` + `writeFile(Uint8Array)`），`fs:write-all` / `fs:scope **` 权限既有，无 Rust 改动。

## 验证记录

- `pnpm build` 通过（vue-tsc + vite）。
- CDP 实测（`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223` 起 dev 窗口，脚本驱动真实 UI）：
  1. 相对路径显示：`![1.00](图片1.png)` → `img.src = http://asset.localhost/D%3A/…/%E5%9B%BE%E7%89%871.png`，`naturalWidth = 1`。
  2. 粘贴落盘：合成 ClipboardEvent 粘贴 PNG「截图 测试.png」→ 磁盘 `assets/截图 测试.png`，markdown `![1.00](assets/截图%20测试.png)`，渲染 `naturalWidth = 1`。
  3. 重名去重：同名再贴 → `截图 测试-<时间戳>.png`。
  4. 失效引用：`assets/不存在.png` → asset URL、`naturalWidth = 0`，走 Crepe 加载失败 UI，不崩。
  5. 设置项：编辑器分组出现「图片保存目录」，默认 `assets`，输入即时入 store 并持久化。

## 后续可选

- 源码模式下粘贴图片落盘（textarea paste 事件插文本）。
- 未保存文件粘贴图片先暂存，首次保存时统一落盘并替换引用。
