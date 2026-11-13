#!/usr/bin/env bash
# Envoie le code de Bahlou sur le serveur Azure et le redémarre. Les données restent sur le serveur.
set -euo pipefail

HOST=bahlou.spaincentral.cloudapp.azure.com
TARGET="rayan@$HOST"
KEY="$HOME/.ssh/bahlou_azure"
cd "$(dirname "$(readlink -f "$0")")"

# la connexion SSH n'est ouverte qu'à ton adresse IP : on la met à jour si tu as changé de réseau
if ! ssh -i "$KEY" -o ConnectTimeout=8 -o BatchMode=yes "$TARGET" true 2>/dev/null; then
  ip=$(curl -fsS --max-time 10 https://api.ipify.org)
  az network nsg rule update -g bahlou-rg --nsg-name bahlou-vmNSG -n ssh-rayan --source-address-prefixes "$ip/32" -o none
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    ssh -i "$KEY" -o ConnectTimeout=8 -o BatchMode=yes "$TARGET" true 2>/dev/null && break
    sleep 3
  done
fi

rsync -az --delete --rsync-path="sudo rsync" -e "ssh -i $KEY" \
  server.js games.js games-cards.js work.js call.js admin.js words.js words-fr.js work-calendar.json package.json package-lock.json public \
  "$TARGET:/srv/bahlou/server/"
ssh -i "$KEY" "$TARGET" 'sudo chown -R bahlou:bahlou /srv/bahlou/server && sudo systemctl restart bahlou && sudo systemctl is-active bahlou'
curl -fsS -o /dev/null --retry 8 --retry-delay 1 --retry-all-errors --max-time 10 "https://$HOST/"
echo "Bahlou est à jour : https://$HOST"
