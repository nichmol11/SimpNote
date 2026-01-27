# Nicholas Note Taker

A lightweight PDF note-taking application for students to annotate lecture slides. Built with Svelte 5, TypeScript, and Tauri 2.

## Development Environment

**NixOS**: Enter the development shell with:
```bash
nix develop
```

Then install npm dependencies and run:
```bash
cd note-taker-app
npm install
npm run tauri dev
```

## Project Structure

```
Note-Taker-App/
├── note-taker-app/           # Main application
│   ├── src/                  # Svelte frontend
│   │   ├── lib/
│   │   │   ├── db.ts              # Dexie - only for directory persistence
│   │   │   ├── fileSystem.ts      # Tauri FS operations
│   │   │   ├── projectStore.svelte.ts  # Svelte 5 state management
│   │   │   ├── Navbar.svelte      # Top navigation bar
│   │   │   ├── PageRow.svelte     # PDF page + notes with zoom/markdown
│   │   │   └── img/Sidebar.svelte # File browser sidebar
│   │   └── routes/
│   │       ├── +page.svelte       # Main application page
│   │       └── +layout.svelte     # Root layout with context
│   ├── src-tauri/            # Rust/Tauri backend
│   │   ├── src/              # Rust source
│   │   ├── Cargo.toml        # Rust dependencies
│   │   └── tauri.conf.json   # Tauri configuration
│   └── package.json          # Node dependencies
├── flake.nix                 # NixOS dev environment
└── project_notes_claude.md   # Original project requirements
```

## Tech Stack

- **Frontend**: Svelte 5 (runes), TypeScript, TailwindCSS 4
- **Desktop**: Tauri 2 (Rust)
- **PDF**: pdfjs-dist
- **Markdown**: marked
- **Storage**: Dexie (IndexedDB for directory only), Tauri FS plugin
- **Build**: Vite 7

## Commands

```bash
npm run dev          # Vite dev server (web only)
npm run tauri dev    # Full Tauri desktop app
npm run build        # Production build
npm run check        # TypeScript checking
npm run lint         # ESLint + Prettier
npm run test         # Vitest unit tests
```

## Implemented Features

### PDF Viewer
- HiDPI rendering with devicePixelRatio support
- Zoom controls (50%-300%): buttons + Ctrl+wheel
- Pan: click-drag when zoomed in
- PDF copied to workspace on import

### Note Editor
- Markdown support via marked.js
- Toggle between Edit/Preview modes per page
- Basic markdown styling (headers, lists, code, blockquotes)

### Autosave
- Enabled after first manual save or when loading existing project
- 2-second debounce after note changes
- "Saving..." indicator in navbar

### File Management
- Workspace folder selection with persistence
- Sidebar with folder/file organization
- Drag-and-drop file/folder reordering
- workspace.json stores folder structure

## Data Model

- **workspace.json**: Folder/note hierarchy in user's working directory
- **[note].json**: Page notes with linkedPdf reference
- **[note].pdf**: Copied PDF file

## Potential Improvements

- mdsvex is configured but unused (no .svx files) - could be removed
- Type errors for Tauri plugins - may need type declarations or tsconfig adjustment

## Sources

- [Svelte 5 $effect docs](https://svelte.dev/docs/svelte/$effect)
- [Svelte 5 $state docs](https://svelte.dev/docs/svelte/$state)
- [marked.js docs](https://marked.js.org/)
