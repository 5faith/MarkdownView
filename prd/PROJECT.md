# MarkdownView 项目功能与组件总结（重构参考）

> 基于当前代码（v0.2.6, dev 分支）整理。轻量级桌面 Markdown 编辑器：Tauri 2 (Rust) + Vue 3 + Vditor + Pinia，包管理器 pnpm。

## 一、功能清单

### 1. 文件操作（`useFileOperation.ts` + Rust 命令）
- 新建空白文件（标签页）
- 打开文件：系统对话框，任意类型（非 markdown 用 CodeMirror 只读查看？否——CodeMirror 可编辑，按语言高亮）
- 保存 / 另存为：有 path 直接覆写，无 path 弹保存对话框
- 加载内置模板（`src/assets/TEMPLATE.md`，Ctrl+Shift+T）
- 首次启动自动加载模板内容（localStorage `markdownview-launched` 标记）

### 2. 工作区 / 文件树
- 打开文件夹作为工作区（Ctrl+Shift+O 或拖拽）
- `FileTree` 渲染目录树（`FileTreeNode` 递归节点，`material-file-icons` 文件图标），可拖拽调整宽度
- 文件树右键菜单（`FileTreeContextMenu`）：打开文件、在文件管理器中显示（Rust `reveal_in_file_manager`，Win/macOS/Linux 三平台适配）
- 已有工作区时再开新文件夹：询问"新窗口 / 当前窗口"，当前窗口会先确认未保存文件再关闭旧工作区标签

### 3. 多标签页（`FileTabs` + store）
- 切换、关闭、关闭其他、关闭全部（右键菜单 `TabContextMenu`）
- 未保存标记（标题 `*`）、关闭未保存标签时逐级确认弹窗（`showConfirm` → `ConfirmDialog`）
- 打开同一 path 复用已有标签页

### 4. 编辑器（双编辑器引擎）
- **Markdown 文件** → `VditorEditor`（Vditor 3.x），三种模式：ir（即时渲染，默认）/ sv（分屏）/ wysiwyg（所见即所得），偏好持久化
- **非 Markdown 文件**（.txt 及其它）→ `CodeMirrorEditor`（CodeMirror 6），按扩展名加载语言包：js/ts、html、css、json、python、rust、xml、markdown，One Dark 主题
- 字数统计（Vditor counter）、material 图标
- 阅读模式：Vditor `disabled()`，Esc 退出（Ctrl+R 切换）
- 阅读模式与活动文件切换通过 `:key` 强制重建编辑器实例
- 双向同步：store content ↔ 编辑器 value（`useVditor` 用 `externalUpdate` 标志防回环）

### 5. 大纲（`OutlinePane` + `OutlineNode`）
- 仅对 markdown 活动文件显示，解析标题层级成树，点击导航跳转，宽度可拖拽

### 6. 主题
- 亮 / 暗两套，`document.documentElement.dataset.theme` + CSS 自定义属性（global.scss）
- Vditor 编辑器/内容/代码三主题联动（dark|classic、a11y-dark|github）

### 7. PDF 导出（`AppBar.handleExportPdf`）
- 隐藏 iframe 写入 Vditor 渲染后的 HTML + 本地 `/vditor/dist/index.css`，调用浏览器打印生成 PDF
- 导出期间全屏 loading 遮罩

### 8. 文件监听
- `plugin-fs watch`（300ms 防抖）监听活动文件外部修改，自动重载内容并标记已保存
- F5 手动重载活动文件（未保存时确认）+ 刷新文件树

### 9. 多窗口
- `WebviewWindow` 新窗口，URL 参数 `?workspace=<path>`，`App.vue` 挂载时读取并 `setWorkspace`
- 关闭确认：`useCloseConfirmation` 在有未保存文件时拦截，`win.destroy()` 只关当前窗口

### 10. 拖放（`useDragDrop`）
- 拖入文件：markdown（.md .markdown .txt .mdown .mkd，`utils/fileType.ts` 判定）作为标签页打开
- 拖入文件夹：作为工作区打开（空窗口用当前窗口，否则开新窗口），拖拽中显示全屏遮罩

### 11. 桌面集成（Rust 侧）
- 单实例：二次启动聚焦已有窗口，命令行文件参数经 `file-open` 事件转发给主窗口
- 文件关联：md / markdown / mdown / mkd（tauri.conf.json bundle.fileAssociations）
- `get_file_args`：启动参数中的文件路径
- NSIS 安装包（windows/hooks.nsh），Ctrl+C 优雅退出（ctrlc crate）
- GitHub Actions CI：push `v*.*.*` tag 触发 Windows / macOS(arm64/x64) / Ubuntu 构建发布

### 12. 持久化（`utils/preferences.ts`）
- localStorage `markdownview-preferences`：主题、编辑器模式、大纲/文件树显示与宽度、工作区路径（watchEffect 自动保存）
- 面板宽度等 UI 状态恢复

### 13. 快捷键（`useKeyboardShortcuts.ts`）
| 快捷键 | 功能 |
| --- | --- |
| Ctrl+N | 新建文件 |
| Ctrl+O / Ctrl+Shift+O | 打开文件 / 打开文件夹 |
| Ctrl+S / Ctrl+Shift+S | 保存 / 另存为 |
| Ctrl+P | 导出 PDF |
| Ctrl+B | 切换大纲 |
| Ctrl+Shift+D | 切换主题 |
| Ctrl+R | 阅读模式（Esc 退出） |
| Ctrl+Shift+T | 加载模板 |
| F5 | 重载文件 + 刷新文件树 |

## 二、依赖组件

### 前端（package.json dependencies）
| 组件 | 版本 | 用途 |
| --- | --- | --- |
| vue | ^3.5 | UI 框架（Composition API + `<script setup>`） |
| pinia | ^3.0 | 状态管理（单一 store） |
| vditor | ^3.10 | Markdown 编辑器（核心） |
| codemirror | ^6.0 | 代码编辑器（非 md 文件） |
| vue-codemirror | ^6.1 | CodeMirror 的 Vue 封装 |
| @codemirror/lang-* | ^6.x | 语言包：javascript/html/css/json/python/rust/xml/markdown |
| @codemirror/theme-one-dark | ^6.1 | CodeMirror 暗色主题 |
| material-file-icons | ^2.4 | 文件图标（含颜色） |
| @tauri-apps/api | ^2.5 | Tauri 前端 API（invoke/listen/WebviewWindow/webview 拖放） |
| @tauri-apps/plugin-dialog | ^2.2 | 文件/文件夹选择对话框 |
| @tauri-apps/plugin-fs | ^2.3 | 文件读写 + watch |
| @tauri-apps/plugin-process | ^2.2 | 进程控制 |

### 构建链（devDependencies）
vite ^6 + @vitejs/plugin-vue、typescript ^5 + vue-tsc（`pnpm build` 先类型检查）、sass、@tauri-apps/cli ^2.5

### 后端（src-tauri/Cargo.toml）
- tauri 2 + tauri-plugin-single-instance / dialog / fs / process
- ctrlc（退出信号处理）

## 三、代码结构

### 前端 `src/`
| 文件 | 职责 |
| --- | --- |
| App.vue | 布局组装、启动流程（workspace 参数、文件参数、file-open 监听）、拖放遮罩、PDF loading |
| main.ts | 入口：创建 Pinia、挂载 App |
| components/AppBar.vue | 顶栏：文件操作按钮、面板开关、阅读/主题切换、PDF 导出（含 iframe 打印实现） |
| components/FileTabs.vue | 标签条 + 标签右键菜单 + 关闭确认 |
| components/FileTree.vue | 工作区文件树：读取目录（plugin-fs readDir）、宽度拖拽、右键菜单、文件树版本号刷新 |
| components/FileTreeNode.vue | 树节点递归渲染、点击打开文件 |
| components/FileTreeContextMenu.vue | 文件树右键菜单 |
| components/FileIcon.vue | material-file-icons 封装 |
| components/TabContextMenu.vue | 标签右键菜单 |
| components/OutlinePane.vue / OutlineNode.vue | 大纲面板：解析 markdown 标题树、导航、宽度拖拽 |
| components/VditorEditor.vue | Vditor 容器组件 |
| components/CodeMirrorEditor.vue | CodeMirror 容器组件（语言扩展 + 主题） |
| components/ConfirmDialog.vue | 全局确认弹窗 |
| composables/useFileOperation.ts | 打开/保存/另存/新建/打开文件夹（含新窗口逻辑 `openFolderInNewWindow`） |
| composables/useDragDrop.ts | Tauri 拖放事件处理（文件→标签、文件夹→工作区） |
| composables/useKeyboardShortcuts.ts | 全局快捷键 |
| composables/useCloseConfirmation.ts | 关闭确认（win.destroy()） |
| composables/useVditor.ts | Vditor 实例创建、主题/内容 watch 同步 |
| composables/showConfirm.ts | 确认弹窗命令式调用助手 |
| stores/useMarkdownStore.ts | 唯一 Pinia store：标签页、活动文件、主题、模式、面板状态、文件监听、偏好持久化 |
| shared/editor.ts | 当前编辑器实例单例（PDF 导出取值用） |
| utils/fileType.ts | markdown 扩展名判定 |
| utils/preferences.ts | localStorage 偏好读写 |
| types/index.ts | MarkdownFile / FileTreeNode / Preferences / AppTheme / EditorMode |

### 后端 `src-tauri/src/lib.rs`
- `#[tauri::command] get_file_args`：启动文件参数
- `#[tauri::command] reveal_in_file_manager`：三平台资源管理器定位
- 插件注册：single-instance（desktop，含 file-open 事件转发）→ dialog → fs → process
- ctrlc 处理器

### 关键配置
- `tauri.conf.json`：窗口 1200×800（min 800×600）、文件关联、NSIS hooks、devUrl `http://localhost:14220`
- `capabilities/default.json`：权限 `"windows": ["*"]`，dialog/fs/process 权限集合
- `vite.config.ts`：端口 14220（strict）、`vditorPatch()` 插件（CDN URL 重写）、`@/` 别名、src-tauri 排除 watch
- `scripts/patch-vditor.cjs`：拷贝 vditor dist 到 `public/vditor/dist` + 重写 unpkg CDN → 本地（predev/prebuild/postinstall 三时机）

## 四、重构注意事项（代码无法自明的约束）

1. **Vditor 必须本地加载**：CDN 重写由 patch 脚本 + vite 插件双保险完成，换编辑器或升级时勿绕过；`cdn: '/vditor'` 传参遍布 useVditor / PDF 导出。
2. **生成文件勿编辑**：`src/` 中同名 `.js`（vue-tsc 产物）、`public/vditor/dist`（拷贝产物）。
3. **版本号三处同步**：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 必须一致。
4. **新 Tauri API 必须同步加权限**：`src-tauri/capabilities/default.json`。
5. **多窗口约定**：`?workspace=` 参数是窗口与工作区绑定的唯一通道；capabilities 对所有窗口生效。
6. **关闭流程**：必须用 `win.destroy()` 而非 `exit(0)`（多窗口下只关当前窗口）。
7. **Vditor ↔ store 双向同步**靠 `externalUpdate` 标志防回环，`useVditor` 内四处 watch + App.vue 的 `:key` 重建策略是核心同步机制，重构时需整体理解。
8. **dev 端口 14220**（strict），HMR 14221 仅 `TAURI_DEV_HOST` 时启用。
9. 无测试、无 lint、无 formatter 配置（重构时可考虑补齐）。

## 五、重构方向参考（prd/PLAN.md 已记录）

- 计划将编辑器从 Vditor 迁移到 milkdown（详见 `prd/PLAN.md` 待办清单：表格、数学公式、流程图、脑图等组件支持待验证）
- 历史 BUG 修复记录：相对路径图片加载（GitHub issue #3，已解决）
