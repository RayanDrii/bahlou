// Bahlou — caisses et collection de cartes. Monnaie fictive : rien ne s'achète ni ne se revend en vrai.
'use strict';

// [id, nom, rareté, texte d'illustration, légende]
const SETS = [
  { id: 'piscine', name: 'La Piscine', reward: 40000, cards: [
    ['p1', 'Jour 01', 'c', 'D01', 'Tout allait encore bien.'],
    ['p2', 'Café froid', 'c', '04:12', 'Il était chaud hier.'],
    ['p3', 'my_strlen', 'c', 'len++', 'Le début des ennuis.'],
    ['p4', 'Le Bocal', 'c', 'BOCAL', 'Ils savent. Ils voient tout.'],
    ['p5', 'Rush 1', 'c', 'RUSH', 'Deux jours, zéro sommeil.'],
    ['p6', 'Pointeur fou', 'r', '**p', 'Personne ne sait où il pointe.'],
    ['p7', 'Star', 'r', '*', 'Une étoile, beaucoup de boucles.'],
    ['p8', 'Norminette', 'e', '25', 'Vingt-cinq lignes, pas une de plus.'],
    ['p9', 'Survivant', 'l', 'D13', 'Il a vu la fin de la piscine.'],
  ] },
  { id: 'mouli', name: 'La Moulinette', reward: 60000, cards: [
    ['m1', 'Make error', 'c', 'make', 'Ça compilait chez moi.'],
    ['m2', 'Delivery error', 'c', 'push?', 'Le fichier était sur le bureau.'],
    ['m3', 'No test passed', 'c', '0/26', 'Au moins, c’est constant.'],
    ['m4', 'Coding style', 'c', '-5', 'Une espace de trop.'],
    ['m5', 'Crash', 'c', 'SIG', 'La moulinette n’a rien vu venir.'],
    ['m6', 'Soutenance', 'r', 'Q&A', '« Explique-moi cette ligne. »'],
    ['m7', 'Dernier push', 'r', '19:41', 'Une minute d’avance.'],
    ['m8', 'La Mouli', 'e', 'MOULI', 'Elle ne dort jamais.'],
    ['m9', '100 %', 'l', '100', 'On en parle encore.'],
  ] },
  { id: 'systeme', name: 'Le Système', reward: 80000, cards: [
    ['s1', 'Fuite mémoire', 'c', 'leak', 'Juste quelques octets.'],
    ['s2', 'Warning', 'c', '-Wall', 'Je les lirai plus tard.'],
    ['s3', 'chmod 777', 'c', '777', 'Comme ça, c’est réglé.'],
    ['s4', 'Boucle infinie', 'c', 'for(;;)', 'Presque terminé.'],
    ['s5', 'Double free', 'c', 'free', 'Une fois ne suffisait pas.'],
    ['s6', 'Valgrind', 'r', '0 err', 'Le seul ami honnête.'],
    ['s7', 'Core dumped', 'r', 'core', 'Un souvenir de ton programme.'],
    ['s8', 'Fork bomb', 'e', ':(){}', 'Ne jamais essayer en salle.'],
    ['s9', 'Segfault', 'l', 'SEGV', 'Il frappe sans prévenir.'],
  ] },
  { id: 'salle', name: 'La Salle', reward: 100000, cards: [
    ['b1', 'Le jeton', 'c', '10', 'Le début d’une longue histoire.'],
    ['b2', 'Tapis vert', 'c', 'BET', 'Faites vos jeux.'],
    ['b3', 'Bourse du CROUS', 'c', 'CROUS', 'Dossier en cours de traitement.'],
    ['b4', 'Marvin', 'c', 'BOT', 'Il bluffe mal, il le sait.'],
    ['b5', 'Big Six', 'c', '×40', 'La roue tourne toujours.'],
    ['b6', 'Main de fer', 'r', 'AAAA', 'Quatre as, zéro émotion.'],
    ['b7', 'Triple 7', 'r', '777', 'Trois fois la bonne réponse.'],
    ['b8', 'La Banque', 'e', 'BANK', 'Elle gagne à la fin.'],
    ['b9', 'Bahlou Suprême', 'l', 'B', 'Le trône n’a qu’une place.'],
  ] },
];

const CARDS = SETS.flatMap((s) => s.cards.map(([id, name, rar, art, txt]) => ({ id, name, rar, art, txt, set: s.id })));
const RARITY = { c: { name: 'Commune', sell: 50 }, r: { name: 'Rare', sell: 400 }, e: { name: 'Épique', sell: 4000 }, l: { name: 'Légendaire', sell: 40000 } };
// environ 74 % de retour à la revente, le reste finance la collection
const CASES = [
  { id: 'piscine', name: 'Caisse Piscine', price: 500, odds: { c: 820, r: 150, e: 26, l: 4 } },
  { id: 'tek', name: 'Caisse Tek', price: 2500, odds: { c: 490, r: 360, e: 120, l: 30 } },
  { id: 'legende', name: 'Caisse Légende', price: 15000, odds: { c: 50, r: 270, e: 450, l: 230 } },
];
const COMPLETE_REWARD = 250000;
const REEL = 44, WIN_AT = 36;

module.exports = function installCards({ route, player, rint, emit, addXp, postSystem }) {
  const byId = new Map(CARDS.map((c) => [c.id, c]));
  const pools = Object.fromEntries(Object.keys(RARITY).map((r) => [r, CARDS.filter((c) => c.rar === r)]));

  function draw(box) {
    let n = rint(1000), rar = 'c';
    for (const [k, w] of Object.entries(box.odds)) { if ((n -= w) < 0) { rar = k; break; } }
    return pools[rar][rint(pools[rar].length)];
  }

  function checkSets(name, p) {
    p.setsDone ??= [];
    for (const s of SETS) {
      if (p.setsDone.includes(s.id) || !s.cards.every(([id]) => p.cards[id] > 0)) continue;
      p.setsDone.push(s.id);
      p.coins += s.reward;
      emit(name, { type: 'set', name: s.name, reward: s.reward });
      postSystem(`**${name}** complète la série **${s.name}**.`);
    }
    if (p.setsDone.length === SETS.length && !p.setsDone.includes('all')) {
      p.setsDone.push('all');
      p.coins += COMPLETE_REWARD;
      emit(name, { type: 'set', name: 'Collection complète', reward: COMPLETE_REWARD });
      postSystem(`**${name}** a réuni toute la collection.`);
    }
  }

  route('case/open', (p, b, name) => {
    const box = CASES.find((c) => c.id === String(b.id));
    if (!box) throw new Error('Caisse inconnue');
    if (p.coins < box.price) throw new Error('Pas assez de bahlous');
    p.coins -= box.price;
    p.cards ??= {};
    const card = draw(box);
    const reel = Array.from({ length: REEL }, () => draw(box).id);
    reel[WIN_AT] = card.id;
    const dup = p.cards[card.id] > 0;
    p.cards[card.id] = (p.cards[card.id] || 0) + 1;
    addXp(name, Math.min(40, Math.floor(box.price / 100)));
    checkSets(name, p);
    if (card.rar === 'l') postSystem(`**${name}** tire une carte légendaire : **${card.name}**.`);
    return { card: card.id, reel, at: WIN_AT, dup };
  });

  route('case/sell', (p, b) => {
    const card = byId.get(String(b.id));
    if (!card || !(p.cards?.[card.id] > 1)) throw new Error('Pas de double à revendre');
    p.cards[card.id]--;
    const gain = RARITY[card.rar].sell;
    p.coins += gain;
    return { gain };
  });

  route('case/sell-all', (p) => {
    let gain = 0;
    for (const [id, n] of Object.entries(p.cards || {})) {
      if (n > 1 && byId.has(id)) { gain += (n - 1) * RARITY[byId.get(id).rar].sell; p.cards[id] = 1; }
    }
    if (!gain) throw new Error('Aucun double à revendre');
    p.coins += gain;
    return { gain };
  });

  return { config: { cards: CARDS, sets: SETS.map(({ id, name, reward }) => ({ id, name, reward })), rarity: RARITY, cases: CASES, complete: COMPLETE_REWARD } };
};
