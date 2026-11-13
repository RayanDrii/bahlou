#!/usr/bin/env bash
# Installation de Bahlou — marche sur Arch et Ubuntu (et la plupart des distros).
#
#   ./install.sh                 → installe l'appli (pour tes potes) : demande l'adresse du serveur
#   ./install.sh https://xxx     → pareil, adresse donnée directement
#   ./install.sh serveur         → installe le serveur (pour celui qui héberge)
#   ./install.sh photos <dossier> → importe les photos de la promo (prenom.nom.jpg)
#   ./install.sh code            → affiche le code d'invitation (sur le serveur)
#   ./install.sh desinstaller    → enlève tout
set -euo pipefail

APP_DIR="$HOME/.local/share/bahlou"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

g() { printf '\033[1;32m%s\033[0m\n' "$*"; }
y() { printf '\033[1;33m%s\033[0m\n' "$*"; }
r() { printf '\033[1;31m%s\033[0m\n' "$*"; }

distro() {
  if command -v pacman >/dev/null; then echo arch
  elif command -v apt-get >/dev/null; then echo ubuntu
  else echo autre; fi
}

# ------------------------------------------------------------------ client
install_client() {
  local url="${1:-}"
  local app; app="$(ls "$SRC_DIR"/desktop/dist/Bahlou-*.AppImage "$SRC_DIR"/Bahlou-*.AppImage 2>/dev/null | sort -V | tail -1 || true)"
  if [[ -z "$app" ]]; then
    r "Application introuvable."
    echo "  Arch   : sudo pacman -U bahlou-desktop-*.pacman"
    echo "  Ubuntu : sudo apt install ./bahlou-desktop_*.deb"
    exit 1
  fi
  if [[ -z "$url" ]]; then
    read -rp "Adresse du serveur Bahlou (donnée par l'admin) : " url
  fi
  url="${url%/}"
  [[ "$url" =~ ^https?:// ]] || url="https://$url"
  "$SRC_DIR/desktop/install-desktop.sh" "$app"
  mkdir -p "$HOME/.config/Bahlou"
  printf '{ "url": "%s" }\n' "$url" > "$HOME/.config/Bahlou/config.json"
  case ":$PATH:" in *":$BIN_DIR:"*) ;; *) y "  (ajoute $BIN_DIR à ton PATH pour la commande « bahlou »)";; esac
}

# ------------------------------------------------------------------ serveur
install_server() {
  if ! command -v node >/dev/null || (( $(node -p 'process.versions.node.split(".")[0]') < 18 )); then
    r "Il faut Node.js 18 ou plus récent."
    case "$(distro)" in
      arch)   echo "  sudo pacman -S nodejs" ;;
      ubuntu) echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs" ;;
      *)      echo "  installe nodejs avec le gestionnaire de paquets de ta distro" ;;
    esac
    echo "Puis relance : ./install.sh serveur"
    exit 1
  fi

  mkdir -p "$APP_DIR/server"
  cp -r "$SRC_DIR/server.js" "$SRC_DIR/games.js" "$SRC_DIR/games-cards.js" "$SRC_DIR/geo.js" "$SRC_DIR/words.js" "$SRC_DIR/words-fr.js" "$SRC_DIR/work.js" "$SRC_DIR/call.js" "$SRC_DIR/admin.js" "$SRC_DIR/work-calendar.json" "$SRC_DIR/package.json" "$SRC_DIR/package-lock.json" "$SRC_DIR/public" "$APP_DIR/server/"
  (cd "$APP_DIR/server" && npm ci --omit=dev --silent)
  # paquets proposés sur la page /telecharger.html
  mkdir -p "$APP_DIR/downloads"
  latest() { ls "$SRC_DIR"/desktop/dist/$1 2>/dev/null | sort -V | tail -1; }
  [ -n "$(latest 'Bahlou-*.AppImage')" ] && cp "$(latest 'Bahlou-*.AppImage')" "$APP_DIR/downloads/Bahlou.AppImage"
  [ -n "$(latest 'bahlou-desktop_*_amd64.deb')" ] && cp "$(latest 'bahlou-desktop_*_amd64.deb')" "$APP_DIR/downloads/bahlou.deb"
  [ -n "$(latest 'bahlou-desktop-*.pacman')" ] && cp "$(latest 'bahlou-desktop-*.pacman')" "$APP_DIR/downloads/bahlou.pacman"
  if [ ! -f "$APP_DIR/work.env" ]; then
    cat > "$APP_DIR/work.env" <<'ENV'
# Réglages de l'onglet Travail. Après modification : systemctl --user restart bahlou
# Client ID d'une OAuth App GitHub avec le Device Flow activé, pour le bouton Connecter GitHub.
GITHUB_CLIENT_ID=
# Pseudos administrateurs, séparés par des virgules.
BAHLOU_ADMIN=
ENV
    chmod 600 "$APP_DIR/work.env"
  fi

  if command -v systemctl >/dev/null && systemctl --user show-environment >/dev/null 2>&1; then
    mkdir -p "$HOME/.config/systemd/user"
    cat > "$HOME/.config/systemd/user/bahlou.service" <<EOF
[Unit]
Description=Serveur Bahlou
After=network-online.target

[Service]
ExecStart=$(command -v node) $APP_DIR/server/server.js
Environment=PORT=${PORT:-3000}
Environment=DATA_DIR=$APP_DIR/data
EnvironmentFile=-$APP_DIR/work.env
Restart=on-failure

[Install]
WantedBy=default.target
EOF
    systemctl --user daemon-reload
    systemctl --user enable --now bahlou.service
    systemctl --user restart bahlou.service
    sleep 1
    g "✔ Serveur Bahlou lancé (il redémarre tout seul avec ta session)."
    echo "  Adresse locale : http://localhost:${PORT:-3000}"
    echo "  Arrêter :        systemctl --user stop bahlou"
    show_code
  else
    y "systemd utilisateur indisponible : lance le serveur à la main avec"
    echo "  DATA_DIR=$APP_DIR/data node $APP_DIR/server/server.js"
  fi
}

show_code() {
  local f="$APP_DIR/data/db.json"
  for _ in 1 2 3 4 5; do [[ -f "$f" ]] && break; sleep 1; done
  [[ -f "$f" ]] && g "  🔑 Code d'invitation : $(node -p "require('$f').invite")"
}

import_photos() {
  local src="${1:-}" dest="$APP_DIR/data/promo-photos" n=0
  [[ -d "$src" ]] || { r "Usage : ./install.sh photos <dossier>  (fichiers nommés prenom.nom.jpg)"; exit 1; }
  mkdir -p "$dest"; chmod 700 "$dest"
  shopt -s nullglob nocaseglob
  for f in "$src"/*.{jpg,jpeg,png,webp}; do
    local base; base="$(basename "${f%.*}" | tr '[:upper:]' '[:lower:]')"; base="${base%@epitech.eu}"
    [[ "$base" =~ ^[a-z0-9._-]{2,32}$ ]] || { y "  ignoré : $(basename "$f")"; continue; }
    if command -v magick >/dev/null; then
      magick "$f" -auto-orient -resize 256x256^ -gravity center -extent 256x256 -strip -quality 88 "$dest/$base.jpg" || continue
    elif [[ "$f" =~ \.(jpg|jpeg)$ ]]; then cp "$f" "$dest/$base.jpg"
    else y "  ignoré (installe imagemagick pour les .png/.webp) : $(basename "$f")"; continue; fi
    n=$((n+1))
  done
  g "✔ $n photo(s) importée(s)."
  systemctl --user restart bahlou 2>/dev/null && echo "  Serveur redémarré : les comptes déjà créés reçoivent leur photo." || true
}

uninstall() {
  systemctl --user disable --now bahlou.service 2>/dev/null || true
  rm -f "$HOME/.config/systemd/user/bahlou.service" "$BIN_DIR/bahlou" "$DESKTOP_DIR/bahlou.desktop" "$ICON_DIR/bahlou.svg"
  rm -rf "$APP_DIR/profile" "$APP_DIR/server" "$APP_DIR/server-url"
  g "Bahlou désinstallé (les messages du serveur sont gardés dans $APP_DIR/data)."
}

case "${1:-}" in
  serveur|server) install_server ;;
  code) show_code ;;
  photos) import_photos "${2:-}" ;;
  desinstaller|uninstall) uninstall ;;
  *) install_client "${1:-}" ;;
esac
