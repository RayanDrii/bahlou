# Bahlou, application de bureau

Application autonome : aucun navigateur requis. La commande `bahlou` et le menu d'applis
ouvrent sa propre fenêtre. Basée sur Electron.

Trois formats sont fournis dans `dist/` :

| Fichier | Pour qui | Installation |
|---|---|---|
| `Bahlou-2.0.0.AppImage` | **Arch, Ubuntu, toute distro** | aucune install, double-clic |
| `bahlou-desktop_2.0.0_amd64.deb` | **Ubuntu / Debian / Mint** | `sudo apt install ./…deb` |
| `bahlou-desktop-2.0.0.pacman` | **Arch / Manjaro** | `sudo pacman -U …pacman` |

### Ubuntu (.deb)
```bash
sudo apt install ./bahlou-desktop_2.0.0_amd64.deb
```

### Arch (.pacman)
```bash
sudo pacman -U bahlou-desktop-2.0.0.pacman
```

Avec le `.deb` ou le `.pacman`, « Bahlou » apparaît directement dans le menu d'applis.

### AppImage (partout, sans install)
```bash
chmod +x Bahlou-2.0.0.AppImage
./Bahlou-2.0.0.AppImage
# ou pour l'ajouter au menu d'applis avec l'icône :
./install-desktop.sh Bahlou-2.0.0.AppImage
```

Au **premier lancement**, l'appli demande l'**adresse du serveur** (celle donnée par l'admin).
On peut la changer ensuite depuis le menu **Fichier → Changer de serveur**.

## Désinstaller

```bash
./install-desktop.sh desinstaller
```

## Reconstruire l'AppImage (développeur)

```bash
npm install
npm run dist        # produit dist/Bahlou-<version>.AppImage
```

Produit les trois formats. La commande installée s'appelle `bahlou`.

## Fichiers
- `main.js` — fenêtre, barre système, menus, gestion de l'adresse du serveur
- `preload.js` — pont sécurisé pour l'écran de configuration
- `setup.html`, `splash.html`, `offline.html` — écrans locaux : adresse du serveur, démarrage, serveur injoignable
- `build/icon.png` — icône de l'application
- `install-desktop.sh` — installe/désinstalle l'AppImage dans le menu d'applis
