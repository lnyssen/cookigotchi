// Progression longue durée : pièces, quêtes du jour, succès, boutique (chapeaux + décor).
// Stocké à part de la grenouille : ça survit aux générations.

const KEY = "froggotchi-progress-v1";

// --- Catalogue de la boutique d'Ombeline ---
export const SHOP = [
  { id: "noeud", kind: "chapeau", name: "Nœud noir", price: 25 },
  { id: "sorciere", kind: "chapeau", name: "Chapeau de sorcière", price: 60 },
  { id: "fleurs", kind: "chapeau", name: "Couronne de fleurs", price: 75 },
  { id: "hautdeforme", kind: "chapeau", name: "Haut-de-forme", price: 95 },
  { id: "couronne", kind: "chapeau", name: "Couronne", price: 160 },
  { id: "noeuds_rouges", kind: "ombeline", slot: "tete", name: "Nœuds rouges", price: 30 },
  { id: "beret", kind: "ombeline", slot: "tete", name: "Béret bordeaux", price: 45 },
  { id: "cloche", kind: "ombeline", slot: "tete", name: "Chapeau cloche", price: 65 },
  { id: "lunettes", kind: "ombeline", slot: "yeux", name: "Lunettes rondes", price: 35 },
  { id: "bouquet", kind: "ombeline", slot: "main", name: "Bouquet de roses", price: 40 },
  { id: "peluche", kind: "ombeline", slot: "main", name: "Chauve-souris en peluche", price: 55 },
  { id: "parapluie", kind: "ombeline", slot: "main", name: "Parapluie noir", price: 70 },
  { id: "robe_violette", kind: "ombeline", slot: "tenue", name: "Robe violette", price: 80 },
  { id: "robe_rayee", kind: "ombeline", slot: "tenue", name: "Robe à rayures", price: 95 },
  { id: "champignons", kind: "decor", name: "Champignons", price: 25 },
  { id: "lanterne", kind: "decor", name: "Lanterne", price: 35 },
  { id: "citrouille", kind: "decor", name: "Citrouille", price: 45 },
  { id: "chaudron", kind: "decor", name: "Chaudron", price: 60 },
  { id: "corbeau", kind: "decor", name: "Corbeau apprivoisé", price: 75 },
  { id: "chat", kind: "decor", name: "Chat noir", price: 100 },
];

// --- Quêtes du jour (3 tirées au hasard chaque jour) ---
const QUEST_POOL = [
  { id: "calin5", ev: "calin", goal: 5, text: "Fais 5 câlins", reward: 10 },
  { id: "miam3", ev: "miam", goal: 3, text: "Donne 3 cookies", reward: 8 },
  { id: "sieste1", ev: "sieste", goal: 1, text: "Fais faire une sieste", reward: 8 },
  { id: "bain2", ev: "bain", goal: 2, text: "Donne 2 bains", reward: 8 },
  { id: "mouches", ev: "jeu_mouches", goal: 1, text: "Joue au Gobe-mouches", reward: 10 },
  { id: "sonate", ev: "jeu_sonate", goal: 1, text: "Joue à la Sonate des bulles", reward: 10 },
  { id: "cache", ev: "jeu_cache", goal: 1, text: "Joue au Cache-cache", reward: 10 },
  { id: "mouches20", ev: "score_mouches", goal: 20, max: true, text: "Fais 20 points au Gobe-mouches", reward: 15 },
  { id: "sonate4", ev: "score_sonate", goal: 4, max: true, text: "Retiens 4 notes à la Sonate", reward: 12 },
  { id: "cache3", ev: "score_cache", goal: 3, max: true, text: "Trouve le têtard 3 fois en une partie", reward: 12 },
  { id: "ombeline3", ev: "ombeline", goal: 3, text: "Parle 3 fois à Ombeline", reward: 6 },
  { id: "caresse10", ev: "caresse", goal: 10, text: "Caresse ta grenouille 10 fois", reward: 6 },
];
export const QUESTS_BONUS = 15; // les 3 quêtes du jour terminées

// --- Succès (une seule fois, pour toujours) ---
export const ACHIEVEMENTS = [
  { id: "eclosion", ev: "eclosion", goal: 1, name: "Première éclosion", reward: 20 },
  { id: "calin100", ev: "calin", goal: 100, name: "Cent câlins", reward: 50 },
  { id: "miam50", ev: "miam", goal: 50, name: "Chef cuisinière", reward: 40 },
  { id: "bain30", ev: "bain", goal: 30, name: "Toujours toute propre", reward: 40 },
  { id: "etoiles3", ev: "etoiles_mouches", goal: 3, max: true, name: "Trois étoiles", reward: 50 },
  { id: "sonate8", ev: "score_sonate", goal: 8, max: true, name: "Mélomane", reward: 50 },
  { id: "cache5", ev: "score_cache", goal: 5, max: true, name: "Détective", reward: 40 },
  { id: "jeux30", ev: "jeux", goal: 30, name: "Joueuse acharnée", reward: 60 },
  { id: "grenouillette", ev: "stade_grenouillette", goal: 1, name: "Ça grandit", reward: 30 },
  { id: "ado", ev: "stade_grenouille", goal: 1, name: "Une vraie ado", reward: 40 },
  { id: "adulte", ev: "stade_adulte", goal: 1, name: "Grenouille adulte", reward: 60 },
  { id: "amour", ev: "coup_de_coeur", goal: 1, name: "Coup de cœur", reward: 60 },
  { id: "generation2", ev: "generation", goal: 1, name: "Deuxième génération", reward: 80 },
  { id: "sourire", ev: "sourire", goal: 25, max: true, name: "Premier sourire", reward: 30 },
  { id: "arcenciel", ev: "sourire", goal: 100, max: true, name: "Arc-en-ciel", reward: 150 },
  { id: "doree", ev: "doree", goal: 1, name: "Grenouille dorée", reward: 150 },
  { id: "achats5", ev: "achat", goal: 5, name: "Collectionneuse", reward: 60 },
  { id: "jours7", ev: "jour", goal: 7, name: "Une semaine à la mare", reward: 70 },
  { id: "jours30", ev: "jour", goal: 30, name: "Un mois à la mare", reward: 200 },
  { id: "quetes20", ev: "quete", goal: 20, name: "Aventurière", reward: 80 },
  { id: "lettres7", ev: "lettre", goal: 7, name: "Les mots de papa", reward: 70 },
];

const today = () => new Date().toLocaleDateString("fr-CA"); // AAAA-MM-JJ, heure locale

function fresh() {
  return { coins: 0, owned: [], hat: null, girl: {}, counts: {}, best: {}, done: [], quests: null, lastDay: null };
}

export const progress = (() => {
  let d = fresh();
  try { d = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch {}
  return d;
})();

let onEvent = () => {}; // branché par le jeu : affiche les récompenses
export function onProgress(fn) { onEvent = fn; }

function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch {} }

function rollQuests() {
  const pool = [...QUEST_POOL];
  const picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  progress.quests = { day: today(), list: picks.map((q) => ({ id: q.id, n: 0, done: false })), bonus: false };
}

/** À appeler au lancement : nouvelle journée = nouvelles quêtes + pièces de visite. */
export function startDay() {
  if (progress.quests?.day !== today() || progress.quests.list.some((q) => !questDef(q.id))) rollQuests();
  if (progress.lastDay !== today()) {
    progress.lastDay = today();
    progress.coins += 5;
    record("jour", 1);
    onEvent({ type: "visite", coins: 5 });
  }
  save();
}

export const questDef = (id) => QUEST_POOL.find((q) => q.id === id);

/** Enregistre un événement de jeu ; `value` pour les scores (on garde le meilleur). */
export function record(ev, value = 1) {
  if (value <= 0 && ev !== "sourire") return;
  progress.counts[ev] = (progress.counts[ev] ?? 0) + value;
  progress.best[ev] = Math.max(progress.best[ev] ?? 0, value);

  if (progress.quests?.day === today()) {
    for (const q of progress.quests.list) {
      const def = questDef(q.id);
      if (q.done || def.ev !== ev) continue;
      q.n = def.max ? Math.max(q.n, value) : q.n + value;
      if (q.n >= def.goal) {
        q.done = true;
        progress.coins += def.reward;
        progress.counts.quete = (progress.counts.quete ?? 0) + 1;
        onEvent({ type: "quete", text: def.text, coins: def.reward });
      }
    }
    if (!progress.quests.bonus && progress.quests.list.every((q) => q.done)) {
      progress.quests.bonus = true;
      progress.coins += QUESTS_BONUS;
      onEvent({ type: "bonus", coins: QUESTS_BONUS });
    }
  }
  for (const a of ACHIEVEMENTS) {
    if (progress.done.includes(a.id)) continue;
    const v = a.max ? progress.best[a.ev] ?? 0 : progress.counts[a.ev] ?? 0;
    if (v >= a.goal) {
      progress.done.push(a.id);
      progress.coins += a.reward;
      onEvent({ type: "succes", text: a.name, coins: a.reward });
    }
  }
  save();
}

export function achievementValue(a) {
  return Math.min(a.goal, a.max ? progress.best[a.ev] ?? 0 : progress.counts[a.ev] ?? 0);
}

export function buy(id) {
  const item = SHOP.find((i) => i.id === id);
  if (!item || progress.owned.includes(id) || progress.coins < item.price) return false;
  progress.coins -= item.price;
  progress.owned.push(id);
  if (item.kind === "chapeau") progress.hat = id;
  if (item.kind === "ombeline") (progress.girl ??= {})[item.slot] = id;
  save();
  record("achat", 1);
  return true;
}

export function toggleHat(id) {
  progress.hat = progress.hat === id ? null : id;
  save();
}

export const owns = (id) => progress.owned.includes(id);

/** Code secret donné par papa : pièces et/ou objet offert, une seule fois par code. */
export function redeemCode(entry) {
  progress.codes ??= [];
  if (progress.codes.includes(entry.code)) return { already: true };
  progress.codes.push(entry.code);
  if (entry.pieces) progress.coins += entry.pieces;
  const item = entry.objet && SHOP.find((i) => i.id === entry.objet);
  if (item && !progress.owned.includes(item.id)) {
    progress.owned.push(item.id);
    if (item.kind === "chapeau") progress.hat = item.id;
    if (item.kind === "ombeline") (progress.girl ??= {})[item.slot] = item.id;
  }
  save();
  return { ok: true, item };
}

/** Habille / déshabille Ombeline (un objet par emplacement : tête, yeux, main, tenue). */
export function toggleGirl(id) {
  const item = SHOP.find((i) => i.id === id);
  if (!item || item.kind !== "ombeline") return;
  progress.girl ??= {};
  progress.girl[item.slot] = progress.girl[item.slot] === id ? null : id;
  save();
}
