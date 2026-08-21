<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## Project

Desktop Markdown editor: **Tauri 2** (Rust) + **Vue 3** (Composition API, `<script setup>`) + **Vditor** (Markdown editor component) + **Pinia** state management. Package manager is **pnpm**.

## Commands

- `pnpm tauri dev` — full app (Tauri + Vite frontend on port 14200)
- `pnpm dev` — frontend only (Vite dev server, port 14200)
- `pnpm build` — typecheck (`vue-tsc -b`) then Vite production build to `dist/`
- `pnpm tauri build` — full Tauri desktop build
- `pnpm clean` — removes stale generated `.js` files from `src/`

No test suite, linter, or formatter is configured.

## Structure

- `src/` — Vue frontend (components, composables, stores, styles, types)
- `src-tauri/` — Rust backend (Tauri plugins: `dialog`, `fs`, `process`, `single-instance`)
- `src-tauri/capabilities/default.json` — Tauri permissions for all windows (`"windows": ["*"]`); must include any new Tauri API used (e.g. `core:window:allow-destroy`, `core:webview:allow-create-webview-window`)
- `public/vditor/dist` — copied + patched Vditor assets (gitignored, auto-generated)
- `scripts/patch-vditor.cjs` — copies vditor from `node_modules` to `public/` and rewrites unpkg CDN URLs to local `/vditor`
- Key components: `VditorEditor`, `CodeMirrorEditor`, `OutlinePane`, `AppBar`, `ConfirmDialog`, `FileTabs`, `TabContextMenu`, `FileTree`, `FileTreeNode`
- Key composables: `useVditor`, `useFileOperation`, `useDragDrop`, `useCloseConfirmation`, `useKeyboardShortcuts`
- Store: `useMarkdownStore` (Pinia) — single store managing tabs, theme, outline, content, workspace
- Path alias: `@/` → `./src/*`

## Gotchas

- **Generated `.js` files exist alongside `.ts`/`.vue` files in `src/`** (e.g. `App.vue.js`, `main.js`, `useMarkdownStore.js`). These are vue-tsc output — never edit them; they get overwritten on build. The `predev` hook and `pnpm clean` remove them.
- **Vditor patching** runs at two points: `scripts/patch-vditor.cjs` (build time + postinstall) copies dist files to `public/vditor/dist` and rewrites CDN URLs; `vite.config.ts` has a `vditorPatch()` Vite plugin that does the same rewrite at dev-time transform. Both ensure Vditor loads assets locally, not from unpkg.
- Vite dev server runs on **port 14200** (strict), HMR on 14201 when `TAURI_DEV_HOST` is set.
- `src-tauri/` is excluded from Vite's file watcher.
- Tauri dev auto-runs `pnpm dev` as `beforeDevCommand`; `pnpm build` as `beforeBuildCommand`.
- `index.html` uses `lang="zh-CN"`.
- `pnpm-workspace.yaml` declares `packages: [.]` — this is NOT a monorepo, just pnpm workspace config for the root package.
- **Multi-window**: new windows are created via `WebviewWindow` with `?workspace=<path>` URL param; `App.vue` reads this on mount to call `store.setWorkspace()`. Capabilities use `"windows": ["*"]` so all windows share permissions.
- **Close confirmation**: `useCloseConfirmation` uses `win.destroy()` (not `exit(0)`) to close only the current window. Adding new Tauri API calls requires adding matching permissions to `capabilities/default.json`.
- **Drag-drop**: handles both files and folders. Dropped folders open as workspace (current window if empty, new window otherwise). Dropped markdown files open as tabs.
- Release workflow: push a `v*.*.*` tag to trigger the GitHub Actions build-and-release CI (builds for Windows, macOS arm64/x64, Ubuntu). See `command.md` for the tag push command.

## Code Conventions

### Frontend (Vue/TypeScript)

- **Components**: `<script setup lang="ts">` only. Order: `<template>` → `<script setup>` → `<style scoped lang="scss">`.
- **Props/Emits**: Type-based `defineProps<{ ... }>()` and `defineEmits<{ eventName: [arg: Type] }>()` (tuple syntax).
- **Refs**: `ref<HTMLElement | null>(null)` for template refs. No `reactive()` — use `ref()` and `computed()` only.
- **Composables**: `use` prefix. Single exported function, returns object of refs/functions. Create store at top. Some expose a `setup()` the consumer must call. Use `onBeforeUnmount` (not `onUnmounted`) for cleanup.
- **Tauri APIs**: Always dynamic `await import()` inside functions, never top-level static imports.
- **Imports**: Relative paths (`../`, `./`). `import type { ... }` for type-only imports. Despite `@/` alias being configured, codebase uses relative paths.
- **Store**: Single Pinia store (`useMarkdownStore`). Setup-function syntax. All state as `ref()`. Explicit return of every needed symbol.
- **Types**: Shared interfaces in `src/types/index.ts`. Component-local types defined in the owning component. PascalCase, no `I` prefix.
- **Styles**: `<style scoped lang="scss">`. BEM naming (`block__element--modifier`). All theming via CSS custom properties (`--bg-primary`, `--text-secondary`, etc.). Flexbox only, no grid. Consistent spacing: 4/8/12/16/24/28px.

### Backend (Rust)

- **Structure**: `main.rs` (minimal entry) + `lib.rs` (all logic). No separate command files.
- **Commands**: `#[tauri::command]` functions, snake_case naming. Return types are simple (no custom error types).
- **Plugins**: Registered via builder chain. Order: `single-instance` (desktop) → `dialog` → `fs` → `process`.
- **Error handling**: `let _ =` for non-critical operations. `expect()` only for fatal setup failures.
- **Traits**: `use tauri::Manager` for window/app access. `use tauri::Emitter` imported locally where needed.
- **Permissions**: Any new Tauri API used in JS requires a matching permission entry in `src-tauri/capabilities/default.json`.

## Version tracking

1. For each requirement, generate two documents: `{yyyyMMdd}-{requirement-name}-plan.md` (requirement plan) and `{yyyyMMdd}-{requirement-name}-modification.md` (modification record).
2. Place documents directly in `version/` directory.
3. Archiving only occurs when a specific requirement named `xxx` is explicitly requested.