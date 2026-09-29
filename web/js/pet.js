// Le cœur Tamagotchi : besoins, sommeil, cacas, croissance en temps réel, sauvegarde.
// Aucune dépendance au rendu. Tout est simulé minute par minute, y compris app fermée.

import * as C from "./config.js";
import { NAME_IDEAS } from "./theme.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const SAVE_KEY = "froggotchi-save-v2";
const MINUTE = 60000;
const MAX_CATCHUP_MS = 30 * 24 * 3600 * 1000;

const NAMES = ["Pistache", "Nénuphar", "Bulle", "Kiwi", "Menthe", "Olive", "Plouf", "Cresson", "Tilleul",
  "Lulu", "Gribouille", "Pépite", "Câline", "Frisquette", "Brindille", "Mousse", "Rainette", "Praline",
  "Noisette", "Capucine", "Ondine", "Grenadine", "Réglisse", "Basilic", "Lentille", "Perle", "Galet"];
export const randomName = (avoid = []) => {
  const pool = (NAME_IDEAS || NAMES).filter((n) => !avoid.includes(n));
  return pool[Math.floor(Math.random() * pool.length)] || NAMES[0];
};
// Teintes des visiteurs (rotation de teinte appliquée au sprite vert d'origine).
const VISITOR_HUES = [-45, -25, 35, 70, 140, 175, 210, 260, 300];
export const randomHue = () => VISITOR_HUES[Math.floor(Math.random() * VISITOR_HUES.length)];

/** Moyenne de deux teintes sur le cercle chromatique + petite mutation. */
function inheritHue(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const x = Math.cos(rad(a)) + Math.cos(rad(b));
  const y = Math.sin(rad(a)) + Math.sin(rad(b));
  let h = (Math.atan2(y, x) * 180) / Math.PI;
  if (Math.hypot(x, y) < 0.2) h = a; // teintes opposées : on garde celle du parent
  h += (Math.random() - 0.5) * 40;
  return Math.round(((h + 540) % 360) - 180);
}

// Démo / test : ?heure=14 force l'heure affichée (ex. montrer le jeu de jour le soir).
const FORCED_HOUR = (() => {
  const v = new URLSearchParams(globalThis.location?.search ?? "").get("heure");
  return v === null ? null : Number(v);
})();

// Mode École (réglable) : lundi-vendredi 8h15-16h30, mercredi 8h15-12h15 (horaires belges).
// Pendant ces heures, les besoins ne baissent pas : la joueuse est en classe.
const SCHOOL_KEY = "froggotchi-ecole";
export function schoolModeOn() {
  try { return globalThis.localStorage?.getItem(SCHOOL_KEY) !== "off"; } catch { return true; }
}
export function setSchoolMode(on) {
  try { localStorage.setItem(SCHOOL_KEY, on ? "on" : "off"); } catch {}
}
// « Pas d'école aujourd'hui » : congé d'un jour (férié, malade…), le mode revient le lendemain.
const CONGE_KEY = "froggotchi-conge";
const dayStr = (d) => d.toLocaleDateString("fr-CA");
export function setDayOff(date = new Date()) {
  try { localStorage.setItem(CONGE_KEY, dayStr(date)); } catch {}
}
function isDayOff(date) {
  try { return globalThis.localStorage?.getItem(CONGE_KEY) === dayStr(date); } catch { return false; }
}

// Congés scolaires officiels 2026-2027 (à mettre à jour chaque année).
// fr = Fédération Wallonie-Bruxelles (RTBF), nl = Vlaanderen. Plages [début, fin] incluses.
const HOLIDAYS = {
  fr: [["2026-10-19", "2026-10-30"], ["2026-11-11", "2026-11-11"], ["2026-12-21", "2027-01-01"],
    ["2027-02-22", "2027-03-05"], ["2027-03-29", "2027-03-29"], ["2027-04-26", "2027-05-07"],
    ["2027-05-17", "2027-05-17"], ["2027-07-03", "2027-08-22"]],
  nl: [["2026-10-26", "2026-11-01"], ["2026-11-11", "2026-11-11"], ["2026-12-21", "2027-01-03"],
    ["2027-02-15", "2027-02-21"], ["2027-03-29", "2027-04-11"], ["2027-05-06", "2027-05-07"],
    ["2027-05-17", "2027-05-17"], ["2027-07-01", "2027-08-31"]],
};
export const schoolCommunity = () => {
  try { return globalThis.localStorage?.getItem(SCHOOL_KEY) === "nl" ? "nl" : "fr"; } catch { return "fr"; }
};
/** Réglage : francophone (congés FWB) → néerlandophone (congés flamands) → coupé (vacances) → … */
export function cycleSchoolMode() {
  const cur = (() => { try { return localStorage.getItem(SCHOOL_KEY) || "on"; } catch { return "on"; } })();
  const next = cur === "off" ? "on" : cur === "nl" ? "off" : "nl";
  try { localStorage.setItem(SCHOOL_KEY, next); } catch {}
  return next;
}
export function isHoliday(date) {
  const d = dayStr(date);
  return HOLIDAYS[schoolCommunity()].some(([a, b]) => d >= a && d <= b);
}

export function isSchoolTime(date) {
  if (!schoolModeOn() || isDayOff(date) || isHoliday(date)) return false;
  const day = date.getDay(); // 0 = dimanche
  if (day === 0 || day === 6) return false;
  const m = date.getHours() * 60 + date.getMinutes();
  const end = day === 3 ? 12 * 60 + 15 : 16 * 60 + 30;
  return m >= 8 * 60 + 15 && m < end;
}

export function isNightHour(date) {
  const h = FORCED_HOUR ?? date.getHours();
  return h >= C.NUIT_DEBUT || h < C.NUIT_FIN;
}

export class Pet {
  constructor() {
    this.stats = { amour: 80, faim: 70, energie: 90, fraicheur: 100 };
    this.eggStartedAt = Date.now(); // début de la couvaison
    this.hatchedAt = null; // null = encore un œuf
    this.hatchBonus = 0; // secondes gagnées en tapotant l'œuf
    this.napping = false; // sieste de jour (la nuit, il dort tout seul)
    this.nounou = false; // tout est en pause (ex. pendant l'école)
    this.poops = []; // abscisses (0..1) des cacas à l'écran
    this.poopAt = null; // horodatage du prochain caca prévu
    this.bonheur = 75;
    this.seenStage = null; // dernier stade montré à l'écran (pour fêter une évolution)
    this.tutoDone = false;
    this.tutoIndex = 0;
    this.lastTick = Date.now();
    // --- Famille (façon Tamagotchi Paradise) ---
    this.name = randomName();
    this.named = false; // prénom choisi par la joueuse à l'éclosion
    this.sourire = 0; // 0..100, ne fait que monter avec les soins ; transmis aux générations
    this.smileSeen = 0; // dernier palier de sourire fêté à l'écran
    this.hue = 0; // 0 = vert d'origine ; hérité des parents
    this.generation = 1;
    this.partner = null; // { name, hue, since }
    this.familyEgg = false; // le couple a pondu
    this.family = []; // ancêtres : { name, hue, generation, days, partner, doree }
  }

  // ---------------------------------------------------------------- famille
  get canMeet() {
    return this.stage === "adulte" && !this.partner && !this.asleep && !this.nounou
      && this.age >= C.MEET_AGE && this.bonheur >= C.MEET_BONHEUR;
  }

  meet(visitor) {
    this.partner = { name: visitor.name, hue: visitor.hue, since: Date.now() };
  }

  get eggProgressFamily() {
    if (!this.partner) return 0;
    return clamp((Date.now() - this.partner.since) / C.FAMILY_EGG_AFTER, 0, 1);
  }

  /** Les parents partent à la Grande Mare ; l'œuf devient la génération suivante. */
  newGeneration() {
    const record = { name: this.name, hue: this.hue, generation: this.generation, days: this.day,
      partner: this.partner, doree: this.isDoree };
    const child = new Pet();
    child.family = [...this.family, record];
    child.generation = this.generation + 1;
    child.hue = inheritHue(this.hue, this.partner?.hue ?? this.hue);
    child.name = randomName([this.name, this.partner?.name, ...this.family.map((f) => f.name)]);
    child.tutoDone = true;
    child.sourire = this.sourire; // la mare garde ses couleurs d'une génération à l'autre
    child.smileSeen = this.smileSeen; // l'enfant a déjà appris à s'occuper d'une grenouille
    return child;
  }

  // ---------------------------------------------------------------- croissance
  get isEgg() { return this.hatchedAt === null; }

  get age() { return this.isEgg ? 0 : Math.max(0, Date.now() - this.hatchedAt); }

  get stage() {
    if (this.isEgg) return "oeuf";
    let stage = C.STAGES[0].id;
    for (const s of C.STAGES) if (this.age >= s.from) stage = s.id;
    return stage;
  }

  get stageInfo() { return C.STAGES.find((s) => s.id === this.stage); }

  /** Progression 0..1 vers le prochain stade (1 = adulte). */
  get growth() {
    const i = C.STAGES.findIndex((s) => s.id === this.stage);
    if (i < 0) return 0;
    const next = C.STAGES[i + 1];
    if (!next) return 1;
    return clamp((this.age - C.STAGES[i].from) / (next.from - C.STAGES[i].from), 0, 1);
  }

  /** Jour de vie, façon « âge » du Tamagotchi : Jour 1 le premier jour. */
  get day() { return 1 + Math.floor(this.age / (24 * 3600 * 1000)); }

  get eggProgress() {
    return clamp(((Date.now() - this.eggStartedAt) / 1000 + this.hatchBonus) / C.HATCH_SECONDS, 0, 1);
  }

  tapEgg() { this.hatchBonus += C.HATCH_TAP_BONUS; }

  hatch() {
    this.hatchedAt = Date.now();
    this.lastTick = Date.now();
  }

  get isDoree() {
    return this.stage === "adulte" && this.age >= C.DOREE_AGE && this.bonheur >= C.DOREE_BONHEUR;
  }

  // ---------------------------------------------------------------- sommeil
  isNight(date = new Date()) { return isNightHour(date); }

  // Juste après l'éclosion, il reste éveillé un moment même le soir (pour faire connaissance).
  get justHatched() { return !this.isEgg && Date.now() - this.hatchedAt < C.AWAKE_AFTER_HATCH_MIN * MINUTE; }

  get asleep() { return !this.isEgg && (this.napping || (this.isNight() && !this.justHatched)); }

  // ---------------------------------------------------------------- simulation
  maxFor(stat) {
    if (stat === "amour" && this.stats.fraicheur < C.FRAICHEUR_BASSE_SEUIL) return C.AMOUR_PLAFOND_SI_SALE;
    return C.STAT_MAX;
  }

  _minute(at) {
    const h = 1 / 60;
    const night = isNightHour(new Date(at)) && at - this.hatchedAt >= C.AWAKE_AFTER_HATCH_MIN * MINUTE;
    const asleep = night || this.napping;
    const mult = asleep ? C.SLEEP_DECAY_MULT : 1;
    const s = this.stats;

    const energieRate = asleep
      ? (this.napping && !night ? C.NAP_ENERGIE_PER_HOUR : C.SLEEP_ENERGIE_PER_HOUR)
      : -C.DECAY_PER_HOUR.energie * (s.faim < C.FAIM_BASSE_SEUIL ? C.FAIM_BASSE_MULT_ENERGIE : 1);
    s.energie += energieRate * h;
    s.faim -= C.DECAY_PER_HOUR.faim * mult * h;
    s.amour -= C.DECAY_PER_HOUR.amour * mult * h;
    s.fraicheur -= (C.DECAY_PER_HOUR.fraicheur * mult + this.poops.length * C.POOP_FRAICHEUR_PER_HOUR) * h;
    for (const k of C.STAT_NAMES) s[k] = clamp(s[k], 0, this.maxFor(k));

    // Fin de sieste quand il est reposé (ou au coucher, la nuit prend le relais).
    if (this.napping && (s.energie >= 98 || night)) this.napping = false;

    if (false && this.poopAt && at >= this.poopAt) { // cacas retirés du jeu
      if (this.poops.length < C.POOP_MAX) this.poops.push(0.15 + Math.random() * 0.7);
      this.poopAt = null;
    }

    if (this.partner && !this.familyEgg && at - this.partner.since >= C.FAMILY_EGG_AFTER) this.familyEgg = true;

    if (this.bonheur > 60 && !asleep) this.smile(0.5 / 60);

    const avg = C.STAT_NAMES.reduce((a, k) => a + s[k], 0) / C.STAT_NAMES.length;
    const k = 1 - Math.pow(0.5, h / C.BONHEUR_HALF_LIFE_H);
    this.bonheur += (avg - this.bonheur) * k;
  }

  /** Fait avancer le temps réel jusqu'à `now`, minute par minute. */
  advanceTo(now = Date.now()) {
    if (this.isEgg || this.nounou) { this.lastTick = now; return; }
    let t = Math.max(this.lastTick, now - MAX_CATCHUP_MS);
    while (now - t >= MINUTE) {
      t += MINUTE;
      if (!isSchoolTime(new Date(t))) this._minute(t); // à l'école, la mare est en pause
    }
    this.lastTick = t; // on garde le reste (<1 min) pour la prochaine fois
  }

  get atSchool() { return isSchoolTime(new Date()); }

  // ---------------------------------------------------------------- soins
  /** Renvoie "ok", "refus" ou "dort". */
  care(name) {
    if (this.asleep && name !== "dodo") return "dort";
    const def = C.CARE[name];
    if (def.refuseAbove !== undefined && this.stats[def.stat] >= def.refuseAbove
        && !(name === "baignade" && this.poops.length)) return "refus";
    this.stats[def.stat] = clamp(this.stats[def.stat] + def.amount, 0, this.maxFor(def.stat));
    if (false && name === "miam" && !this.poopAt) { // cacas retirés du jeu
      const [lo, hi] = C.POOP_DELAY_MIN;
      this.poopAt = Date.now() + (lo + Math.random() * (hi - lo)) * MINUTE;
    }
    if (name === "baignade") this.poops = [];
    this.smile(0.4);
    return "ok";
  }

  /** Sieste : refuse s'il n'est pas fatigué ; la nuit il dort déjà. */
  toggleNap() {
    if (this.asleep && !this.napping) return "dort";
    if (this.napping) { this.napping = false; return "reveil"; }
    if (this.stats.energie >= C.NAP_MIN_ENERGIE_REFUS) return "refus";
    this.napping = true;
    return "ok";
  }

  cleanPoop(index) {
    this.poops.splice(index, 1);
    this.smile(0.3);
    this.stats.fraicheur = clamp(this.stats.fraicheur + 5, 0, this.maxFor("fraicheur"));
  }

  /** Le sourire monte peu à peu avec les soins, et ne redescend jamais. */
  smile(amount) { this.sourire = Math.min(100, this.sourire + amount); }

  add(stat, amount) {
    this.stats[stat] = clamp(this.stats[stat] + amount, 0, this.maxFor(stat));
  }

  /** Le besoin le plus urgent (sous le seuil boudeur), ou null. */
  get urgentNeed() {
    let worst = null;
    for (const k of C.STAT_NAMES) {
      if (this.stats[k] < C.BOUDEUR_SEUIL && (!worst || this.stats[k] < this.stats[worst])) worst = k;
    }
    return worst;
  }

  // ---------------------------------------------------------------- sauvegarde
  save() {
    const data = {};
    for (const k of Object.keys(this)) data[k] = this[k];
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
  }

  static load() {
    const pet = new Pet();
    let data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch {}
    if (data) {
      for (const k of Object.keys(pet)) if (k in data) pet[k] = data[k];
      for (const k of C.STAT_NAMES) pet.stats[k] = clamp(Number(pet.stats[k]) || 0, 0, C.STAT_MAX);
      pet.poops = []; pet.poopAt = null; // plus de cacas dans le jeu
    }
    return pet;
  }
}

// ---------------------------------------------------------------- humeurs / sprites
const STAGE_MOODS = {
  tetard: new Set(["paisible", "content", "miam", "dodo", "reclame", "sec"]),
  grenouillette: new Set(["paisible", "content", "miam", "dodo", "reclame", "sec", "jeu", "amour", "boudeur"]),
  grenouille: new Set(["paisible", "content", "miam", "dodo", "reclame", "sec",
    "jeu", "amour", "boudeur", "splash", "clin", "doree"]),
};
const FALLBACK = { boudeur: "reclame", splash: "content", jeu: "content", amour: "content", clin: "content" };

export function ambientMood(pet) {
  if (pet.asleep) return "dodo";
  const values = Object.values(pet.stats);
  if (pet.stats.fraicheur < C.SEC_SEUIL) return "sec";
  if (values.some((v) => v < C.RECLAME_SEUIL)) return "reclame";
  if (values.some((v) => v < C.BOUDEUR_SEUIL)) return "boudeur";
  if (pet.isDoree) return "doree";
  return "paisible";
}

export function spriteName(stage, mood) {
  const set = stage === "adulte" ? "grenouille" : stage; // l'adulte utilise les dessins de la grenouille
  const available = STAGE_MOODS[set];
  if (!available) return null;
  while (!available.has(mood) && mood in FALLBACK) mood = FALLBACK[mood];
  if (!available.has(mood)) mood = "paisible";
  return `${set}_${mood}`;
}

export const ALL_SPRITES = Object.entries(STAGE_MOODS).flatMap(([stage, set]) => [...set].map((m) => `${stage}_${m}`));
