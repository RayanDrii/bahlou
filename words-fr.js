// Bahlou — mots de 5 lettres pour le jeu « Mots » (accents retirés à la lecture).
'use strict';

// mots à deviner : courants, sans pluriel ni conjugaison
const ANSWERS = `
acier adieu agent aider aimer ajout album alibi ambre amour ancre angle animal annee appel arbre arene armee asile astre atome audio avion avoir avril
badge bague balai balle bande banjo barbe baron basse baton belle beton bijou bilan bille blanc blond boire bombe bonus bosse botte boule brave breve brise bruit brume
cable cacao cadre calme canal canot carte casse cause chair champ chant chaos chene chien chose cible cidre clair clone clown coder coeur colle conte corde corps coton coude coupe court crabe crane creme crime croix cruel cuire cycle
danse datte debut delta dense depot desir dette devis digne diner divan doigt douce doute drame drole duree
echec eclat ecole ecran eleve envoi epice epine essai etage etude exact
fable facon faire farce faune faute femme ferme fibre fiche fille final fleur foire force foret forme foule foyer frais franc frein frere frite fruit fumee fusee
galet gamme garde genre geste givre glace globe gomme gorge grace grade grain grand grave grele guide
habit hache haine halte herbe heros heure hiver homme honte hotel huile
ideal idole image index issue
jambe jaune jeton jouer jouet juger juste
kayak kebab
laine lampe lance large larme laser latte leger lever libre ligne limon linge liste litre livre local loger lotus loupe lourd lueur lundi lutin lycee
magie maire major malin maman manie marge marin masse match matin media melon merci merle metal metre metro mieux mince momie monde moral morse moule moyen musee
nager nappe neige noble noter nuage
ocean odeur offre olive ombre oncle opera orage ordre orgue osier otage outil
paire palme panda panne parti passe patte pause payer peche peine pelle pente perle perte peser petit phare phase photo piano piece piege pince pique piste pixel pizza place plage plaie plein pluie plume poche poeme poele poids poing point poire pomme porte poste pouce poule prier prime prise prive proie prose puits
quart quete queue
radar radio rampe ranch rayon regle reine rendu repas rever rhume riche rival robot roche ronde rosee rouge route ruban ruche rugby
sable sabre saint salle salon salut sapin sauce saule savon scene scout seize selle serie serum seuil signe singe sirop sobre socle soeur solde somme sonde sorte soupe sport stade stage stock stylo sucre suite sujet super
table tache talon tante tapis tarte tasse temps tenir tente terme terre texte theme tigre tirer tissu titre toile tombe tonne torse total trace train trait treve tribu tronc
usage usine
vague valet valse vaste veine venir verbe verre verte veste video vieux ville virus viser vitre vivre voile voler voter voyou
wagon zebre zeste
debug linux shell octet
`;

// autres mots acceptés comme essais
const EXTRA = `
abbes abime abord aboie abris accru achat acide actes actif adage admis adore adroit affut agace agees agile agite agnes aigle aigre aigue aille aimes aines ainsi aires aisee ajonc alarme alcool alene alger algue aliment allee alors altos amant amble amene amere amies amont amper ample ampli amuse anges angle anise anode antan aorte apero apnee apres arabe arche ardue arene arete argot arome arret arrha aspic assez assis atlas atoll attes aubes aucun audit aussi autel autos autre avais avait avale avant avare avenu avide aviez avise avons axiom azote
bacon bains baise baisse balle banal banc bancs banni barde barge barre bases basse bassin batte baume baver beaux bebes becot beige belge benet berce beret berge besoin betes beurre biais biche bidet bidon biens bijou biere bigre bilan bingo biper bisou bitte bleme bleus bloc blocs bloque blues boeuf bogue boite boive bonne bonte bords borne bouee bouge bouse bouts boxer braie braise brame bras brebis brise brocs broie brule brune brute buche buees buffle bulle burin buses butte
cabas cache cadet cafes cages cahot caids caler calin campe canne canon capes capot carat carde carpe carre cases caste castor caves ceder celle cendre cents cerne cesse chaire chats chaud chefs cheri chers chics chocs choix chope chute cieux cinema cinq cirer cites civil clans clefs clerc clins clips cloche clous clubs cobra cocon codes coffre cogne coins colis colon comas combat comme commun comte connu copie coque coral corne cosse cotes couds couler coups cours cousin couve crane craie crepe creux crier crise croc crocs crois crue cubes cuves cygne
dague daims dames dards dater dauphin debat debit decor degel delai demis denis dents depit desert dessin detail deuil devant devoir dieux digue dinde dingo diode dire dites divin docte dodue dogme doigts domes donc donne doree dormi dorer doses dotee douce douze dragee drape dresse droit drone dunes durer
eaux ecart echos ecrou edens effet egale egard elans elfes elire elite elles email emois empan encre enfer enfin engin ennui entre envie epais epaule epees epier epris equipe errer escale etait etant etape etats etaux ether ethos etres eveil evite exces exige exile
fades faire faits falot fanal fange farde fards fasse fatal fauve faux fecal feint feles felin fendu fente ferie ferry fetes feuil feves fiche fiche fiers fiere figue filet films filon filou fines fiole firme fixe flair flanc flash fleau flots flous fluor flute focus foins folie fonce fonds fondu fonte foret fosse fouet fouine fours fover frais frime froid front fuire fumer furet futur
gaine galop gamin garce gares garni gauche gaufre gazon geant gelee gemir genie genou gens gerbe gibet gigot gitan glace gland glisse globe gnome goret gosse gouda goule goute gouts goyave graal grece grele grenat grille grive grosse groupe grues guepe guere guets guise
habile haler hales haler halle hamac happe harpe haute haves hello herse heure hibou hippie hisse hobby homard hordes hotte houle houx huile huit humer hutte hydre hymne
icone idees igloo ilots impot inces inde ingre injuste inox ivres
jadis jalon japon jarre jason jeans jesus jette jeudi jeune joies joint jolie joues jours joyau juges juges juillet juin jumeau jupes jupon jurer juron
karma karts kayak kilos kiwis
lacet laide laids laies lance lapin laque larve lasse laver leche leons lepre lequel lesbo lests lettre leurs levee levre lexie liane liber lieue lieux lilas limer lingot lions lires lisse lister litre lobes loden loges loisir longe longs lopin loque lotte louer loups loyal lucre luire lunes lustre lutte luxe lyres
macon madre mages magot maigre mains maint mairie maisons maite malle malte mange manga mango manie manne manoir marbre marche mardi mares marre masse matte mauve maxis meche melee menee menthe menue merde meres merou meson messe mesure metro meute miche micro miels mieux mille mimer mines miser mites mixte moche modes moeurs moine moins moise moite molle monter morne morts motte motos mouche moues mousse moyen mulet murer mures muret muser musee mutin myope
nabot nacre nains naive nanas natal natte navet navre neant nefle negre nerfs nette neuf neufs neveu niais niche nicher nids nimbe noces noeud noire noirs noise noisette nomme nonne notes nouer noyau noyer nuire nuits nulle
obese objet obole odeur oeufs offre oignon oiseau ondee ondes ongle opale optique orage orale orbite orgie orque orteil oseille osons otite ouate ouest oueds ourse outre ovale ovins
pacte pages paien paille pains palais palet palme panel panne panse paons papes pagne parer paris parle parmi parts passe pater patin patio paume pavot paver peaux pedal peine pelle pense pere perdu peril perse peser petale peton peuple peurs phare piafs pieds pieux pilon piles pions pipes pires pitie plait plans plats plier plomb plots pluie plume pneus pocher poils poing poker polar polie pompe ponte ponts popes porcs porto potes pouce poule pouls poupe pouvoir prairie pres preux prise prive probe proie proue prune puant puces pudeur puis pulpe punch punir purge putts
quais quand quart quasi quels queue quick quint quota
rabais racine radis rafle ragot raide rails raies rames rance rangs rapes raser rasta raton ravin rayer reagi recif recit recul redue refus regal regne reins relai relie remis renne repit reste retro reves revue rhume riant ricin rider rieur rimes rince rires risee rites rives rixes robes rocks roder roles romain roman rompu ronce roses rosir rotin roues rouer rouet rouler roux royal ruade rubis rudes ruees ruine rumba ruses russe
sabot sacre sages saine sains saler salir salle sante saper sapin sardine satin sauge saule saute sauve sauts savoir scier sciee score seche sects segment selon semer sense senti serf serre serve servi seule sevre sexes shoot sieur sigle silex simple sinus sites skier smash snack socle soins soirs soldat solde soleil somme somme songe sonne sorti sorts souci souffle soule soupe sourd souris spray sprint squat stand stars stems steak stere stock store strie stuc stupe suave sucer sueur suffit suite suive sumo surfe surgi surpris swing
tabac taire talon tamis tango tanks taper tarif tasse tatou taupe taxer teint telle tempo tenor tente tenue terne tetes tetue thons tiare tiede tiens tiers tigre tilde tique tirer tirs tison toast toges tolle tomes tonus topaze toque torse tortue total totem touer tourd tours trait trame trapu treve tribu trier trios tripe trois trone tropic trous truie tuile tulle tunes turbo tuyau typer
ultra unies union unite urine usage usees usure
vache vagin valet valse vanne vanter vapeur vases veaux veine velin velos venin vente verbe verge verni verso vertu vetir veuve vexer viande vicaire vices vider vides vieil vigie vigne villa vinyl viole viols visas vison vitre vivat vives vocal voeux voici voies voire voisin voler volet volte voter votes vouer voulu voute voyez vrais vrille
yacht yeux yoyos
zebre zeros zones zoner zoom
avoir etre faire dire aller voir savoir pouvoir vouloir venir prendre donner parler mettre tenir sortir partir croire porter sentir rester devenir laisser trouver comprendre
avons avez avais avait aient aurai auras aura serai seras sera etais etait etiez etions fais fait faites faire font ferai fera dites disait vais vont allez allons verra vois voit vient viens venez tiens tient prend prends mets mettre peux peut veux veut sais sait
aimes aimez aimai aimer chante chanta mange manges mangez parle parles parlez jouer joues jouez jouai marche marches marchez pense penses pensez donne donnes donnez trouve trouves trouvez porte portes portez reste restes restez passe passes passez monte montes montez tombe tombes tombez entre entres entrez rentre ferme fermes fermez ouvre ouvres ouvrez lance lances lancez garde gardes gardez cache caches cachez casse casses cassez coupe coupes coupez cours courez court lisez lisent ecris ecrit ecrivez boire buvez dormi dormir dorme dormez finis finit finir finie choisi rougi grandi saisi servi suivi nourri sorti parti senti menti
`;

// noms de 4 lettres dont le pluriel fait 5 lettres (chats, rois…)
const PLURALS = `
acte aile aire ami amie ange anse arme arts axes bain bale bars base bebe bete bise bloc bois bonbon bord bout bras bulle cafe cage camp cane cape cave chat chef choc cerf cils cire clan cles clou code coin cols cone cote cour crin cube cuve dame date dent deux dieu dome dose dune ecu epee etat face fait fete feve fiche fils film flot fois fond four fric gare gaze gens gite gout haie halo hero homme idee ile jeu jour joie joue judo jupe lait lame lion lire lits loge loup luge lune mage main mais mare mari mere mine mode moto mots mule mure mur nain nez nids noix note nuit oeil onde ongle orme ours page pain pair pale pape pare paye peau pere peur pied pile pion pipe plat pneu pois pole pomme pont pore port pote pouf prix puce pull quai race rail rame rang rate reve rime robe role rose roue rues sage sale sapin seau sein sens seul sexe sire site soir sole sort sous stop sucre tabou taxe test tete thon tige tipi tire toit tome tour trou tube tuer type valse vase veau velo vent vers vert veto vide vie vin visa voie voix vol vote yeux zero zone
`;

const norm = (w) => String(w || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
const five = (text) => [...new Set(text.split(/\s+/).map(norm).filter((w) => w.length === 5))];
const answers = five(ANSWERS);
const valid = new Set([...answers, ...five(EXTRA), ...five(PLURALS.split(/\s+/).map((w) => w + 's').join(' '))]);

module.exports = { ANSWERS: answers, VALID: valid, norm };
