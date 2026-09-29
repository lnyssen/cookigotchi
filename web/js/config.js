// Équilibrage « vrai Tamagotchi » : tout avance en temps réel, même app fermée.
// Tous les rythmes sont exprimés par heure pour rester lisibles.

export const W = 320; // largeur logique ; la hauteur logique suit le ratio de l'écran

export const COLORS = {
  creme_jour: "#fff5e1",
  nuit_violet: "#2e2650",
  trait: "#1d1b22", // même encre noire que les contours des sprites
  blanc: "#ffffff",
  rose: "#ffd1dc",
  jaune: "#fff7b0",
  vert: "#c8e6c9",
  lavande: "#d6d1ff",
  bleu: "#d1f5ff",
  eau_jour: "#cdeefa",
  eau_nuit: "#3d3570",
  nenuphar: "#a8d8a0",
  nenuphar_nuit: "#6f9a78",
};

// Une couleur par besoin, partagée par la jauge et son bouton de soin.
// fill = remplissage de jauge (assez foncé pour se lire), track = fond de jauge, button = bouton.
export const NEEDS = {
  amour: { label: "Amour", fill: "#f27a9b", track: "#ffe9ef", button: "#ffd1dc" },
  faim: { label: "Faim", fill: "#eab53c", track: "#fff6d6", button: "#fff7b0" },
  energie: { label: "Énergie", fill: "#8f80ec", track: "#efedff", button: "#d6d1ff" },
  fraicheur: { label: "Propreté", fill: "#46aee0", track: "#e3f6ff", button: "#d1f5ff" },
};
export const STAT_NAMES = Object.keys(NEEDS);
export const STAT_MAX = 100;

// --- Croissance (temps réel depuis l'éclosion) ---
export const HATCH_SECONDS = 60; // l'œuf éclot en 1 min (chaque tap l'aide un peu)
export const HATCH_TAP_BONUS = 4;
export const AWAKE_AFTER_HATCH_MIN = 20;
const H = 3600 * 1000;
// Bébé têtard 6 h, enfant jusqu'au 4e jour, ado jusqu'au 10e, puis adulte (amour, famille).
export const STAGES = [
  { id: "tetard", label: "Bébé têtard", from: 0 },
  { id: "grenouillette", label: "Grenouillette", from: 6 * H }, // enfant, après 6 heures
  { id: "grenouille", label: "Jeune grenouille", from: 96 * H }, // ado, après 4 jours
  { id: "adulte", label: "Grenouille adulte", from: 240 * H }, // adulte, après 10 jours
];
// Grenouille dorée : adulte depuis au moins 4 jours ET bonheur moyen élevé (récupérable).
export const DOREE_AGE = 336 * H; // grenouille dorée possible dès le 14e jour
export const DOREE_BONHEUR = 75;
// Famille : un amoureux passe quand la grenouille adulte est heureuse (dès le 10e jour),
// puis le couple pond un œuf 36 h plus tard.
export const MEET_AGE = 240 * H; // les amoureux passent une fois adulte
export const MEET_BONHEUR = 55;
export const FAMILY_EGG_AFTER = 36 * H;
// Le bonheur suit lentement la moyenne des besoins (moyenne glissante sur ~12 h).
export const BONHEUR_HALF_LIFE_H = 12;

// --- Besoins : points perdus par heure (le jour, éveillé) ---
export const DECAY_PER_HOUR = { amour: 12, faim: 16, energie: 9, fraicheur: 7 };
export const POOP_FRAICHEUR_PER_HOUR = 10; // par caca non nettoyé
export const FAIM_BASSE_SEUIL = 30;
export const FAIM_BASSE_MULT_ENERGIE = 1.6;
export const FRAICHEUR_BASSE_SEUIL = 30;
export const AMOUR_PLAFOND_SI_SALE = 60;

// --- Sommeil ---
export const NUIT_DEBUT = 20; // s'endort seul à 20h
export const NUIT_FIN = 7; // se réveille à 7h
export const SLEEP_DECAY_MULT = 0.25; // besoins qui baissent 4x moins vite en dormant
export const SLEEP_ENERGIE_PER_HOUR = 14; // la nuit recharge complètement
export const NAP_ENERGIE_PER_HOUR = 60; // sieste en journée : +1/min
export const NAP_MIN_ENERGIE_REFUS = 80; // pas fatigué -> refuse la sieste

// --- Cacas ---
export const POOP_DELAY_MIN = [25, 50]; // minutes après un repas
export const POOP_MAX = 3;

// --- Soins ---
export const CARE = {
  calin: { stat: "amour", amount: 18 },
  miam: { stat: "faim", amount: 25, refuseAbove: 90 },
  baignade: { stat: "fraicheur", amount: 45, refuseAbove: 95 },
};
export const ACTION_MOOD_DURATION = 1.5;
export const PET_TAP_AMOUR = 2;
export const PET_TAP_COOLDOWN = 0.6;

// --- Humeurs ---
export const SEC_SEUIL = 10;
export const RECLAME_SEUIL = 15;
export const BOUDEUR_SEUIL = 35;
export const ENERGIE_JEU_MIN = 25;

// --- Mini-jeu gobe-mouches ---
export const MINIGAME_DURATION = 20;
export const MINIGAME_SPAWN_INTERVAL = 0.6;
export const MINIGAME_FALL_SPEED_RANGE = [55, 120];
export const MINIGAME_OBJECT_RADIUS = 9;
export const MINIGAME_TOUCH_RADIUS = 22;
export const MINIGAME_LUCIOLE_CHANCE = 0.25;
export const MINIGAME_FAIM_PAR_POINT = 1.5; // les mouches, ça nourrit un peu
export const MINIGAME_AMOUR_PAR_POINT = 2;
export const MINIGAME_ENERGIE_COUT = 8; // jouer fatigue

// --- Mise en page portrait ---
export const AGE_SIZES_PX = { oeuf: 90, tetard: 74, grenouillette: 88, grenouille: 96, adulte: 106 };
export const HUD_TOP = 14;
export const DOCK_HEIGHT = 64;
export const DOCK_BOTTOM_MARGIN = 16;
export const DOCK_BUTTON_SIZE = 42;
