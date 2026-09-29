// Thèmes visuels + textes. « gothique » (par défaut, façon mercredi lugubre, pince-sans-rire)
// ou « pastel » (la version d'origine). Le thème mute les couleurs de config au chargement.
//
// Le « sourire » (0..100) est la jauge secrète du thème gothique : il ne fait que monter
// quand on prend soin de la grenouille, et la mare reprend des couleurs peu à peu.

import * as C from "./config.js";
import { setInk } from "./icons.js";

const KEY = "froggotchi-theme";
let saved = null;
try { saved = localStorage.getItem(KEY); } catch {}
// « hybride » (par défaut) : les couleurs douces et la police ronde de la version grenouille,
// avec l'univers gothique (Ombeline, château, chauves-souris, sourire qui grandit).
export const THEME = { name: ["pastel", "gothique"].includes(saved) ? saved : "hybride" };
THEME.gothic = THEME.name !== "pastel"; // décor + Ombeline (hybride et gothique)
THEME.hybrid = THEME.name === "hybride";
export const NEXT_THEME = { hybride: "gothique", gothique: "pastel", pastel: "hybride" };
export const THEME_LABEL = { hybride: "hybride", gothique: "gothique", pastel: "pastel" };

export function setTheme(name) {
  try { localStorage.setItem(KEY, name); } catch {}
  location.reload();
}

if (THEME.hybrid) {
  // Couleurs pastel d'origine, encre noire commune aux sprites.
  Object.assign(C.COLORS, { trait: "#1d1b22" });
  setInk("#1d1b22");
} else if (THEME.gothic) {
  Object.assign(C.COLORS, {
    creme_jour: "#e9e5df",
    trait: "#1d1b22",
    blanc: "#f4f0ea",
    rose: "#e8d3d7",
    jaune: "#ece3c8",
    vert: "#d3ddd0",
    lavande: "#dcd6e6",
    bleu: "#d4dde3",
    nenuphar: "#7f9a7b",
    nenuphar_nuit: "#4c5e4f",
  });
  Object.assign(C.NEEDS.amour, { fill: "#a3354a", track: "#efe3e5", button: "#e8d3d7" });
  Object.assign(C.NEEDS.faim, { fill: "#a88237", track: "#f1ebdc", button: "#ece3c8" });
  Object.assign(C.NEEDS.energie, { fill: "#6c5a9c", track: "#e9e5f0", button: "#dcd6e6" });
  Object.assign(C.NEEDS.fraicheur, { fill: "#4b7a8f", track: "#e3eaee", button: "#d4dde3" });
  setInk("#1d1b22");
}

export const FONTS = THEME.name === "gothique"
  ? { body: "'Special Elite', 'Courier New', monospace", title: "'Grenze Gotisch', Georgia, serif" }
  : THEME.hybrid
    ? { body: "Fredoka, ui-rounded, system-ui, sans-serif", title: "'Grenze Gotisch', Georgia, serif" }
    : { body: "Fredoka, ui-rounded, system-ui, sans-serif", title: "Fredoka, ui-rounded, system-ui, sans-serif" };

// Palier de sourire 0..3 (0 = impassible, 3 = radieuse)
export const smileTier = (s) => (s >= 75 ? 3 : s >= 50 ? 2 : s >= 25 ? 1 : 0);

// ---------------------------------------------------------------------------
// Textes. Chaque entrée : chaîne, ou tableau par palier de sourire (gothique).
// ---------------------------------------------------------------------------
const PASTEL = {
  hello: ["Bonjour {p} !", "Coucou {p} !", "Te revoilà, {p} !"],
  helloSoir: ["Bonsoir {p} !"],
  welcomeText: "Un œuf t'attend sur le nénuphar.",
  welcomeOk: "Voir mon œuf",
  egg: "Tapote l'œuf pour l'aider à éclore !",
  hatchTitle: "Il est né !",
  hatchText: "Comment s'appelle ton têtard ?",
  welcomeFrog: "Bienvenue, {n} !",
  welcomeFrogSub: "Prends bien soin de ton têtard",
  asleep: "Chut… {n} dort.",
  nightAsleep: "{n} dort. Reviens demain matin !",
  nightAlready: "C'est la nuit, {n} dort déjà.",
  noNap: "{n} n'a pas sommeil !",
  nap: "Petite sieste…",
  wake: "Debout !",
  napLine: "Petite sieste… (touche la lune pour le réveiller)",
  tired: "{n} a besoin de repos.",
  full: "{n} n'a plus faim !",
  clean: "{n} est déjà tout propre !",
  nounouOn: "Mode nounou : tout est en pause.",
  nounouOff: "Coucou, je suis là !",
  nounouWake: "Fin du mode nounou, coucou !",
  nounouLine: "Mode nounou : {n} t'attend sagement",
  tutoWrong: "Touche le bouton qui brille !",
  grew: "{n} a grandi !",
  grewSub: "C'est maintenant une {s}",
  love: "Coup de cœur ! {a} et {b} s'aiment !",
  familyEgg: "Un œuf est apparu ! Touche-le.",
  genTitle: "Nouvelle génération ?",
  genText1: "{a} et {b} partent vivre",
  genText2: "à la Grande Mare. Leur bébé éclot !",
  bye: "Au revoir {a} et {b} !",
  byeSub: "Ils partent vivre à la Grande Mare",
  genBanner: "Génération {g}",
  genBannerSub: "L'œuf de {a} et {b}",
  pick: "À quoi on joue ?",
  win: "Bravo !", perfect: "Parfait !", almost: "Presque !", record: "Nouveau record !",
  album: "Ma famille",
};

const GOTHIQUE = {
  hello: [
    ["Bonjour, {p}. Il fait gris. Parfait.", "{p}. Enfin.", "Te revoilà, {p}. La mare n'a rien dit, mais elle t'attendait."],
    ["Bonjour, {p}. {n} a levé un sourcil en te voyant.", "Te revoilà, {p}. C'est presque agréable."],
    ["Bonjour {p} ! {n} a souri. Ne le répète à personne.", "Te revoilà, {p}. {n} faisait semblant de ne pas t'attendre."],
    ["Bonjour {p} ! {n} est vraiment content de te voir.", "Coucou {p} ! La mare brille quand tu es là."],
  ],
  helloSoir: [["Bonsoir, {p}. L'heure idéale."], ["Bonsoir, {p}. Les chauves-souris te saluent."], ["Bonsoir {p} ! Les bougies se sont allumées pour toi."], ["Bonsoir {p} ! Quelle belle soirée."]],
  welcomeText: "Un œuf t'attend sur le nénuphar. Il a l'air parfaitement lugubre.",
  welcomeOk: "Voir l'œuf",
  egg: "Tapote l'œuf. Il ne va pas éclore tout seul.",
  hatchTitle: "Il est né.",
  hatchText: "Choisis-lui un prénom. De préférence sinistre.",
  welcomeFrog: "Bienvenue, {n}.",
  welcomeFrogSub: "Il ne sourit pas encore. Patience.",
  asleep: ["Chut… {n} dort. Il déteste qu'on le réveille.", "Chut… {n} dort.", "Chut… {n} fait de beaux rêves.", "Chut… {n} dort en souriant."],
  nightAsleep: ["{n} dort. Reviens demain, quand il fera gris.", "{n} dort. Reviens demain matin.", "{n} dort paisiblement. À demain !", "{n} dort. Il rêve de toi, probablement."],
  nightAlready: "C'est la nuit. {n} dort déjà, comme il se doit.",
  noNap: "{n} n'a pas sommeil. Les ténèbres attendront.",
  nap: "Une sieste. Dans le noir, idéalement.",
  wake: "Debout. À contrecœur.",
  napLine: "Sieste en cours… (touche la lune pour le réveiller)",
  tired: "{n} est trop fatigué. Même pour être lugubre.",
  full: ["{n} n'a plus faim. La gourmandise est un défaut.", "{n} n'a plus faim. Merci quand même.", "{n} n'a plus faim ! Mais c'était délicieux.", "{n} n'a plus faim ! Il te fait un bisou à la place."],
  clean: "{n} est déjà propre. Hélas.",
  nounouOn: "Mode nounou : tout est figé. Comme dans un musée.",
  nounouOff: "Te revoilà. Il fallait bien.",
  nounouWake: "Fin du mode nounou. La vie reprend. Hélas.",
  nounouLine: "Mode nounou : {n} t'attend, immobile. Comme une statue.",
  tutoWrong: "Non. Le bouton qui brille.",
  grew: "{n} a grandi.",
  grewSub: "C'est désormais une {s}. Inquiétant.",
  love: "Coup de cœur. Contre toute attente, {a} et {b} s'aiment.",
  familyEgg: "Un œuf est apparu. Touche-le. Il ne mord pas.",
  genTitle: "Nouvelle génération ?",
  genText1: "{a} et {b} partent vivre",
  genText2: "à la Grande Mare. Sans se retourner.",
  bye: "Au revoir, {a} et {b}.",
  byeSub: "Ils partent à la Grande Mare. Ils écriront.",
  genBanner: "Génération {g}",
  genBannerSub: "L'œuf de {a} et {b}",
  pick: "Choisis ton supplice.",
  win: "Pas mal.", perfect: "Impeccable.", almost: "Pathétique. Encore.", record: "Nouveau record. Évidemment.",
  album: "Arbre généalogique",
};

export const SMILE_MOMENTS = [
  { at: 25, title: "{n} a esquissé un sourire.", sub: "Tout petit. Mais c'était bien un sourire." },
  { at: 50, title: "{n} a souri. Deux fois.", sub: "Les roses de la mare reprennent des couleurs." },
  { at: 75, title: "{n} a ri !", sub: "Personne ne sait pourquoi. Même pas lui." },
  { at: 100, title: "Un arc-en-ciel sur la mare !", sub: "Grâce à toi, {p}. Il sourit pour de vrai." },
];

/** Texte du thème courant, avec variables {p} {n} {a} {b} {s} {g}. */
export function t(key, vars = {}, smile = 0) {
  const goth = THEME.name === "gothique"; // l'hybride parle avec la douceur du thème pastel
  const dict = goth ? GOTHIQUE : PASTEL;
  let v = dict[key] ?? PASTEL[key] ?? key;
  if (Array.isArray(v)) {
    if (Array.isArray(v[0])) v = v[Math.min(smileTier(smile), v.length - 1)];
    else if (goth && ["asleep", "nightAsleep", "full"].includes(key)) v = v[Math.min(smileTier(smile), v.length - 1)];
    if (Array.isArray(v)) v = v[Math.floor(Math.random() * v.length)];
  }
  return v.replace(/\{(\w)\}/g, (_, k) => vars[k] ?? "");
}

// Prénoms proposés à l'éclosion
export const NAME_IDEAS = THEME.name === "gothique"
  ? ["Brume", "Ortie", "Ombre", "Minuit", "Belladone", "Cendre", "Ronce", "Mandragore", "Corbeau", "Nocturne",
    "Éclipse", "Sépia", "Réglisse", "Myrtille", "Orage", "Givre", "Violette", "Chardon", "Pénombre", "Grimoire"]
  : null;
