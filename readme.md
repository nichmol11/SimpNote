# SimpNote

SimpNote is a local-first desktop note taking app for working with lecture material and markdown notes.
Built with Svelte 5, TypeScript, and Tauri 2.

## What It Does

- Imports PDFs into a selected workspace and lets you write page-linked notes.
- Supports standalone text notes (`.md`) with markdown edit/preview.
- Provides a sidebar with folders for organizing notes.
- Supports rename, delete, drag/drop reordering, and moving notes between folders.
- Persists sidebar structure and order in `workspace.json`.
- Notes are always saved automatically as you write like in OneNote

## Note Types

- `PDF Note`:
  - Allows notes to taken beside each page in the PDF
  - Stored as a note bundle folder containing:
    - `notes.json`: The user's notes (notes are keyed per PDF page number)
    - `source.pdf`: The associated PDF file
- `Plain Notes`:
  - A single infinite markdown page
  - Stored as a single `<name>.md` file


## Workspace Data Layout

Inside the folder you choose as workspace, the app stores:

- `.system/workspace.json` (sidebar folders, order, and metadata)
- `*.json` (PDF note metadata/content)
- `*.pdf` (copied linked PDFs)
- `*.md` (standalone text notes)

## Prerequisites

### 1. System dependencies

#### Ubuntu / Debian

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Fedora

```bash
sudo dnf check-update
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  libxdo-devel
sudo dnf group install "c-development"
```

#### NixOS

Use the provided flake:

```bash
nix develop
```

### 2. Node.js

Use Node 20+ (Node 22 recommended):

```bash
node --version
```

### 3. Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version
cargo --version
```

## Quick Start

```bash
cd note-taker-app
npm install
npm run tauri dev
```

This starts the Vite frontend and launches the Tauri desktop app.

## Build

```bash
cd note-taker-app
npm run tauri build
```

Bundles are produced under `note-taker-app/src-tauri/target/release/bundle/`.

## Useful Scripts

From `note-taker-app/`:

- `npm run check` - typecheck + Svelte diagnostics
- `npm run lint` - prettier + eslint
- `npm run test` - unit tests
- `npm run tauri dev` - run desktop app in dev
- `npm run tauri build` - produce release build

## Basic Usage

1. Open/select a workspace folder from the sidebar.
2. Create a note:
   - `Import PDF` for page-linked notes, or
   - `New Text Note` for markdown-only notes.
3. Edit notes and use the markdown preview toggle.
4. Use global zoom controls for the note canvas.
5. Click save once to enable autosave for the opened note.
6. Organize notes in sidebar folders via drag and drop.

## Troubleshooting

### WebKitGTK errors

- Tauri 2 requires WebKitGTK 4.1 (`libwebkit2gtk-4.1-dev` / `webkit2gtk4.1-devel`).

### Rust build issues

```bash
rustup update
```

### Node dependency issues

```bash
cd note-taker-app
rm -rf node_modules package-lock.json
npm install
```

### Blank app window on Linux

```bash
export XDG_DATA_DIRS="/usr/share:$XDG_DATA_DIRS"
```

## Repository Layout

```text
Note-Taker-App/
├── note-taker-app/                # Main Svelte + Tauri app
│   ├── src/                       # Frontend source
│   ├── src-tauri/                 # Rust backend / Tauri config
│   └── package.json
├── flake.nix                      # Nix dev environment
└── readme.md
```

## References

- https://v2.tauri.app/start/prerequisites/
- https://v2.tauri.app/
- https://svelte.dev/docs
