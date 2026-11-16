# Personnalisation Bahlou

Direction confirmée par l'utilisateur : thème privé dans le navigateur ; profil
public avec bannière, bio et décoration d'avatar. Ajouter armin.tocu comme
administrateur cofondateur, en conservant les administrateurs déjà configurés.

## Approche et contraintes

Étendre le site vanilla existant, sans dépendance. Un module navigateur et sa
feuille de style gèrent les réglages et fiches publiques. Préserver le Salon,
les DM, les jeux et les cosmétiques possédés. Une nouvelle branche part de main.
Les réglages privés ne sont jamais envoyés au serveur : localStorage par compte
et navigateur. Aucun CSS libre ni URL de fond distante. Profils publics stockés
avec le compte et diffusés via la liste des utilisateurs existante.

## Expérience

Depuis Mon profil, ouvrir Personnaliser. Deux zones : apparence privée et profil
public, avec aperçu. Thèmes Bahlou, Minuit, Forêt, Prune ; couleur d'accent libre,
image de fond locale facultative, réinitialisation. Respecter les contrastes et
la préférence de réduction des animations. L'image est réduite avant stockage.

Profil : bio texte de 190 caractères, couleur de bannière et image facultative,
décoration d'avatar parmi aucune, halo, étoiles, couronne, feuillage. Les noms de
compte restent inchangés. Les décorations sont gratuites et distinctes des cadres
de boutique ; ne pas accorder d'objets payants. Cliquer sur un portrait ou nom de
message ouvre la fiche publique ; la fiche propose Écrire en privé. Les clics
habituels sur les lignes de discussions continuent d'ouvrir les DM.

## Serveur et administration

POST /api/profile modifie uniquement le profil de l'utilisateur authentifié.
Valider types, longueurs, couleurs et décorations autorisées ; exposer uniquement
les champs publics. Recevoir les bannières JPEG dans POST /api/profile, valider le contenu et
la taille, puis les stocker séparément par utilisateur authentifié dans avatars.
Le client ne choisit aucun chemin ni propriétaire d'image. Ne pas modifier l'authentification.

armin.tocu est ajouté à la liste administrateur côté serveur, en plus de la
configuration BAHLOU_ADMIN. Aucun compte créé, mot de passe modifié ou cookie
forgé. La modification ne devient effective sur le site qu'après déploiement
par l'hébergeur. Préserver les protections en mode prise de main existantes.

## Vérification et livraison

Tests d'autorisation et de validation du profil, confidentialité des thèmes,
conservation après rechargement, affichage échappé, frontières d'administration.
Tests existants et syntaxe ; inspection ordinateur/mobile dans un serveur local
isolé. Commits sous l'identité de l'utilisateur, sans attribution IA, sur
feature/themes-profils. Aucun déploiement de production ou fusion implicite.
