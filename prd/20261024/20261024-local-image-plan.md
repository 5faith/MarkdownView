# 本地图片显示 + 粘贴图片落盘

> 实现记录：同目录 `20261024-local-image-modification.md`。

## 背景

1. 编辑器里粘贴图片后，markdown 变成 `![1.00](blob:http://tauri.localhost/…)` —— 这是 Crepe 默认上传行为的内存 blob URL，只在当前会话有效，重启即失效，也没有任何文件落盘。
2. 手写相对路径 `![1.00](图片1.png)` 无法显示：WebView 的源是 `http://tauri.localhost`（dev 为 `http://localhost:14220`），相对路径按虚拟站点解析成 `http://tauri.localhost/图片1.png`，与 md 文件所在的磁盘目录没有任何映射；直接 `file://` 又被 WebView 拦截。

## 目标

1. markdown 里的本地图片（相对路径、绝对路径）都能在编辑器中显示，markdown 文本保持原样（相对路径仍写相对路径，可随目录迁移）。
2. 粘贴 / 上传图片自动落盘到 md 同级的图片目录（默认 `assets/`，设置中可改），markdown 写相对路径。
3. 另存为时，正文引用的相对路径图片一并复制到新位置，引用不断。

## 方案

- **asset 协议**：`tauri.conf.json` 开启 `app.security.assetProtocol`（`enable: true, scope: ["**"]`），前端用 `convertFileSrc(绝对路径)` 生成 `http://asset.localhost/…` 显示 URL。
- **新增 `src/utils/localImage.ts`**：路径解析（相对/绝对/URL 转义）+ `toDisplayUrl`（本地 → asset URL，远程/data:/blob: 原样）+ `extractImageSrcs`（提取正文图片 src）+ `sanitizeImageDir`（设置值规范化：只允许相对路径、去盘符/`..`、空值回退 `assets`）。
- **新增 `src/utils/imageStore.ts`**：`saveImageFile(file, mdPath, imageDir)` —— 用 plugin-fs 建目录写文件，文件名保留原名（非法字符替换），重名加时间戳不覆盖，返回转义后的相对 src（空格/括号/`%` 做 percent-encoding）。
- **Crepe 钩子**（`useMilkdown.ts` 的 `featureConfigs[Crepe.Feature.ImageBlock]`）：
  - `onUpload`：粘贴/上传的图片调 `saveImageFile` 落盘，返回相对路径写入 markdown；文件未保存过（无路径）或写失败时退回 blob URL（旧行为）。
  - `proxyDomURL`：渲染时经 `toDisplayUrl` 把本地路径换成 asset URL，markdown 文本不受影响。
- **设置**：编辑器分组新增「图片保存目录」文本框，偏好 `imageDir`（默认 `assets`），`preferences.ts` 读取时规范化。
- **另存为**（`useFileOperation.ts`）：写完新文件后 `copyReferencedImages` —— 提取正文相对路径图片，从旧目录复制到新目录（保持相同子路径，单张失败不阻断保存）。
- **PDF 导出**（`useExportPdf.ts`）：marked 产出 HTML 后把 `img[src]` 的本地路径统一重写为 asset URL（iframe 是独立文档，相对路径解析不了）。

## 验证

- `pnpm build` 通过。
- CDP 实测（真实 dev 窗口 + 远程调试）：
  - 打开含 `![1.00](图片1.png)` 的 md → 渲染 `src = http://asset.localhost/D%3A/…/%E5%9B%BE%E7%89%871.png`，`naturalWidth = 1`（真实显示）。
  - 合成 ClipboardEvent 粘贴 PNG → 磁盘出现 `assets/截图 测试.png`，markdown 写入 `![1.00](assets/截图%20测试.png)`，渲染 `naturalWidth = 1`。
  - 再次粘贴同名文件 → `截图 测试-<时间戳>.png`，不覆盖。
  - 引用不存在文件的图片 → asset URL 但 `naturalWidth = 0`（走 Crepe 加载失败 UI），不报崩溃。

## 已知限制

- 未保存过盘的新文件（Untitled）里粘贴图片仍是 blob URL（没有落盘位置）；保存后再粘才落盘。
- 历史文档里已经写死的 `blob:` 引用无法找回原图，需重新粘贴。
- 图片目录只支持相对 md 文件的路径（含子目录如 `assets/pic`），不支持绝对路径。
- 源码模式（textarea/CodeMirror）里粘贴图片不会触发落盘（那里不渲染图片），需切回所见即所得模式。
