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

No test suite, linter, or formatter is configured.

## Structure

- `src/` — Vue frontend (components, composables, stores, styles, types)
- `src-tauri/` — Rust backend (Tauri plugins: `dialog`, `fs`)
- Key components: `VditorEditor`, `PreviewPane`, `OutlinePane`, `AppBar`
- Key composables: `useVditor`, `useFileOperation`, `useOutline`, `useDragDrop`
- Store: `useMarkdownStore` (Pinia)
- Path alias: `@/` → `./src/*`

## Gotchas

- **Generated `.js` files exist alongside `.ts`/`.vue` files in `src/`** (e.g. `App.vue.js`, `main.js`, `useMarkdownStore.js`). These are vue-tsc output — never edit them; they get overwritten on build.
- Vite dev server runs on **port 14200** (strict), HMR on 14201 when `TAURI_DEV_HOST` is set.
- `src-tauri/` is excluded from Vite's file watcher.
- Tauri dev auto-runs `pnpm dev` as `beforeDevCommand`; `pnpm build` as `beforeBuildCommand`.
- No `README` exists — the app self-documents through `DEFAULT_CONTENT` in `useMarkdownStore.ts`.
- `index.html` uses `lang="zh-CN"`.
