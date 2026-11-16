# Plan : thèmes et profils

Spec : ../specs/2026-11-17-personnalisation-design.md. Exécution dans la nouvelle
branche feature/themes-profils issue de origin/main, sans dépendance serveur.

- [x] Tests serveur : profil authentifié, validation, image propre, sérialisation publique, administration armin.tocu et préservation des admins configurés.
- [x] Serveur : POST /api/profile, profil public dans publicUsers ; armin.tocu administrateur.
- [x] Client : module de réglages privés validés par compte, images locales compressées et accents contrastés.
- [x] UI : personnalisation et aperçu public, ouverture des profils depuis portraits/noms, conservation des DM et commandes existantes.
- [x] Vérifier les tests, la syntaxe, le navigateur ordinateur/mobile et une revue indépendante ; corriger les défauts observés.
- [x] Enregistrer sur feature/themes-profils avec identité utilisateur ; pas de déploiement.

Points de vigilance : stockage local indisponible/saturé, aucune injection CSS ou
HTML, uploads non possédés, modifications asynchrones lors du changement de fiche,
protection des privilèges pendant une session de prise de main.

Vérification : 40 tests passent, syntaxe JS et diff vérifiés. Thème conservé après rechargement, sauvegarde du profil et fiche mobile contrôlés, aucune erreur console observée. Revue indépendante : trois courses de chargement/sauvegarde d’image corrigées avec des tests RED→GREEN. Règle CSS du rail corrigée pour rendre le portrait cliquable. Livraison sur branche uniquement ; armin.tocu ne sera administrateur en production qu’après déploiement.
