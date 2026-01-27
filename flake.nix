{
  description = "Note Taker App - Svelte + Tauri development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Node.js
            nodejs_22

            # Rust
            rustToolchain

            # Tauri dependencies
            pkg-config
            openssl
            webkitgtk_4_1
            gtk3
            glib
            libsoup_3
            cairo
            pango
            gdk-pixbuf
            atk

            # NixOS WebKitGTK fix
            gsettings-desktop-schemas
            glib-networking

            # Build tools
            gcc
          ];

          shellHook = ''
            echo "Note Taker development environment"
            echo "Run: cd note-taker-app && npm install && npm run tauri dev"

            # Fix for WebKitGTK rendering on NixOS
            export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS"
            export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"
          '';

          # Environment variables for Tauri/Rust builds
          PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";

          LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
            pkgs.webkitgtk_4_1
            pkgs.gtk3
            pkgs.glib
            pkgs.libsoup_3
            pkgs.cairo
            pkgs.pango
            pkgs.gdk-pixbuf
          ];
        };
      });
}
