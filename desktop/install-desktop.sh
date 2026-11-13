#!/usr/bin/env bash
# Installe l'application de bureau Bahlou (AppImage) sur Arch, Ubuntu, ou toute distro Linux.
#   ./install-desktop.sh              → installe l'AppImage trouvée à côté de ce script
#   ./install-desktop.sh chemin.AppImage
#   ./install-desktop.sh desinstaller
set -euo pipefail

APPS_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$APPS_DIR/Bahlou.AppImage"

g() { printf '\033[1;32m%s\033[0m\n' "$*"; }

if [ "${1:-}" = "desinstaller" ] || [ "${1:-}" = "uninstall" ]; then
  rm -f "$TARGET" "$APPS_DIR/bahlou" "$DESKTOP_DIR/bahlou.desktop" "$ICON_DIR/bahlou.png"
  command -v update-desktop-database >/dev/null && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
  g "Application Bahlou désinstallée."
  exit 0
fi

SRC="${1:-}"
if [ -z "$SRC" ]; then
  SRC="$(ls "$HERE"/dist/Bahlou-*.AppImage "$HERE"/Bahlou-*.AppImage 2>/dev/null | sort -V | tail -1 || true)"
fi
[ -n "$SRC" ] && [ -f "$SRC" ] || { echo "AppImage introuvable. Donne son chemin : ./install-desktop.sh <fichier.AppImage>"; exit 1; }

mkdir -p "$APPS_DIR" "$DESKTOP_DIR" "$ICON_DIR"
install -m 755 "$SRC" "$TARGET"
ln -sf "$TARGET" "$APPS_DIR/bahlou"
[ -f "$HERE/build/icon.png" ] && cp "$HERE/build/icon.png" "$ICON_DIR/bahlou.png"

cat > "$DESKTOP_DIR/bahlou.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Bahlou
Comment=La messagerie de la promo
Exec=$TARGET
Icon=bahlou
Terminal=false
Categories=Network;Chat;InstantMessaging;
StartupWMClass=Bahlou
EOF
command -v update-desktop-database >/dev/null && update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

g "✔ Application Bahlou installée !"
echo "  Lance-la depuis ton menu d'applis, ou tape : bahlou"
echo "  Au premier lancement, entre l'adresse du serveur donnée par l'admin."
