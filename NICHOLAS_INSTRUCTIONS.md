# Nicholas Note-Taker Setup Instructions

A PDF note-taking app for annotating lecture slides. Built with Svelte 5, TypeScript, and Tauri 2.

## Prerequisites

### 1. Install System Dependencies

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

### 2. Install Node.js (v20 or later)

#### Option A: Using nvm (recommended)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
# Restart terminal, then:
nvm install 22
nvm use 22
```

#### Option B: Using package manager

Ubuntu/Debian (via NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Fedora:
```bash
sudo dnf install nodejs
```

### 3. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Follow the prompts, then restart your terminal or run:
source $HOME/.cargo/env
```

Verify installation:
```bash
rustc --version
cargo --version
```

## Running the App

### Development Mode

```bash
cd note-taker-app
npm install
npm run tauri dev
```

This will:
1. Start the Vite dev server
2. Compile the Rust backend
3. Launch the desktop app with hot-reload

### Production Build

```bash
cd note-taker-app
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Usage

1. **Select Workspace**: Click "Change" in the sidebar to choose a folder for storing your notes
2. **Import PDF**: Click "Import PDF" to add a PDF to your workspace
3. **Take Notes**: Type notes in the editor panel next to each PDF page
4. **Markdown**: Click "Preview" to see rendered markdown (supports tables, lists, code blocks)
5. **Zoom**: Use +/- buttons to zoom the PDF view
6. **Save**: Notes auto-save after first manual save (Ctrl+S or click save icon)

## Troubleshooting

### WebKitGTK not found

Make sure you installed the correct version:
- Tauri 2 requires `libwebkit2gtk-4.1-dev` (not 4.0)
- On Fedora, it's `webkit2gtk4.1-devel`

### Rust compilation errors

Try updating Rust:
```bash
rustup update
```

### Node modules issues

Clear and reinstall:
```bash
cd note-taker-app
rm -rf node_modules package-lock.json
npm install
```

### App window is blank or CSS not loading

On some systems, you may need GTK theme settings:
```bash
export XDG_DATA_DIRS="/usr/share:$XDG_DATA_DIRS"
```

## Project Structure

```
Note-Taker-App/
├── note-taker-app/           # Main application
│   ├── src/                  # Svelte frontend
│   │   ├── lib/              # Components and utilities
│   │   └── routes/           # SvelteKit pages
│   ├── src-tauri/            # Rust/Tauri backend
│   └── package.json
├── flake.nix                 # NixOS dev environment
└── NICHOLAS_INSTRUCTIONS.md  # This file
```

## References

- [Tauri 2 Prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Svelte 5 Documentation](https://svelte.dev/docs)
- [Tauri 2 Documentation](https://v2.tauri.app/)
