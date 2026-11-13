# Bahlou Geo

## Intention et périmètre

Ajouter une catégorie Geo au site Bahlou pour jouer entre amis à deviner
des lieux à partir de Google Street View. Utiliser les comptes, le serveur
Node.js sans dépendances et les WebSockets existants. Travailler sur
`feature/bahlou-geo`, avec des commits attribués à Meoxy-arlert, sans
co-auteur ou signature Codex. Ne pas fusionner ni déployer cette branche.

## Approches

- Google Street View : exploration des rues et carte interactive ; nécessite
  une clé Maps JavaScript API et la configuration Google Cloud correspondante.
  C'est l'approche choisie par l'utilisateur.
- Photos fixes : pas de dépendance à Google mais pas de déplacement dans les
  rues. Option présentée et non retenue.

## Expérience proposée

Les paramètres ci-dessous sont des choix proposés par l'agent.

1. Un onglet **Geo**, distinct du Casino, ouvre l'accueil du jeu.
2. Un joueur crée un salon privé ou rejoint un salon par code ou lien.
   Les participants utilisent leur pseudo Bahlou, sans inscription supplémentaire.
3. De 2 à 12 joueurs par salon. L'hôte lance la partie quand tout le monde
   a rejoint. Pas d'entrée de nouveaux joueurs pendant une partie.
4. La partie comporte 5 manches de 90 secondes. Tous voient le même panorama
   de départ ; chacun peut regarder et se déplacer indépendamment.
5. Une carte permet de placer puis confirmer une position. Une réponse
   confirmée ne peut plus être modifiée. Les réponses des autres restent cachées.
6. Quand tous ont répondu ou que le temps est écoulé, afficher la bonne
   position, les propositions, distances et points. Une absence vaut zéro.
   L'hôte lance ensuite la manche suivante.
7. Score par manche : arrondi de `5000 * exp(-distanceKm / 2000)`.
   Classement cumulé puis résultat final ; égalités partagées.
8. Après la finale, l'hôte peut relancer une partie avec les mêmes joueurs.

## Interface

Conserver les polices et la direction graphique Bahlou : fond sombre,
typographie condensée, accents verts pour Geo. Accueil avec création et
connexion à un salon ; attente avec liste des joueurs et lien à copier ;
jeu avec panorama dominant, carte, chronomètre et statut des joueurs ;
résultats avec carte et classement. Sur mobile, carte et panorama restent
accessibles sans masquer le bouton de confirmation. Boutons et formulaires
utilisables au clavier, erreurs lisibles et états de chargement explicites.

## Architecture

- `geo.js` : moteur séparé, routes `/api/geo/*`, salons, validation, scores.
  Injection de l'horloge et du fournisseur de lieux pour les tests.
- `server.js` : installation du module avec les utilitaires existants.
- `public/geo.js` et `public/geo.css` : interface et chargement Google Maps
  uniquement à l'ouverture de Geo. Aucune nouvelle dépendance serveur.
- `public/index.html`, `public/club.js`, `public/app.js` : onglet, vue,
  navigation et abonnement aux événements ciblés `geo:state`.
- `GOOGLE_MAPS_API_KEY` : configuration du serveur, communiquée aux seuls
  utilisateurs connectés pour charger l'API navigateur. Une clé navigateur
  est visible : la restreindre au domaine Bahlou et aux API nécessaires.
  Ne jamais committer de clé, activer de facturation ou créer de projet Google.
- Jeu indisponible avec une explication claire si la clé manque ou si Google
  refuse le chargement ; aucune simulation présentée comme du Street View.

## Lieux et équité

Utiliser un ensemble initial de coordonnées candidates réparties dans le
monde. L'hôte prépare les panoramas disponibles via StreetViewService avant
le lancement ; le serveur conserve les lieux retenus et choisit l'ordre.
Les positions futures ne figurent pas dans l'état public du salon. Le
panorama courant impose la communication d'identifiants et de métadonnées
Google au navigateur : il s'agit d'un jeu amical, sans garantie contre un
joueur inspectant les outils développeur. Ni gains ni mises en bahlous.
Le serveur contrôle l'identité, l'appartenance au salon, la manche, les
coordonnées de réponse, l'échéance et le calcul des scores.

## Cycle de vie

Salons en mémoire, expirés après une heure sans activité et perdus lors
d'un redémarrage ; cette limite est indiquée dans la documentation.
Un rechargement retrouve le salon et le temps restant via l'état serveur.
Une déconnexion ne bloque pas l'échéance. Quitter pendant une manche ne
permet pas de rejouer ; le départ définitif de l'hôte transfère le rôle
au prochain participant. Un salon vide est supprimé. Limiter les salons
et les créations par utilisateur pour éviter les accumulations.

## Vérification et livraison

Tests Node natifs : création et accès, appartenance, privilèges hôte,
transitions, réponses en double ou tardives, distance et score, expiration,
reconnexion, confidentialité des propositions et prochains lieux.
Test HTTP avec plusieurs comptes isolés et données temporaires ; contrôle
de la navigation et de la présentation dans le navigateur si disponible.
L'exploration réelle Street View nécessite une clé configurée et sera
signalée comme non vérifiée tant que cette clé n'est pas disponible.
Livrer les changements sur la branche avec instructions de configuration
et résultats des vérifications. Ne pas modifier les autres jeux.
