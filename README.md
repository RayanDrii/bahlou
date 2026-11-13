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

## Geo : explorer le monde entre amis

L'onglet **Geo** permet de créer un salon privé et de partager son lien ou son
code avec 2 à 12 joueurs disposant d'un compte Bahlou. Cinq manches de 90 secondes :
explorez le même départ dans Street View, placez votre point sur la carte et
confirmez. La réponse devient définitive ; les propositions sont révélées quand
tous ont répondu ou à la fin du temps. L'hôte lance la manche suivante, puis peut
relancer une partie. Aucune mise et aucun mouvement de bahlous.

### Configuration Google Maps

L'hébergeur doit activer **Maps JavaScript API** dans son projet Google Cloud,
avec la facturation requise par Google, puis fournir `GOOGLE_MAPS_API_KEY` au
processus Node.js. Ne mettez pas la clé dans le dépôt ou une commande partagée.
Pour le service systemd, ajoutez cette variable via `systemctl --user edit bahlou`
(ou l'environnement du service système pour une installation Azure), puis
redémarrez le service. Un lancement sans cette variable laisse le reste du site
fonctionnel et affiche dans Geo une explication de la configuration manquante.

Cette clé est une **clé navigateur**, visible pour les joueurs connectés.
Restreignez-la par référents HTTP à votre domaine Bahlou (avec `/*`) et par API
à Maps JavaScript API ; autorisez séparément localhost uniquement pour les essais.
Configurez les quotas Google et des alertes de budget : Google facture les cartes
et panoramas selon son offre, et une alerte budgétaire ne bloque pas les dépenses.
Le chargement est déclenché au lancement d'une partie ou à l'ouverture de sa carte,
pas dans le Salon ou le Casino. Les marqueurs utilisent le map ID de démonstration
Google, sans personnalisation de carte.

Références officielles : [clé et restrictions](https://developers.google.com/maps/documentation/javascript/get-api-key),
[Street View](https://developers.google.com/maps/documentation/javascript/streetview),
[usage et facturation](https://developers.google.com/maps/documentation/javascript/usage-and-billing).
Une erreur de clé, de facturation, de réseau ou d'imagerie est affichée dans Geo ;
aucune vue simulée ne remplace Street View.

### Mise en service sur le serveur Azure existant

Ces étapes sont destinées à la personne qui possède déjà la clé SSH
`~/.ssh/bahlou_azure` du compte `rayan` et les accès Azure utilisés par
`deploy-azure.sh`. Les faire sur son ordinateur d’administration, pas dans
la console Google Cloud. Elles redémarrent le site et effacent les salons Geo
qui seraient en cours, sans effacer les comptes et messages.

1. Depuis une copie à jour du dépôt, choisir la branche Geo :

   ```bash
   git fetch origin
   git switch feature/bahlou-geo
   git pull --ff-only origin feature/bahlou-geo
   ```

2. Copier le code et redémarrer le service via le script du dépôt :

   ```bash
   ./deploy-azure.sh
   ```

   Il installe le serveur dans `/srv/bahlou/server/`. Si la connexion SSH échoue
   après un changement d’adresse IP, le script utilise la CLI Azure et les
   autorisations Azure existantes pour mettre à jour la règle SSH.

3. Se connecter à la VM et ouvrir la configuration du service :

   ```bash
   ssh -i ~/.ssh/bahlou_azure rayan@bahlou.spaincentral.cloudapp.azure.com
   sudo systemctl edit bahlou
   ```

   Dans la zone modifiable du fichier, avant les commentaires qui indiquent
   que les lignes suivantes seront ignorées, ajouter :

   ```ini
   [Service]
   Environment="GOOGLE_MAPS_API_KEY=REMPLACER_PAR_LA_CLE_GOOGLE"
   ```

   S’il existe déjà une section `[Service]` dans cette zone, ajouter seulement
   la ligne `Environment` dans cette section. Garder les autres réglages.
   Remplacer le texte d’exemple par la clé créée dans Google Cloud.
   Ne pas coller cette clé dans une commande `export` ou dans le dépôt.

4. Enregistrer et quitter l’éditeur. Avec nano : Ctrl+O, Entrée, Ctrl+X.
   Toujours dans la session SSH, appliquer :

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart bahlou
   sudo systemctl is-active bahlou
   ```

   La dernière commande doit afficher `active`. En cas d’échec, consulter
   `sudo journalctl -u bahlou -n 50 --no-pager` sur la VM ; ne pas partager
   de sortie contenant des identifiants ou la clé.

5. Dans le navigateur, ouvrir Bahlou, se connecter et choisir Geo. Créer
   un salon, faire rejoindre un deuxième compte, puis cliquer sur
   **Préparer et lancer**. Les rues doivent s’afficher. Une erreur Google
   nécessite de vérifier Maps JavaScript API, les restrictions de domaine
   de la clé et l’état du compte de facturation.

### Fonctionnement et limites

- Les salons sont privés par code et les événements sont envoyés à leurs membres.
- Les salons restent en mémoire sur **un seul processus** : redémarrer le serveur
  les efface. Ils expirent après une heure sans action ; laisser une page ouverte
  ne conserve pas un salon indéfiniment.
- Recharger la page ou perdre brièvement la connexion conserve sa réponse et le
  chronomètre serveur. « Quitter » est un départ définitif pour la partie ; si
  l'hôte quitte, un autre participant prend la main.
- Les scores sont calculés côté serveur : distance sur la sphère terrestre,
  puis `arrondi(5000 × exp(-distanceKm / 2000))`. Les égalités sont partagées.
- C'est un jeu amical : l'hôte prépare les lieux disponibles dans son navigateur,
  et Google transmet les métadonnées de la vue au navigateur. Il n'y a pas de
  protection contre un joueur inspectant ces données. Les lieux sont choisis
  parmi un premier ensemble de points candidats mondiaux ; l'ordre est mélangé.

### Vérifications locales

Pas de dépendance à installer. `node tests/geo.test.js` vérifie le moteur et
`node tests/geo-http.test.js` lance de vrais serveurs locaux avec des données et
comptes temporaires, puis les supprime. Aucun appel Google n'est effectué par ces
tests. L'affichage et les déplacements Street View doivent être vérifiés avec une
clé Google configurée avant mise en ligne. `npm test` lance l'ensemble des tests.
