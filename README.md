# 💬 Bahlou

Un seul chat pour toute la promo : photos de profil, réactions, « est en train d'écrire… »,
notifications, mentions `@pseudo`, **gras**, `code` et blocs ```` ``` ````.

Marche sur **Arch** et **Ubuntu** (et toute distro Linux). Aucune dépendance à part Node.js côté serveur.

---

## Pour tes potes (installer l'appli)

```bash
git clone <lien-du-repo> bahlou   # ou décompresse l'archive
cd bahlou
./install.sh https://ADRESSE-DU-SERVEUR
```

C'est tout : « Bahlou » apparaît dans le menu des applis (et la commande `bahlou`).
Ensuite : onglet **Inscription** → pseudo, mot de passe, et le **code d'invitation**.

> Pas envie d'installer ? Ouvre simplement l'adresse du serveur dans ton navigateur, ça marche pareil.

---

## Pour celui qui héberge (le serveur)

```bash
./install.sh serveur
```

- Le serveur tourne en tâche de fond et redémarre avec ta session.
- Le **code d'invitation** s'affiche ; pour le revoir : `./install.sh code`
- Pour en choisir un : `systemctl --user edit bahlou` et ajoute `Environment=INVITE_CODE=monCode`

Ou juste pour tester, sans rien installer : `node server.js`

### Rendre le serveur accessible à tes potes

| Situation | Solution |
|---|---|
| Même Wi-Fi / réseau de l'école | Donne l'adresse `http://TON-IP:3000` affichée au démarrage |
| Partout sur Internet (le plus simple) | `tailscale funnel --bg 3000` → donne l'URL `https://….ts.net` |
| Serveur 24h/24 | Mets-le sur un petit VPS et lance `./install.sh serveur` dessus |

⚠️ Si le serveur est sur ton PC, Bahlou ne marche que quand ton PC est allumé.

---

## Commandes utiles

```bash
systemctl --user status bahlou     # état du serveur
systemctl --user restart bahlou    # redémarrer
./install.sh desinstaller          # tout enlever (les messages sont gardés)
```

Les messages et comptes sont dans `~/.local/share/bahlou/data/db.json`
(mots de passe hachés avec scrypt).

## Le Cercle

Onze jeux intégrés à la messagerie. Tables : Roulette, Blackjack, Hold'em. Jeux : L'Envol (crash multijoueur), La Tour, Mines, La Cascade, Pile ou Face. Machines : La Machine (jackpot progressif), Le Billet, La Grande Roue.

- Moteur : `games.js`, interface : `public/club*.{js,css}`, données : clé `games` de `db.json`.
- Tous les tirages et les soldes sont calculés côté serveur.
- Les bahlous sont fictifs : ni achat, ni échange, ni retrait. À garder ainsi, sinon ça relève de la réglementation des jeux d'argent.
- Déployer : `./install.sh serveur`.
