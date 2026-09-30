// Boucle de jeu, écrans (mare, mini-jeu), rendu Canvas et entrées tactiles.

import { THEME, FONTS, t, SMILE_MOMENTS, setTheme, NEXT_THEME, THEME_LABEL } from "./theme.js";
import * as C from "./config.js";
import * as audio from "./audio.js";
import { progress, record, startDay, onProgress, SHOP, ACHIEVEMENTS, QUESTS_BONUS, questDef, achievementValue, buy, toggleHat, toggleGirl, owns, redeemCode } from "./progress.js";
import { drawIcon } from "./icons.js";
import { Pet, ambientMood, spriteName, ALL_SPRITES, currentHour, randomName, randomHue, schoolModeOn, setSchoolMode, setDayOff, cycleSchoolMode, schoolCommunity, isHoliday } from "./pet.js";

const img = {};
const ASSET_V = 9; // à incrémenter quand les sprites changent (évite les vieux fichiers en cache)

// Le prénom de la joueuse vient de perso.json (fichier privé, hors du dépôt public) ; un lien ?pour=… peut le changer.
const PLAYER_KEY = "froggotchi-joueuse";
let DEFAULT_PLAYER = "toi";
const player = {
  get name() { try { return localStorage.getItem(PLAYER_KEY) || DEFAULT_PLAYER; } catch { return DEFAULT_PLAYER; } },
  set name(v) { try { localStorage.setItem(PLAYER_KEY, v); } catch {} },
};

/** Ouvre la fenêtre (saisie de prénom ou simple message) ; résout avec le texte validé. */
function askName({ title, text: body, value = "", placeholder = "", reroll = null, ok = "C'est parti",
  input: withInput = true, note = "", frog = false, cancel = null }) {
  const sheet = document.getElementById("sheet");
  const input = document.getElementById("sheet-input");
  const alt = document.getElementById("sheet-alt");
  const noteEl = document.getElementById("sheet-note");
  document.getElementById("sheet-title").textContent = title;
  document.getElementById("sheet-text").textContent = body;
  document.getElementById("sheet-ok").textContent = ok;
  document.getElementById("sheet-frog").hidden = !frog;
  noteEl.textContent = note;
  noteEl.hidden = !note;
  const isLetter = note.startsWith("—"); // une signature : mise en page « lettre »
  noteEl.className = isLetter ? "note sign" : "note";
  sheet.querySelector("form").classList.toggle("letter", isLetter);
  input.hidden = !withInput;
  input.required = withInput;
  input.value = value;
  input.placeholder = placeholder;
  alt.hidden = !reroll && !cancel;
  alt.textContent = cancel || "Autre idée";
  alt.onclick = () => { input.value = reroll(); audio.play("clic"); };
  if (cancel) alt.onclick = () => { sheet.hidden = true; input.blur(); audio.play("clic"); cancelHandler?.(); };
  sheet.hidden = false;
  if (withInput) setTimeout(() => input.focus(), 350);
  let cancelHandler = null;
  return new Promise((resolve) => {
    cancelHandler = () => resolve(null);
    sheet.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const v = withInput ? input.value.trim().replace(/\s+/g, " ") : "ok";
      if (!v) return;
      sheet.hidden = true;
      input.blur();
      audio.unlock();
      audio.play("niveau");
      resolve(v.charAt(0).toUpperCase() + v.slice(1));
    };
  });
}

/** Pluie de confettis (cœurs, étoiles, pastilles) pour les moments de joie. */
function confetti(particles) {
  const colors = ["#ffd1dc", "#fff7b0", "#d6d1ff", "#d1f5ff", "#c8e6c9"];
  for (let i = 0; i < 5; i++) {
    particles.burst(C.W * (0.15 + i * 0.175), view.H * 0.3, colors[i], { count: 8, speed: 120, life: 1.8, radius: 4, gravity: 90 });
  }
  particles.burst(C.W / 2, view.H * 0.35, "#ffd84a", { count: 12, speed: 140, life: 1.6, radius: 3, gravity: 60, shape: "star" });
  particles.burst(C.W / 2, view.H * 0.4, null, { count: 8, speed: 90, life: 1.6, radius: 5, gravity: -10, shape: "heart" });
}
const sheetOpen = () => !document.getElementById("sheet").hidden;
let touched = false;
const vibrate = (p) => { if (touched) navigator.vibrate?.(p); };
const TAU = Math.PI * 2;
const FONT = FONTS.body;
// Bouche relative au sprite (0..1), relevée sur les sprites « miam » (bouche ouverte).
const MOUTH = { tetard: [0.463, 0.47], grenouillette: [0.472, 0.49], grenouille: [0.499, 0.423], adulte: [0.499, 0.423] };
const GOTH = THEME.gothic; // décor gothique + Ombeline (thèmes hybride et gothique)
const HYB = THEME.hybrid; // hybride : couleurs pastel, police ronde
/** Texte du thème courant (prénoms et sourire injectés automatiquement). */
const T = (key, vars = {}) => t(key, { p: player.name, n: game.pet.name, ...vars }, game.pet.sourire);
// Couleurs de la mare selon le sourire : gris au départ (gothique), déjà douces en hybride.
const smileK = () => (HYB ? 0.55 + 0.45 * (game.pet.sourire / 100) : GOTH ? game.pet.sourire / 100 : 1);

function loadImage(name, path) {
  return new Promise((resolve) => {
    const i = new Image();
    i.onload = () => { img[name] = i; resolve(); };
    i.onerror = resolve;
    i.src = path;
  });
}

// ---------------------------------------------------------------------------
// Écran : largeur logique 320, hauteur logique = ratio exact de l'écran (aucune bande).
// ---------------------------------------------------------------------------
const canvas = document.getElementById("game");
const screenCtx = canvas.getContext("2d");
let ctx = screenCtx; // basculé temporairement vers un calque hors écran pour le décor figé
const view = { H: 640, scale: 1 };

function resize() {
  const box = canvas.parentElement.getBoundingClientRect();
  view.scale = box.width / C.W;
  view.H = box.height / view.scale;
  if (view.H < 460) { view.H = 460; view.scale = box.height / 460; } // paysage : bandes latérales
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${C.W * view.scale}px`;
  canvas.style.height = `${view.H * view.scale}px`;
  canvas.width = Math.round(C.W * view.scale * dpr);
  canvas.height = Math.round(view.H * view.scale * dpr);
  ctx.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, 0, 0);
  ctx.imageSmoothingQuality = "high";
  layout();
}

const L = {};
const BUTTONS = ["calin", "miam", "jeu", "dodo", "baignade", "nounou"];
function layout() {
  const H = view.H;
  L.gear = { x: C.W - 26, y: C.HUD_TOP + 13, r: 15 };
  L.family = { x: C.W - 64, y: C.HUD_TOP + 13, r: 15 };
  L.age = { x: 12, y: C.HUD_TOP + 2, w: 150, h: 24 };
  L.coins = { x: 168, y: C.HUD_TOP + 2, w: 64, h: 24 };
  L.gauges = C.STAT_NAMES.map((name, i) => ({
    name, x: 12 + (i % 2) * 154, y: C.HUD_TOP + 42 + Math.floor(i / 2) * 28,
  }));
  L.hudBottom = C.HUD_TOP + 42 + 28 + 22;
  L.dock = { x: 8, y: H - C.DOCK_BOTTOM_MARGIN - C.DOCK_HEIGHT, w: C.W - 16, h: C.DOCK_HEIGHT };
  const pad = 10;
  const gap = (L.dock.w - 2 * pad - BUTTONS.length * C.DOCK_BUTTON_SIZE) / (BUTTONS.length - 1);
  L.buttons = BUTTONS.map((name, i) => ({
    name, cx: L.dock.x + pad + C.DOCK_BUTTON_SIZE / 2 + i * (C.DOCK_BUTTON_SIZE + gap),
    cy: L.dock.y + L.dock.h / 2, r: C.DOCK_BUTTON_SIZE / 2,
  }));
  const top = L.hudBottom, bottom = L.dock.y - 34;
  L.charScale = Math.max(1, Math.min(1.25, (bottom - top - 90) / 220));
  // Nénuphar un peu sous le centre de la zone libre : le perso occupe le milieu de l'écran.
  L.charBottom = top + (bottom - top) * 0.8;
  L.pond = { cy: L.charBottom + 4, rx: C.W * 0.62, ry: 34 };
}

/** Dessine un sprite avec la teinte héritée (sauf états qui ont leur propre couleur). */
function drawSprite(key, x, y, w, h, hue = 0, extraFilter = "") {
  const sprite = img[key];
  if (!sprite) return;
  const tinted = hue && !/_(sec|doree)$/.test(key);
  const sat = GOTH ? ` saturate(${(0.4 + 0.6 * smileK()).toFixed(2)})` : "";
  const f = `${tinted ? `hue-rotate(${hue}deg) ` : ""}${extraFilter}${sat}`.trim();
  if (f) ctx.filter = f;
  ctx.drawImage(sprite, x, y, w, h);
  ctx.filter = "none";
}

// ---------------------------------------------------------------------------
// Lettres de papa : un mot par jour, dans une bouteille qui flotte sur la mare.
// Les textes sont dans lettres.json ({ texte, date? AAAA-MM-JJ } : datée = arrive ce jour-là).
// ---------------------------------------------------------------------------
let LETTERS = [];
const LETTERS_KEY = "froggotchi-lettres";
const todayStr = () => new Date().toLocaleDateString("fr-CA");
const lettersState = () => { try { return JSON.parse(localStorage.getItem(LETTERS_KEY)) || { read: [], lastDay: null }; } catch { return { read: [], lastDay: null }; } };
const saveLettersState = (st) => { try { localStorage.setItem(LETTERS_KEY, JSON.stringify(st)); } catch {} };

/** La lettre du jour (ou null) : une datée pour aujourd'hui, sinon la prochaine non lue, une par jour. */
function letterOfTheDay() {
  const st = lettersState();
  const day = todayStr();
  const idOf = (l, i) => l.date || `n${i}`;
  const dated = LETTERS.findIndex((l, i) => l.date === day && !st.read.includes(idOf(l, i)));
  if (dated >= 0) return { i: dated, id: idOf(LETTERS[dated], dated), ...LETTERS[dated] };
  if (st.lastDay === day) return null;
  const next = LETTERS.findIndex((l, i) => !l.date && !st.read.includes(idOf(l, i)));
  return next >= 0 ? { i: next, id: idOf(LETTERS[next], next), ...LETTERS[next] } : null;
}

function readLetter(letter) {
  const st = lettersState();
  if (!st.read.includes(letter.id)) st.read.push(letter.id);
  st.lastDay = todayStr();
  st.log = [...(st.log || []), { id: letter.id, day: st.lastDay, texte: letter.texte }];
  saveLettersState(st);
}

function bottle(x, y, t) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 1.8) * 2.5); ctx.rotate(-0.5 + Math.sin(t * 1.3) * 0.12);
  ctx.beginPath(); ctx.roundRect(-14, -6, 22, 12, 6);
  ctx.fillStyle = "rgba(190,230,220,0.85)"; ctx.fill();
  ctx.lineWidth = 2.2; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
  ctx.fillStyle = "#f3e3c3"; ctx.fillRect(-10, -3, 13, 6);           // le papier roulé
  ctx.fillStyle = "#a3354a"; ctx.fillRect(-4.5, -3, 2, 6);           // petit ruban
  ctx.beginPath(); ctx.roundRect(8, -3.5, 6, 7, 2); ctx.fillStyle = "#b07a4f"; ctx.fill(); ctx.stroke(); // bouchon
  ctx.restore();
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.fillStyle = "#fff7b0"; sparkle(x + 12, y - 12, 4);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Codes secrets (codes.json) et message pour papa
// ---------------------------------------------------------------------------
async function askSecretCode(pond) {
  const typed = await askName({ title: "Code secret", text: "Tape le code que papa t'a donné.", placeholder: "Le code", ok: "Valider" });
  const code = typed.toUpperCase().replace(/[^A-Z0-9ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ]/g, "");
  let list = [];
  try { list = await (await fetch(`codes.json?v=${Date.now()}`)).json(); } catch {}
  const entry = list.find((c) => (c.code || "").toUpperCase() === code);
  if (!entry) { audio.play("reclame"); pond.say("Hmm… ce code ne marche pas. Vérifie avec papa !", 3.5); return; }
  const res = redeemCode({ ...entry, code: entry.code.toUpperCase() });
  if (res.already) { pond.say("Tu as déjà utilisé ce code. Demande-en un nouveau à papa !", 3.5); return; }
  confetti(pond.particles);
  pond.setGirlMood?.("clin", 4);
  const gift = [entry.pieces ? `+${entry.pieces} pièces` : "", res.item ? res.item.name : ""].filter(Boolean).join(" et ");
  await askName({ title: "Un cadeau de papa !", text: entry.message || "Surprise !", note: gift ? `Tu reçois : ${gift}` : "", input: false, ok: "Merci papa" });
}

/** Prépare un petit message pour papa (partage WhatsApp/SMS, ou SMS en secours). */
function writeToPapa() {
  const pet = game.pet;
  const what = { tetard: "un bébé têtard", grenouillette: "une grenouillette", grenouille: "une jeune grenouille", adulte: "une grenouille adulte" }[pet.stage];
  const stage = pet.isEgg ? "est encore un œuf" : `a ${pet.day} jour${pet.day > 1 ? "s" : ""}, c'est ${what}`;
  const smile = pet.sourire >= 75 ? " Elle rit tout le temps !" : pet.sourire >= 25 ? " Elle a souri aujourd'hui." : "";
  const msg = `Coucou papa ! Ma grenouille ${pet.isEgg ? "" : pet.name + " "}${stage}.${smile} J'ai ${progress.coins} pièces dans Cookigotchi. Bisous, ${player.name}`;
  record("papa");
  if (navigator.share) navigator.share({ text: msg }).catch(() => {});
  else location.href = `sms:?body=${encodeURIComponent(msg)}`;
}

// ---------------------------------------------------------------------------
// Rappels (Web Push) : activés par la joueuse dans les réglages, 1 par jour max côté serveur.
// ---------------------------------------------------------------------------
const REMIND_KEY = "froggotchi-rappels";
const remindersOn = () => { try { return localStorage.getItem(REMIND_KEY) === "on"; } catch { return false; } };
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function b64ToBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function toggleReminders(pond) {
  if (!pushSupported()) { pond.say("Les rappels ne marchent pas sur ce navigateur. Essaie dans Chrome.", 4); return; }
  const reg = await navigator.serviceWorker.ready;
  if (remindersOn()) {
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe().catch(() => {});
    fetch("api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ off: true }) }).catch(() => {});
    try { localStorage.setItem(REMIND_KEY, "off"); } catch {}
    pond.say("Rappels coupés.", 2.5);
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { pond.say("D'accord, pas de rappels. Tu peux changer d'avis plus tard.", 3.5); return; }
  try {
    const { key } = await (await fetch("api/vapid")).json();
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
    const r = await fetch("api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub }) });
    if (!r.ok) throw new Error(String(r.status));
    try { localStorage.setItem(REMIND_KEY, "on"); } catch {}
    pingVisit();
    pond.say(`Rappels activés : ${game.pet.name} te fera signe les jours où tu n'es pas passée.`, 4.5);
  } catch {
    pond.say("Oups, les rappels n'ont pas pu s'activer (internet ?). Réessaie plus tard.", 4);
  }
}

/** Signale au serveur que la joueuse est passée aujourd'hui : pas de rappel ce jour-là. */
function pingVisit() {
  if (!remindersOn()) return;
  const body = JSON.stringify({ petName: game.pet.isEgg ? "Ton œuf" : game.pet.name, letterWaiting: !!game.pond?.letter });
  fetch("api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

const shopSeen = () => { try { return localStorage.getItem("froggotchi-boutique-vue") === "1"; } catch { return true; } };

function coinIcon(x, y, r) {
  circle(x, y, r, "#e6c25a", C.COLORS.trait, 1.8);
  ctx.strokeStyle = "rgba(29,27,34,0.55)"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.stroke();
}

/** Chapeau posé sur la tête : (cx, top) = milieu du haut de la tête, w = largeur de la tête. */
function drawHat(id, cx, top, w, t = 0) {
  const INK = C.COLORS.trait;
  ctx.save();
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
  if (id === "noeud") {
    const x = cx + w * 0.28, y = top + w * 0.06, s = w * 0.16;
    ctx.fillStyle = "#1d1b22";
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s, y - s * 0.7); ctx.lineTo(x - s, y + s * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y - s * 0.7); ctx.lineTo(x + s, y + s * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    circle(x, y, s * 0.3, "#1d1b22", INK, 1.6);
  } else if (id === "sorciere") {
    const bw = w * 0.62, h = w * 0.62, y = top + w * 0.05;
    ctx.fillStyle = "#2a2433";
    ctx.beginPath(); ctx.ellipse(cx, y, bw * 0.62, bw * 0.13, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - bw * 0.32, y - 2); ctx.quadraticCurveTo(cx - bw * 0.05, y - h * 0.6, cx + bw * 0.18, y - h);
    ctx.quadraticCurveTo(cx + bw * 0.08, y - h * 0.5, cx + bw * 0.32, y - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#6c5a9c"; ctx.fillRect(cx - bw * 0.3, y - bw * 0.16, bw * 0.6, bw * 0.1);
    ctx.fillStyle = "#e6c25a"; ctx.fillRect(cx - bw * 0.05, y - bw * 0.17, bw * 0.1, bw * 0.12);
  } else if (id === "fleurs") {
    const cols = ["#e8a0b4", "#f3e3a0", "#c3b1e1", "#e8a0b4", "#a8c8e6"];
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.15 + i * 0.175);
      const x = cx + Math.cos(a) * w * 0.34, y = top + w * 0.3 + Math.sin(a) * w * 0.3;
      ctx.fillStyle = cols[i];
      for (const pa of [0, 1.26, 2.51, 3.77, 5.03]) { ctx.beginPath(); ctx.arc(x + Math.cos(pa) * 3.2, y + Math.sin(pa) * 3.2, 2.8, 0, TAU); ctx.fill(); }
      circle(x, y, 1.8, "#e6c25a", null);
    }
  } else if (id === "hautdeforme") {
    const bw = w * 0.5, y = top + w * 0.06, h = w * 0.42;
    ctx.fillStyle = "#1d1b22";
    ctx.beginPath(); ctx.ellipse(cx, y, bw * 0.7, bw * 0.13, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(cx - bw * 0.4, y - h, bw * 0.8, h, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#a3354a"; ctx.fillRect(cx - bw * 0.4, y - h * 0.32, bw * 0.8, h * 0.14);
  } else if (id === "couronne") {
    const bw = w * 0.46, y = top + w * 0.08, h = w * 0.26;
    ctx.fillStyle = "#e6c25a";
    ctx.beginPath(); ctx.moveTo(cx - bw / 2, y);
    ctx.lineTo(cx - bw / 2, y - h); ctx.lineTo(cx - bw / 4, y - h * 0.55); ctx.lineTo(cx, y - h * 1.1);
    ctx.lineTo(cx + bw / 4, y - h * 0.55); ctx.lineTo(cx + bw / 2, y - h); ctx.lineTo(cx + bw / 2, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    circle(cx, y - h * 0.3, 2.4, "#a3354a", null);
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3); ctx.fillStyle = "#fff"; sparkle(cx + bw * 0.45, y - h * 1.1, 3.5); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** Haut de la tête du sprite (proportions relevées sur les sprites Figma). */
function headTop(stage, x, y, w, h) {
  if (stage === "tetard") return { cx: x + w * 0.48, top: y + h * 0.06, w: w * 0.6 };
  if (stage === "grenouillette") return { cx: x + w * 0.478, top: y + h * 0.1, w: w * 0.6 };
  return { cx: x + w * 0.5, top: y + h * 0.14, w: w * 0.56 };
}

/** Objets de décor achetés à la boutique, posés dans la mare (ou dessinés en vignette). */
function drawDecor(id, x, y, t, night, s = 1) {
  const INK = C.COLORS.trait;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
  if (id === "champignons") {
    for (const [dx, h, r] of [[-7, 12, 7], [5, 9, 5.5]]) {
      ctx.fillStyle = "#efe9da"; ctx.fillRect(dx - 2, -h, 4, h); ctx.strokeRect(dx - 2, -h, 4, h);
      ctx.beginPath(); ctx.arc(dx, -h, r, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = GOTH ? "#6c5a9c" : "#e0527a"; ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f4f0ea"; ctx.beginPath(); ctx.arc(dx - r * 0.35, -h - r * 0.45, 1.3, 0, TAU); ctx.arc(dx + r * 0.3, -h - r * 0.3, 1.1, 0, TAU); ctx.fill();
    }
  } else if (id === "lanterne") {
    ctx.fillStyle = "#1d1b22"; ctx.fillRect(-1.5, -30, 3, 30);
    if (night) { const g = ctx.createRadialGradient(0, -36, 0, 0, -36, 26); g.addColorStop(0, "rgba(255,207,122,0.6)"); g.addColorStop(1, "rgba(255,207,122,0)"); ctx.fillStyle = g; ctx.fillRect(-26, -62, 52, 52); }
    ctx.beginPath(); ctx.roundRect(-6, -44, 12, 14, 2); ctx.fillStyle = night ? "#ffcf7a" : "#f3e3a0"; ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1d1b22"; ctx.beginPath(); ctx.moveTo(-8, -44); ctx.lineTo(0, -50); ctx.lineTo(8, -44); ctx.fill();
  } else if (id === "citrouille") {
    ctx.fillStyle = "#e0893a";
    for (const dx of [-6, 6, 0]) { ctx.beginPath(); ctx.ellipse(dx, -9, 7.5, 9, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.strokeStyle = "#5d7a3a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(2, -23, 5, -23); ctx.stroke();
    if (night) { ctx.fillStyle = "#ffcf7a"; ctx.beginPath(); ctx.moveTo(-5, -11); ctx.lineTo(-2, -13); ctx.lineTo(-2, -9); ctx.moveTo(5, -11); ctx.lineTo(2, -13); ctx.lineTo(2, -9); ctx.fill(); }
  } else if (id === "chaudron") {
    ctx.fillStyle = "#1d1b22";
    ctx.beginPath(); ctx.ellipse(0, -10, 12, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -18, 11, 3.2, 0, 0, TAU); ctx.fillStyle = "#8fd18a"; ctx.fill(); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.8 + i / 3) % 1;
      ctx.globalAlpha = 1 - k; circle(-4 + i * 4, -20 - k * 16, 2 + k * 2, "#b9e6b1", INK, 1.2);
    }
    ctx.globalAlpha = 1;
  } else if (id === "corbeau") {
    ctx.fillStyle = "#1d1b22";
    ctx.beginPath(); ctx.ellipse(0, -8, 7, 8, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -17, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e6c25a"; ctx.beginPath(); ctx.moveTo(8, -18); ctx.lineTo(13, -16); ctx.lineTo(8, -15); ctx.fill();
    ctx.fillStyle = "#f4f0ea"; ctx.beginPath(); ctx.arc(5.5, -18.5, 1.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#1d1b22"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(-11, 1); ctx.stroke();
  } else if (id === "chat") {
    ctx.fillStyle = "#1d1b22";
    ctx.beginPath(); ctx.ellipse(0, -10, 8, 10, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -22, 7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, -25); ctx.lineTo(-5, -33); ctx.lineTo(-1, -28); ctx.moveTo(6, -25); ctx.lineTo(5, -33); ctx.lineTo(1, -28); ctx.fill();
    ctx.strokeStyle = "#1d1b22"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(7, -4); ctx.quadraticCurveTo(18, -6 + Math.sin(t * 2) * 4, 14, -18 + Math.sin(t * 2) * 3); ctx.stroke();
    ctx.fillStyle = "#e6c25a";
    const blink = (t % 5) < 0.15;
    if (blink) { ctx.fillRect(-4.5, -23, 3, 1.2); ctx.fillRect(1.5, -23, 3, 1.2); }
    else { ctx.beginPath(); ctx.ellipse(-3, -23, 1.6, 2.2, 0, 0, TAU); ctx.ellipse(3, -23, 1.6, 2.2, 0, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

const EGG_SHELL = GOTH && !HYB ? "#efebe4" : "#fbf6e6";
const EGG_SPOTS = GOTH && !HYB ? "#5b5563" : HYB ? "#b8a9e0" : C.COLORS.vert;

function charBox(stage, key) {
  const sprite = img[key];
  let h = C.AGE_SIZES_PX[stage] * L.charScale;
  let w = sprite ? (sprite.width * h) / sprite.height : h * 0.8;
  if (w > C.W - 30) { h *= (C.W - 30) / w; w = C.W - 30; }
  return { x: (C.W - w) / 2, y: L.charBottom - h, w, h, cx: C.W / 2, cy: L.charBottom - h / 2 };
}

// ---------------------------------------------------------------------------
// Outils de dessin
// ---------------------------------------------------------------------------
function rr(x, y, w, h, fill, stroke = C.COLORS.trait, lw = 2.5, r = h / 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

/** Assombrit une couleur hex (rebord des boutons bonbon). */
function shade(hex, k = 0.82) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.round(v * k).toString(16).padStart(2, "0");
  return `#${c(n >> 16)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

function circle(x, y, r, fill, stroke = C.COLORS.trait, lw = 2.5) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

function text(str, x, y, size, color = C.COLORS.trait, align = "center", weight = 600) {
  // Thème gothique : les grands titres en écriture gothique, le reste en machine à écrire.
  const title = GOTH && size >= 17 && weight >= 700;
  ctx.font = `${title ? 600 : weight} ${title ? size + 3 : size}px ${title ? FONTS.title : FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}

function cloud(x, y, s, color = "#ffffff") {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 26 * s, 11 * s, 0, 0, TAU);
  ctx.arc(x - 9 * s, y - 7 * s, 11 * s, 0, TAU);
  ctx.arc(x + 8 * s, y - 9 * s, 14 * s, 0, TAU);
  ctx.fill();
}

function sparkle(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

function lilyPad(cx, cy, rx, night) {
  const ry = rx * 0.3;
  ctx.fillStyle = night ? "rgba(20,14,50,0.35)" : "rgba(70,120,140,0.18)";
  ctx.beginPath(); ctx.ellipse(cx, cy + 4, rx * 1.02, ry, 0, 0, TAU); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0.12 * Math.PI + Math.PI * 1.5, 1.38 * Math.PI + Math.PI * 1.5 + TAU * 0.5);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = night ? C.COLORS.nenuphar_nuit : C.COLORS.nenuphar;
  ctx.fill();
  ctx.lineWidth = rx > 40 ? 3.5 : 2.5; ctx.lineJoin = "round"; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
  ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - rx * 0.55, cy + ry * 0.1); ctx.lineTo(cx - rx * 0.1, cy - ry * 0.1);
  ctx.moveTo(cx + rx * 0.55, cy + ry * 0.15); ctx.lineTo(cx + rx * 0.1, cy - ry * 0.05); ctx.stroke();
  ctx.globalAlpha = 1;
}

function poop(x, y, s = 1) {
  // Petit tortillon kawaï, avec deux yeux.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#b07a4f";
  ctx.strokeStyle = C.COLORS.trait;
  ctx.lineWidth = 2.4;
  for (const [w, yy] of [[13, 0], [10, -6], [6, -11]]) {
    ctx.beginPath(); ctx.ellipse(0, yy, w, 5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.quadraticCurveTo(4, -19, 1, -21); ctx.stroke();
  ctx.fillStyle = C.COLORS.trait;
  ctx.beginPath(); ctx.arc(-4, -1, 1.4, 0, TAU); ctx.arc(4, -1, 1.4, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Particules + petits textes flottants
// ---------------------------------------------------------------------------
class Particles {
  constructor() { this.list = []; this.texts = []; }

  burst(x, y, color, { count = 8, speed = 50, life = 0.6, radius = 3, gravity = 60, shape = "dot" } = {}) {
    for (let n = 0; n < count; n++) {
      const a = Math.random() * TAU;
      const v = speed * (0.4 + 0.6 * Math.random());
      this.list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, color, radius,
        life, max: life, gravity, shape });
    }
  }

  float(x, y, str, color = C.COLORS.trait) {
    this.texts.push({ x, y, str, color, life: 0.9 });
  }

  update(dt) {
    for (const p of this.list) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravity * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= 40 * dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  draw() {
    for (const p of this.list) {
      const f = Math.max(0, p.life / p.max);
      ctx.globalAlpha = f;
      if (p.shape === "heart") drawIcon(ctx, "calin", p.x, p.y, p.radius * 3);
      else if (p.shape === "star") { ctx.fillStyle = p.color; sparkle(p.x, p.y, p.radius * 1.6); }
      else if (p.shape === "bubble") circle(p.x, p.y, p.radius, "rgba(255,255,255,0.6)", "#46aee0", 1.2);
      else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.radius * f), 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.lineJoin = "round";
      ctx.font = `700 16px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.strokeText(t.str, t.x, t.y);
      text(t.str, t.x, t.y, 16, t.color, "center", 700);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// Décor
// ---------------------------------------------------------------------------
const stars = Array.from({ length: 28 }, (_, i) => ({
  x: 10 + ((i * 97) % 300), y: 12 + ((i * 53) % 440), phase: (i * 1.7) % TAU, big: i % 6 === 0,
}));
const clouds = [{ x: 30, y: 0.12, speed: 6 }, { x: 210, y: 0.3, speed: 4 }, { x: 120, y: 0.48, speed: 5 }];
let bodyColor = null;

// Grain papier très léger, généré une fois, posé par-dessus le ciel (casse l'aplat numérique).
const grain = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const data = g.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.random() * 255;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
    data.data[i + 3] = 14;
  }
  g.putImageData(data, 0, 0);
  return c;
})();
let grainPattern = null;

function drawGrain() {
  grainPattern ??= ctx.createPattern(grain, "repeat");
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, C.W, view.H);
}

function skyGradient(night) {
  const g = ctx.createLinearGradient(0, 0, 0, view.H);
  if (night) { g.addColorStop(0, "#221c42"); g.addColorStop(0.6, "#2e2650"); g.addColorStop(1, "#3a3068"); }
  else { g.addColorStop(0, "#fff9ec"); g.addColorStop(0.55, "#fff2da"); g.addColorStop(1, "#fde6cf"); }
  return g;
}

// Petite faune du décor (papillons le jour, lucioles la nuit), positions pseudo-aléatoires stables.
const fireflies = Array.from({ length: 9 }, (_, i) => ({ x: (i * 71) % 300 + 10, y: (i * 37) % 120, p: i * 1.3 }));
let sceneT = 0;

// Prairie : fleurs en petits bouquets, touffes d'herbe et cailloux éparpillés (positions fixes,
// réparties sur toute la bande entre la mare et le dock : u = 0..1 en largeur, v = 0..1 en hauteur).
const MEADOW_FLOWERS = [[0.07, 0.25, 1.1, 0], [0.11, 0.38, 0.8, 1], [0.24, 0.72, 0.9, 2], [0.38, 0.3, 1, 3], [0.42, 0.45, 0.7, 0],
  [0.55, 0.8, 1.1, 1], [0.63, 0.22, 0.8, 2], [0.71, 0.55, 1, 0], [0.75, 0.66, 0.75, 3], [0.88, 0.3, 0.9, 1], [0.95, 0.75, 1, 2], [0.31, 0.9, 0.8, 1]];
const MEADOW_TUFTS = [[0.04, 0.6], [0.19, 0.3], [0.33, 0.62], [0.49, 0.2], [0.6, 0.55], [0.8, 0.85], [0.92, 0.5], [0.15, 0.88]];
const MEADOW_PEBBLES = [[0.28, 0.4, 3], [0.52, 0.66, 2.4], [0.84, 0.18, 2.8]];

function meadowBand() {
  const top = L.pond.cy + 60, bottom = L.dock.y - 6;
  return { top, bottom, at: (u, v) => [u * C.W, top + v * (bottom - top)] };
}

function drawMeadow(night, flowerColor) {
  const m = meadowBand();
  for (const [u, v, r] of MEADOW_PEBBLES) {
    const [x, y] = m.at(u, v);
    ctx.fillStyle = night ? "#3a3642" : "#b9b3ab";
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.5, r, 0, 0, TAU); ctx.fill();
  }
  for (const [u, v] of MEADOW_TUFTS) {
    const [x, y] = m.at(u, v);
    ctx.strokeStyle = night ? "#2c3a2c" : GOTH ? "#5f7258" : "#8cc47a"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
    ctx.beginPath();
    for (const dx of [-3, 0, 3]) { ctx.moveTo(x + dx * 0.6, y); ctx.lineTo(x + dx, y - 5 - Math.abs(dx) * -0.3); }
    ctx.stroke();
  }
  const palette = ["#ffc2d4", "#fff1a8", "#d6d1ff", "#c8e6f5"];
  for (const [u, v, sc, ci] of MEADOW_FLOWERS) {
    const [x, y] = m.at(u, v);
    ctx.fillStyle = flowerColor(palette[ci]);
    for (const a of [0, 1.26, 2.51, 3.77, 5.03]) { ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3 * sc, y + Math.sin(a) * 3 * sc, 2.4 * sc, 0, TAU); ctx.fill(); }
    ctx.fillStyle = night ? "#8a86a8" : "#ffd84a"; ctx.beginPath(); ctx.arc(x, y, 1.5 * sc, 0, TAU); ctx.fill();
  }
}

function hills(yBase, amp, freq, phase, color) {
  ctx.beginPath();
  ctx.moveTo(0, view.H);
  for (let x = 0; x <= C.W; x += 8) ctx.lineTo(x, yBase - amp * (0.5 + 0.5 * Math.sin(x * freq + phase)));
  ctx.lineTo(C.W, view.H);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function tree(x, y, r, night) {
  ctx.fillStyle = night ? "#2a2850" : "#9c8266";
  ctx.fillRect(x - 2, y - 4, 4, 12);
  ctx.fillStyle = night ? "#34336a" : "#9fd08f";
  ctx.beginPath(); ctx.arc(x, y - r, r, 0, TAU); ctx.arc(x - r * 0.6, y - r * 0.5, r * 0.7, 0, TAU);
  ctx.arc(x + r * 0.6, y - r * 0.5, r * 0.7, 0, TAU); ctx.fill();
}

function reed(x, yBase, h, t, night) {
  const sway = Math.sin(t * 1.2 + x * 0.3) * 3;
  ctx.strokeStyle = night ? "#4f6b52" : "#7fb56e";
  ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, yBase); ctx.quadraticCurveTo(x + sway * 0.4, yBase - h * 0.6, x + sway, yBase - h); ctx.stroke();
  ctx.fillStyle = night ? "#6b4f3f" : "#a0714f";
  ctx.beginPath(); ctx.ellipse(x + sway, yBase - h - 7, 3.6, 9, sway * 0.03, 0, TAU); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
}

function lotus(x, y, night) {
  lilyPad(x, y, 20, night);
  const petals = night ? "#e6b3d6" : "#ffc2d4";
  for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
    ctx.save(); ctx.translate(x, y - 3); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, -7, 4.5, 8.5, 0, 0, TAU);
    ctx.fillStyle = petals; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.arc(x, y - 4, 2.6, 0, TAU); ctx.fill();
}

function butterfly(x, y, t, color) {
  const flap = Math.abs(Math.sin(t * 12));
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = color; ctx.strokeStyle = C.COLORS.trait; ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(side * 5 * flap, -2, 5 * flap + 1, 5, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(side * 3.5 * flap, 4, 3.5 * flap + 0.8, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = C.COLORS.trait; ctx.fillRect(-1, -5, 2, 11);
  ctx.restore();
}

// Le décor fixe (ciel, soleil/lune, collines, arbres, grain) est dessiné une fois dans deux
// calques hors écran, puis simplement recopié : gros gain sur un téléphone d'entrée de gamme.
const layers = { key: null, back: null, front: null };

function renderLayer(draw) {
  const c = document.createElement("canvas");
  c.width = canvas.width; c.height = canvas.height;
  const g = c.getContext("2d");
  g.setTransform(canvas.width / C.W, 0, 0, canvas.height / view.H, 0, 0);
  const saved = ctx; const savedPattern = grainPattern;
  ctx = g; grainPattern = null;
  draw();
  ctx = saved; grainPattern = savedPattern;
  return c;
}

function drawSky(t, night) {
  if (GOTH) return drawSkyGothic(t, night);
  sceneT = t;
  const color = night ? "#241e46" : "#fff4e4";
  if (color !== bodyColor) { document.body.style.background = color; bodyColor = color; }
  const horizon = L.pond.cy - 105;
  const key = `${night}|${canvas.width}|${canvas.height}|${L.pond.cy}`;
  if (layers.key !== key) {
    layers.key = key;
    layers.back = renderLayer(() => {
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      if (night) { g.addColorStop(0, "#1c1738"); g.addColorStop(1, "#3d3470"); }
      else { g.addColorStop(0, "#ffeede"); g.addColorStop(0.6, "#fff6e6"); g.addColorStop(1, "#f1f8e4"); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, view.H);
      if (night) {
        const mx = C.W - 66, my = L.hudBottom + 44;
        const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 60);
        halo.addColorStop(0, "rgba(255,247,176,0.35)"); halo.addColorStop(1, "rgba(255,247,176,0)");
        ctx.fillStyle = halo; ctx.fillRect(mx - 60, my - 60, 120, 120);
        circle(mx, my, 18, "#fff7c8", null);
        ctx.fillStyle = "#e9dfa4";
        ctx.beginPath(); ctx.arc(mx - 6, my - 4, 3.5, 0, TAU); ctx.arc(mx + 5, my + 6, 2.5, 0, TAU); ctx.fill();
      } else {
        const sx = 58, sy = L.hudBottom + 40;
        const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, 70);
        glow.addColorStop(0, "rgba(255,214,120,0.55)"); glow.addColorStop(1, "rgba(255,214,120,0)");
        ctx.fillStyle = glow; ctx.fillRect(sx - 70, sy - 70, 140, 140);
        circle(sx, sy, 20, "#ffd98a", null);
      }
    });
    layers.front = renderLayer(() => {
      hills(horizon + 6, 40, 0.02, 1.2, night ? "#2b2857" : "#dcefcf");
      for (const [x, r] of [[34, 13], [60, 9], [112, 8], [226, 10], [252, 14], [284, 9]]) {
        tree(x, horizon + 2 - 40 * (0.5 + 0.5 * Math.sin(x * 0.02 + 1.2)) + 8, r, night);
      }
      hills(horizon + 40, 26, 0.028, 4, night ? "#322f61" : "#cbe7b8");
      hills(horizon + 70, 14, 0.04, 2, night ? "#38356a" : "#bfe1a9");
      drawGrain();
    });
  }
  ctx.drawImage(layers.back, 0, 0, C.W, view.H);
  if (night) {
    for (const st of stars) {
      if (st.y > horizon - 30) continue;
      ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.5 + st.phase));
      ctx.fillStyle = st.big ? "#fff7b0" : "#fff";
      if (st.big) sparkle(st.x, st.y, 5);
      else { ctx.beginPath(); ctx.arc(st.x, st.y, 1.2, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  } else {
    for (const c of clouds) cloud(((c.x + t * c.speed) % (C.W + 100)) - 50, L.hudBottom + (horizon - L.hudBottom) * c.y + 20, 1);
  }
  ctx.drawImage(layers.front, 0, 0, C.W, view.H);
}

function drawPond(night, critters = true) {
  if (GOTH) return drawPondGothic(night, critters);
  const t = sceneT;
  const p = L.pond;
  const rx = C.W * 0.66, ry = 46;
  // Berge (sable) puis eau
  ctx.fillStyle = night ? "#3f3a6a" : "#f1e2c2";
  ctx.beginPath(); ctx.ellipse(C.W / 2, p.cy, rx + 8, ry + 7, 0, 0, TAU); ctx.fill();
  const water = ctx.createRadialGradient(C.W / 2, p.cy - 10, 10, C.W / 2, p.cy, rx);
  water.addColorStop(0, night ? "#4d4590" : "#dcf4fc");
  water.addColorStop(1, night ? "#332c66" : "#a9dcf0");
  ctx.fillStyle = water;
  ctx.beginPath(); ctx.ellipse(C.W / 2, p.cy, rx, ry, 0, 0, TAU); ctx.fill();
  // Reflet du ciel (lune ou soleil)
  ctx.globalAlpha = night ? 0.35 : 0.5;
  ctx.fillStyle = night ? "#fff7c8" : "#ffffff";
  ctx.beginPath(); ctx.ellipse(night ? C.W - 66 : 70, p.cy - 18, 16, 3.5, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  // Ronds dans l'eau
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.25 + i / 3) % 1;
    const x = [70, 250, 170][i], y = p.cy + [10, 16, 30][i];
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.strokeStyle = night ? "#8f86d0" : "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, 6 + k * 22, 2 + k * 6, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  lotus(38, p.cy + 14, night);
  lotus(C.W - 30, p.cy + 26, night);
  // Roseaux sur les bords
  for (const [x, h] of [[10, 70], [22, 88], [34, 60], [C.W - 12, 80], [C.W - 26, 62]]) reed(x, p.cy - 18, h, t, night);
  // Herbe au premier plan
  ctx.fillStyle = night ? "#2d2a55" : "#b9dfa2";
  ctx.beginPath(); ctx.moveTo(0, view.H);
  for (let x = 0; x <= C.W; x += 10) ctx.lineTo(x, p.cy + ry + 14 + Math.sin(x * 0.15) * 3);
  ctx.lineTo(C.W, view.H); ctx.closePath(); ctx.fill();
  drawMeadow(night, (c) => (night ? "#5a567f" : c));
  // Petite faune (pas dans les mini-jeux : on la confondrait avec les insectes à attraper)
  if (!critters) return;
  if (night) {
    for (const f of fireflies) {
      const x = f.x + Math.sin(t * 0.6 + f.p) * 18, y = p.cy - 40 - f.y * 0.8 + Math.cos(t * 0.8 + f.p) * 10;
      const a = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + f.p * 2));
      const gl = ctx.createRadialGradient(x, y, 0, x, y, 9);
      gl.addColorStop(0, `rgba(255,240,140,${a})`); gl.addColorStop(1, "rgba(255,240,140,0)");
      ctx.fillStyle = gl; ctx.fillRect(x - 9, y - 9, 18, 18);
    }
  } else {
    butterfly(C.W / 2 + Math.sin(t * 0.35) * 120, L.hudBottom + 90 + Math.sin(t * 0.9) * 30, t, "#ffc2d4");
    butterfly(C.W / 2 + Math.cos(t * 0.27 + 2) * 110, L.hudBottom + 150 + Math.cos(t * 0.7) * 24, t + 1, "#d6d1ff");
  }
}

// ---------------------------------------------------------------------------
// Décor gothique : brume, académie au loin, arbres nus, roses noires… qui reprennent
// des couleurs à mesure que la grenouille sourit (pet.sourire).
// ---------------------------------------------------------------------------
function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function bareTree(x, y, len, angle, depth, night) {
  const x2 = x + Math.cos(angle) * len, y2 = y + Math.sin(angle) * len;
  ctx.strokeStyle = night ? "#0b0a0e" : "#2b2830";
  ctx.lineWidth = depth * 1.4 + 0.6; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  if (depth > 0) {
    bareTree(x2, y2, len * 0.72, angle - 0.45 - depth * 0.05, depth - 1, night);
    bareTree(x2, y2, len * 0.66, angle + 0.5, depth - 1, night);
  }
}

function academy(x, y, night) {
  const wall = night ? "#15121c" : "#6f6a78";
  const win = night ? "#ffcf7a" : "#4a4652";
  ctx.fillStyle = wall;
  ctx.fillRect(x - 34, y - 26, 68, 26);
  for (const [tx, tw, th] of [[-40, 12, 44], [28, 12, 40], [-6, 14, 56]]) {
    ctx.fillRect(x + tx, y - th, tw, th);
    ctx.beginPath(); ctx.moveTo(x + tx - 2, y - th); ctx.lineTo(x + tx + tw / 2, y - th - 16); ctx.lineTo(x + tx + tw + 2, y - th); ctx.fill();
  }
  if (night) { ctx.shadowColor = "#ffcf7a"; ctx.shadowBlur = 6; }
  ctx.fillStyle = win;
  for (const wx of [-26, -14, 12, 22]) { ctx.beginPath(); ctx.roundRect(x + wx, y - 18, 4, 7, [2, 2, 0, 0]); ctx.fill(); }
  for (const [wx, wy] of [[-36, -34], [31, -30], [-1, -44]]) { ctx.beginPath(); ctx.roundRect(x + wx, y + wy, 4, 6, [2, 2, 0, 0]); ctx.fill(); }
  ctx.shadowBlur = 0;
}

// ---------------------------------------------------------------------------
// Décor dessiné (assets/decor, 4 ambiances) : remplace le décor tracé en code des thèmes
// gothique et hybride. Chaque ambiance = 3 plans SVG (fond, nuages, avant) au format 320 × 692,
// calés pour que le grand nénuphar (y = 474 dans le dessin) tombe sous la grenouille.
// ---------------------------------------------------------------------------
const DECOR = {
  jour: { sky: "#DCD6E6", ground: "#A7BDA1" }, crepuscule: { sky: "#D9C4D6", ground: "#97AA92" },
  nuit: { sky: "#2A2640", ground: "#36534B" }, hiver: { sky: "#D6DCE7", ground: "#F4F5F8" },
};
const DECOR_PLANS = ["fond", "nuages", "avant"];
const DECOR_PAD_Y = 474, DECOR_H = 692;
const decorOn = () => GOTH && !!img.decor_jour_avant;
function decorVariant(night) {
  if (night) return "nuit";
  const h = currentHour();
  if (h >= 18 || h < 8) return "crepuscule";
  return seasonNow() === "hiver" ? "hiver" : "jour";
}
const decorLayers = { key: null };
function decorPrepare(night) {
  const v = decorVariant(night), k = smileK();
  const dy = L.pond.cy - 4 - DECOR_PAD_Y;
  const key = `${v}|${canvas.width}|${canvas.height}|${Math.round(dy)}|${Math.floor(k * 4)}`;
  if (decorLayers.key !== key) {
    const sat = `saturate(${(0.6 + 0.4 * k).toFixed(2)})`;
    const plan = (name, before) => renderLayer(() => {
      ctx.filter = sat;
      before?.();
      const im = img[`decor_${v}_${name}`];
      if (im) ctx.drawImage(im, 0, dy, C.W, DECOR_H);
      ctx.filter = "none";
    });
    decorLayers.key = key; decorLayers.v = v; decorLayers.dy = dy;
    decorLayers.fond = plan("fond", () => { ctx.fillStyle = DECOR[v].sky; ctx.fillRect(0, 0, C.W, view.H); });
    decorLayers.nuages = plan("nuages");
    decorLayers.avant = plan("avant", () => { ctx.fillStyle = DECOR[v].ground; ctx.fillRect(0, dy + DECOR_H - 40, C.W, Math.max(0, view.H - dy - DECOR_H + 40)); });
  }
  return decorLayers;
}
function drawDecorBack(t, night) {
  sceneT = t;
  const d = decorPrepare(night);
  const color = DECOR[d.v].sky;
  if (color !== bodyColor) { document.body.style.background = color; bodyColor = color; }
  ctx.drawImage(d.fond, 0, 0, C.W, view.H);
  ctx.drawImage(d.nuages, Math.sin(t * 0.07) * 9, Math.sin(t * 0.11) * 1.5, C.W, view.H); // les nuages dérivent doucement
}
function drawDecorFront(night, critters) {
  const d = decorPrepare(night), t = sceneT, dy = d.dy;
  ctx.drawImage(d.avant, 0, 0, C.W, view.H);
  // ronds dans l'eau
  ctx.strokeStyle = night ? "#8f9bc4" : "#ffffff"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.2 + i / 3) % 1;
    const x = [84, 262, 214][i], y = dy + [492, 478, 516][i];
    ctx.globalAlpha = (1 - q) * 0.45;
    ctx.beginPath(); ctx.ellipse(x, y, 5 + q * 16, 1.6 + q * 4.5, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (critters && !night && d.v !== "hiver") butterfly(C.W / 2 + Math.sin(t * 0.35) * 110, dy + 300 + Math.sin(t * 0.9) * 24, t, "#e8a0b4");
}

function drawSkyGothic(t, night) {
  if (decorOn()) return drawDecorBack(t, night);
  sceneT = t;
  const color = night ? "#0e0c13" : "#b3aeb8";
  if (color !== bodyColor) { document.body.style.background = color; bodyColor = color; }
  const horizon = L.pond.cy - 105;
  const k = smileK();
  const key = `g|${night}|${canvas.width}|${canvas.height}|${L.pond.cy}|${Math.floor(k * 4)}`;
  if (layers.key !== key) {
    layers.key = key;
    layers.back = renderLayer(() => {
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      if (night) { g.addColorStop(0, "#0e0c13"); g.addColorStop(1, mix("#2a2336", "#3b3060", k)); }
      else { g.addColorStop(0, mix("#a9a4b0", "#b9cde0", k)); g.addColorStop(1, mix("#d9d5d6", "#f3e6d2", k)); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, view.H);
      if (night) {
        const mx = C.W - 70, my = L.hudBottom + 50;
        const halo = ctx.createRadialGradient(mx, my, 14, mx, my, 80);
        halo.addColorStop(0, "rgba(239,233,218,0.3)"); halo.addColorStop(1, "rgba(239,233,218,0)");
        ctx.fillStyle = halo; ctx.fillRect(mx - 80, my - 80, 160, 160);
        circle(mx, my, 26, "#efe9da", null);
        ctx.fillStyle = "#d8d0bd";
        ctx.beginPath(); ctx.arc(mx - 8, my - 6, 5, 0, TAU); ctx.arc(mx + 9, my + 8, 3.5, 0, TAU); ctx.arc(mx + 6, my - 11, 2.5, 0, TAU); ctx.fill();
      } else {
        const sx = 62, sy = L.hudBottom + 44;
        ctx.globalAlpha = 0.35 + 0.5 * k;
        circle(sx, sy, 20, "#f6f0e2", null);
        ctx.globalAlpha = 1;
        if (k >= 0.25) { // un rayon de soleil perce la brume
          ctx.fillStyle = `rgba(255,236,190,${0.06 + 0.1 * k})`;
          for (const a of [0.55, 0.8, 1.05]) {
            ctx.beginPath(); ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(a - 0.06) * 400, sy + Math.sin(a - 0.06) * 400);
            ctx.lineTo(sx + Math.cos(a + 0.06) * 400, sy + Math.sin(a + 0.06) * 400); ctx.fill();
          }
        }
        if (game.pet.sourire >= 100) { // l'arc-en-ciel final
          ctx.globalAlpha = 0.45;
          ["#e8a0a8", "#f0c89a", "#f3e3a0", "#b6d9a8", "#a8c8e6", "#c3b1e1"].forEach((c, i) => {
            ctx.strokeStyle = c; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.arc(C.W / 2, horizon + 60, 150 - i * 7, Math.PI, TAU); ctx.stroke();
          });
          ctx.globalAlpha = 1;
        }
      }
    });
    layers.front = renderLayer(() => {
      hills(horizon + 6, 40, 0.02, 1.2, night ? "#1f1b27" : mix("#8f8a96", "#a7c29a", k * 0.6));
      const hillY = (x) => horizon + 6 - 40 * (0.5 + 0.5 * Math.sin(x * 0.02 + 1.2));
      const ay = hillY(222) + 6;
      academy(222, ay, night);
      ctx.fillStyle = night ? "#1f1b27" : mix("#8f8a96", "#a7c29a", k * 0.6);
      ctx.beginPath(); ctx.ellipse(222, ay + 2, 52, 9, 0, 0, TAU); ctx.fill(); // butte sous les fondations
      bareTree(40, horizon + 20, 22, -1.6, 3, night);
      bareTree(92, horizon + 26, 15, -1.5, 3, night);
      bareTree(290, horizon + 30, 18, -1.7, 3, night);
      hills(horizon + 40, 26, 0.028, 4, night ? "#232a2a" : mix("#7e8a7c", "#9fc28f", k * 0.7));
      hills(horizon + 70, 14, 0.04, 2, night ? "#1f2524" : mix("#72806f", "#94bd84", k * 0.7));
      drawGrain();
    });
  }
  ctx.drawImage(layers.back, 0, 0, C.W, view.H);
  if (night) {
    for (const st of stars) {
      if (st.y > horizon - 30) continue;
      ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.5 + st.phase));
      ctx.fillStyle = "#efe9da";
      ctx.beginPath(); ctx.arc(st.x, st.y, st.big ? 1.6 : 1, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    const cc = mix("#8e8995", "#ffffff", k);
    for (const c of clouds) cloud(((c.x + t * c.speed) % (C.W + 100)) - 50, L.hudBottom + (horizon - L.hudBottom) * c.y + 20, 1.1, cc);
  }
  ctx.drawImage(layers.front, 0, 0, C.W, view.H);
  // Brume qui glisse au ras des collines
  ctx.fillStyle = night ? "rgba(180,170,200,0.08)" : "rgba(255,255,255,0.22)";
  for (let i = 0; i < 3; i++) {
    const x = ((t * (6 + i * 3) + i * 140) % (C.W + 240)) - 120;
    ctx.beginPath(); ctx.ellipse(x, horizon + 30 + i * 18, 120, 10, 0, 0, TAU); ctx.fill();
  }
}

function rose(x, y, night, k) {
  lilyPad(x, y, 20, night);
  const petal = night ? mix("#2a2530", "#8c3a52", k) : mix("#3d3844", "#c24a63", k);
  ctx.lineWidth = 1.8; ctx.strokeStyle = C.COLORS.trait;
  for (const [dx, dy, r] of [[-5, -4, 6], [5, -4, 6], [0, -9, 6], [0, -3, 5]]) {
    ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fillStyle = petal; ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y - 6, 2.4, 0, TAU); ctx.stroke();
}

function gravestone(x, y, night) {
  ctx.fillStyle = night ? "#3a3642" : "#a7a3ab";
  ctx.strokeStyle = C.COLORS.trait; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x - 10, y - 16); ctx.arc(x, y - 16, 10, Math.PI, TAU); ctx.lineTo(x + 10, y); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1.6; // petite croix gravée
  ctx.beginPath(); ctx.moveTo(x, y - 21); ctx.lineTo(x, y - 9); ctx.moveTo(x - 4, y - 17); ctx.lineTo(x + 4, y - 17); ctx.stroke();
  ctx.fillStyle = night ? "#2c3a2c" : "#6d8a5f"; // touffe d'herbe au pied
  ctx.beginPath(); ctx.ellipse(x - 7, y, 5, 2.5, 0, 0, TAU); ctx.ellipse(x + 8, y, 4, 2, 0, 0, TAU); ctx.fill();
}

function crow(x, y, t) {
  const f = Math.sin(t * 9) * 5;
  ctx.strokeStyle = "#1d1b22"; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x - 10, y - f); ctx.quadraticCurveTo(x - 4, y - 4, x, y); ctx.quadraticCurveTo(x + 4, y - 4, x + 10, y - f); ctx.stroke();
}

function bat(x, y, t) {
  const f = Math.sin(t * 14);
  ctx.fillStyle = "#0b0a0e";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 6, y - 6 - f * 4, x - 13, y - 2 - f * 5);
  ctx.quadraticCurveTo(x - 8, y + 1, x - 5, y + 4);
  ctx.quadraticCurveTo(x, y + 2, x + 5, y + 4);
  ctx.quadraticCurveTo(x + 8, y + 1, x + 13, y - 2 - f * 5);
  ctx.quadraticCurveTo(x + 6, y - 6 - f * 4, x, y);
  ctx.fill();
  ctx.fillStyle = "#e9e5df"; ctx.beginPath(); ctx.arc(x - 1.5, y, 0.8, 0, TAU); ctx.arc(x + 1.5, y, 0.8, 0, TAU); ctx.fill();
}

function drawPondGothic(night, critters = true) {
  if (decorOn()) return drawDecorFront(night, critters);
  const t = sceneT;
  const p = L.pond;
  const k = smileK();
  const rx = C.W * 0.66, ry = 46;
  ctx.fillStyle = night ? "#2c2833" : "#8f8a86";
  ctx.beginPath(); ctx.ellipse(C.W / 2, p.cy, rx + 8, ry + 7, 0, 0, TAU); ctx.fill();
  const water = ctx.createRadialGradient(C.W / 2, p.cy - 10, 10, C.W / 2, p.cy, rx);
  water.addColorStop(0, night ? "#2b3345" : mix("#8fa1ab", "#bfe2f0", k));
  water.addColorStop(1, night ? "#161b27" : mix("#56656f", "#8cc4dc", k));
  ctx.fillStyle = water;
  ctx.beginPath(); ctx.ellipse(C.W / 2, p.cy, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = night ? 0.4 : 0.3;
  ctx.fillStyle = "#efe9da";
  ctx.beginPath(); ctx.ellipse(night ? C.W - 70 : 66, p.cy - 18, 20, 3.5, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.2 + i / 3) % 1;
    const x = [70, 250, 170][i], y = p.cy + [10, 16, 30][i];
    ctx.globalAlpha = (1 - q) * 0.35;
    ctx.strokeStyle = "#e9e5df"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y, 6 + q * 22, 2 + q * 6, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const [x, h] of [[10, 70], [22, 88], [34, 60], [C.W - 12, 80], [C.W - 26, 62]]) {
    const sway = Math.sin(t * 1.2 + x * 0.3) * 3, yb = p.cy - 18;
    ctx.strokeStyle = night ? "#20251f" : "#3b4038"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, yb); ctx.quadraticCurveTo(x + sway * 0.4, yb - h * 0.6, x + sway, yb - h); ctx.stroke();
    ctx.fillStyle = "#1d1b22";
    ctx.beginPath(); ctx.ellipse(x + sway, yb - h - 7, 3.6, 9, sway * 0.03, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = night ? "#1c2120" : mix("#768271", "#a5cf93", k * 0.8);
  ctx.beginPath(); ctx.moveTo(0, view.H);
  for (let x = 0; x <= C.W; x += 10) ctx.lineTo(x, p.cy + ry + 14 + Math.sin(x * 0.15) * 3);
  ctx.lineTo(C.W, view.H); ctx.closePath(); ctx.fill();
  drawMeadow(night, (c) => (night ? "#3b3844" : mix("#4a4652", c, k)));
  const mb = meadowBand();
  ctx.save(); ctx.translate(...mb.at(0.3, 0.2)); ctx.scale(0.8, 0.8); gravestone(0, 0, night); ctx.restore();
  ctx.save(); ctx.translate(...mb.at(0.93, 0.95)); gravestone(0, 0, night); ctx.restore();
  if (!critters) return;
  if (night) {
    bat(C.W / 2 + Math.sin(t * 0.5) * 120, L.hudBottom + 70 + Math.sin(t * 1.3) * 20, t);
    bat(C.W / 2 + Math.cos(t * 0.4 + 1) * 100, L.hudBottom + 120 + Math.cos(t * 1.1) * 18, t + 0.5);
    // Bougies flottantes au lieu des lucioles
    for (const f of fireflies.slice(0, 5)) {
      const x = f.x + Math.sin(t * 0.5 + f.p) * 12, y = p.cy - 50 - f.y * 0.6 + Math.cos(t * 0.7 + f.p) * 6;
      const gl = ctx.createRadialGradient(x, y - 4, 0, x, y - 4, 12);
      gl.addColorStop(0, "rgba(255,207,122,0.55)"); gl.addColorStop(1, "rgba(255,207,122,0)");
      ctx.fillStyle = gl; ctx.fillRect(x - 12, y - 16, 24, 24);
      ctx.fillStyle = "#efe9da"; ctx.fillRect(x - 2.5, y - 2, 5, 9);
      ctx.fillStyle = "#ffcf7a"; ctx.beginPath(); ctx.ellipse(x, y - 5 + Math.sin(t * 9 + f.p) * 0.6, 2, 3.4, 0, 0, TAU); ctx.fill();
    }
  } else {
    crow(C.W / 2 + Math.sin(t * 0.3) * 130, L.hudBottom + 60 + Math.sin(t * 0.8) * 16, t);
    crow(C.W / 2 + Math.cos(t * 0.25 + 2) * 120, L.hudBottom + 100 + Math.cos(t * 0.6) * 14, t + 0.4);
    if (k >= 0.5) butterfly(C.W / 2 + Math.sin(t * 0.35) * 110, L.hudBottom + 150 + Math.sin(t * 0.9) * 24, t, "#e8a0b4");
  }
}

// ---------------------------------------------------------------------------
// Ombeline, la gardienne de la mare (personnage original du thème gothique).
// Tresses noires, robe noire, col blanc… et un sourire qui apparaît peu à peu.
// tier : 0 impassible, 1 coin de bouche, 2 petit sourire, 3 grand sourire.
// ---------------------------------------------------------------------------
const GIRL = { name: "Ombeline", x: 56 };
const GIRL_LINES = [
  ["Je ne souris jamais. Enfin… presque jamais.", "La mare est sinistre. J'adore.", "Ta grenouille a l'air lugubre. C'est un compliment."],
  ["Hm. Pas mal.", "J'ai failli sourire. Failli.", "Tu t'en occupes bien. Je dis ça, je dis rien."],
  ["D'accord, je souris. Un peu. Ne le dis à personne.", "Tu t'en occupes vraiment bien, {p}.", "Les roses rougissent. Moi aussi, un peu."],
  ["Je suis contente que tu sois là, {p}.", "Regarde, la mare a des couleurs ! C'est grâce à toi.", "Tu sais quoi, {p} ? Tu me fais sourire."],
];

// Sprites d'Ombeline (assets/ombeline, dessinés dans Figma) : tête = 200 px de large dans le fichier.
// cx = centre de la tête, top = haut des cheveux, feet = bas des bottines (en pixels du fichier).
const GIRL_META = {
  amour: [132.9, 0.2, 321], boudeur: [103.3, 0, 354], clin: [101.4, 0, 300], content: [101.3, 0.3, 318],
  dodo: [101.1, 0.3, 318], doree: [129, 17, 399], fatiguee: [107.3, 0.2, 309], jeu: [101.8, 0.3, 322],
  miam: [102.9, 0.3, 330], paisible: [102.7, 0, 328], reclame: [111.9, 0.3, 360], sourire_a: [100.8, 0.3, 318],
  sourire_b: [101.5, 0.3, 297], sourire_c: [102.9, 0, 350], sourire_d: [137.7, 6.1, 326], splash: [118.3, 0.3, 318],
};
const GIRL_SPRITES = Object.keys(GIRL_META);
const GIRL_HEAD = 200;

/** Robe recolorée (violette ou à rayures) : on teinte le masque de la robe (robe_*.png), une fois, en cache. */
const girlDressCache = {};
function girlImage(key, tenue) {
  const base = img[`ombeline_${key}`], mask = img[`ombeline_robe_${key}`];
  if (!base || !tenue || !mask) return base;
  const id = `${key}|${tenue}`;
  if (girlDressCache[id]) return girlDressCache[id];
  const c = document.createElement("canvas"), m = document.createElement("canvas");
  c.width = m.width = base.width; c.height = m.height = base.height;
  const g = c.getContext("2d"), gm = m.getContext("2d");
  gm.drawImage(mask, 0, 0);
  gm.globalCompositeOperation = "source-in";
  gm.fillStyle = tenue === "robe_violette" ? "#5a4486" : "#2b2a30";
  gm.fillRect(0, 0, m.width, m.height);
  if (tenue === "robe_rayee") {
    gm.globalCompositeOperation = "source-atop";
    gm.fillStyle = "#8a8496";
    for (let y = 0; y < m.height; y += 22) gm.fillRect(0, y, m.width, 9);
  }
  g.drawImage(base, 0, 0);
  g.drawImage(m, 0, 0);
  return (girlDressCache[id] = c);
}

/** Choix du dessin : humeur du moment, sinon sourire selon le palier (0 sérieuse → 3 rayonnante). */
function girlKey(tier, { worried, cheer, night, mood }) {
  if (mood && GIRL_META[mood]) return mood;
  if (cheer) return "jeu";
  if (night) return "dodo";
  if (worried === "sec") return "fatiguee";
  if (worried) return "reclame";
  if (game.pet?.isDoree) return "doree";
  return ["sourire_a", "sourire_b", "sourire_c", "sourire_d"][tier] || "paisible";
}

// Centre des yeux sur chaque dessin, par rapport au centre et au sommet de la tête : [gauche x, y, droite x, y].
// Plusieurs visages sont de trois quarts, « jeu » a la tête penchée : les lunettes suivent.
const GIRL_EYES = {
  amour: [-40, 110, 32, 110], boudeur: [-60, 128, 12, 128], clin: [-50, 120, 27, 120], content: [-45, 138, 42, 138],
  dodo: [-42, 136, 40, 136], doree: [-41, 133, 37, 133], fatiguee: [-60, 128, 15, 128], jeu: [-22, 118, 47, 97],
  miam: [-60, 125, 17, 125], paisible: [-60, 130, 25, 130], reclame: [-50, 123, 30, 123], sourire_a: [-52, 128, 35, 128],
  sourire_b: [-42, 126, 37, 126], sourire_c: [-41, 131, 40, 131], sourire_d: [-42, 122, 37, 122], splash: [-45, 118, 25, 118],
};

/** Fondu + petit rebond quand un personnage change de dessin (id : "fille", "grenouille"…). */
const swapFx = {};
function swapState(id, key, t, dur = 0.22) {
  const f = swapFx[id] || (swapFx[id] = { key, prev: null, t0: -9 });
  if (f.key !== key) { f.prev = f.key; f.key = key; f.t0 = t; }
  const p = Math.min(1, Math.max(0, (t - f.t0) / dur));
  return { prev: p < 1 ? f.prev : null, p, pop: 1 + Math.sin(p * Math.PI) * 0.07 };
}

function drawGirl(x, feet, tier, t, night, { worried = false, cheer = false, mood = null, outfit = progress.girl || {}, scale = 1.3 } = {}) {
  const main = scale > 1; // la vraie Ombeline de la mare (les vignettes de la boutique ne s'animent pas)
  if (weatherNow() === "rain" && owns("parapluie") && main) outfit = { ...outfit, main: "parapluie" };
  const key = girlKey(tier, { worried, cheer, night, mood });
  const fx = main ? swapState("fille", key, t) : { prev: null, p: 1, pop: 1 };
  const s = (58 * scale / 1.3) / GIRL_HEAD; // tête ≈ 58 px à l'écran
  const hop = key === "jeu" || tier >= 3 ? Math.max(0, Math.sin(t * 3)) * 2.5 : 0;
  const breathe = 1 + Math.sin(t * 2) * 0.012;
  const INK = C.COLORS.trait, black = "#1d1b22";
  // ombre au sol
  ctx.fillStyle = "rgba(29,27,34,0.2)";
  ctx.beginPath(); ctx.ellipse(x, feet + 1, 24 * scale / 1.3, 4.5 * scale / 1.3, 0, 0, TAU); ctx.fill();

  const pose = (k, alpha, pop) => {
    const sprite = girlImage(k, outfit.tenue);
    const [cx, top, bottom] = GIRL_META[k];
    const [elx, ely, erx, ery] = GIRL_EYES[k];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, feet - hop);
    ctx.scale(s * pop, s * breathe * pop);
    ctx.translate(-cx, -bottom);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    // coordonnées : pixels du fichier (tête de 200 px de large, centrée sur cx, sommet à top)
    const hx = cx, handY = bottom - (bottom - top) * 0.3;
    const handR = { x: cx + 76, y: handY }, handL = { x: cx - 76, y: handY };
    if (outfit.main === "parapluie") {
      ctx.strokeStyle = black; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(handR.x, handR.y); ctx.lineTo(handR.x - 20, top - 70); ctx.stroke();
      ctx.beginPath(); ctx.arc(handR.x + 9, handR.y, 9, 0, Math.PI); ctx.stroke();
      ctx.fillStyle = black;
      const ux = hx + 4, uy = top - 60, R = 150;
      ctx.beginPath(); ctx.moveTo(ux - R, uy); ctx.quadraticCurveTo(ux, uy - 120, ux + R, uy);
      for (let i = 0; i < 4; i++) { const x0 = ux + R - i * (R / 2); ctx.quadraticCurveTo(x0 - R / 4, uy - 22, x0 - R / 2, uy); }
      ctx.fill();
      ctx.strokeStyle = "#4a4652"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(ux, uy - 70); ctx.lineTo(ux - 60, uy - 6); ctx.moveTo(ux, uy - 70); ctx.lineTo(ux + 60, uy - 6); ctx.stroke();
    }
    if (sprite) ctx.drawImage(sprite, 0, 0);
    // --- garde-robe achetée à la boutique ---
    if (outfit.yeux === "lunettes") {
      const lx = hx + elx, ly = top + ely, rx = hx + erx, ry = top + ery;
      const ang = Math.atan2(ry - ly, rx - lx), gap = Math.hypot(rx - lx, ry - ly);
      const R = Math.min(27, gap / 2 - 5); // deux verres ronds qui entourent bien les yeux, sans se toucher
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(ang);
      ctx.strokeStyle = black; ctx.lineWidth = 6.5;
      for (const c of [0, gap]) {
        ctx.beginPath(); ctx.arc(c, 0, R, 0, TAU);
        ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(R, -3); ctx.quadraticCurveTo(gap / 2, -12, gap - R, -3); ctx.stroke(); // pont
      ctx.beginPath(); ctx.moveTo(-R, -4); ctx.lineTo(-R - 12, -9); ctx.moveTo(gap + R, -4); ctx.lineTo(gap + R + 12, -9); ctx.stroke(); // branches
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 4; // reflet
      for (const c of [0, gap]) { ctx.beginPath(); ctx.arc(c, 0, R - 8, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke(); }
      ctx.restore();
    }
    if (outfit.tete === "noeuds_rouges") {
      for (const side of [-1, 1]) {
        const bx = hx + side * 74, by = top + 46;
        ctx.fillStyle = "#b3263f"; ctx.strokeStyle = INK; ctx.lineWidth = 5.5;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 24, by - 16); ctx.lineTo(bx - 24, by + 16); ctx.closePath();
        ctx.moveTo(bx, by); ctx.lineTo(bx + 24, by - 16); ctx.lineTo(bx + 24, by + 16); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(bx, by, 7, 0, TAU); ctx.fillStyle = "#8a1c30"; ctx.fill(); ctx.stroke();
      }
    } else if (outfit.tete === "beret") {
      ctx.save(); ctx.translate(hx - 14, top + 16); ctx.rotate(-0.2);
      ctx.beginPath(); ctx.ellipse(0, 0, 84, 30, 0, 0, TAU); ctx.fillStyle = "#7a2e3e"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 6.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-18, -9, 40, 9, -0.1, Math.PI, TAU); ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 6; ctx.stroke(); // reflet
      ctx.beginPath(); ctx.moveTo(4, -29); ctx.lineTo(11, -46); ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.stroke();
      ctx.restore();
    } else if (outfit.tete === "cloche") {
      ctx.fillStyle = black; ctx.strokeStyle = INK; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(hx, top + 34, 124, 24, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - 86, top + 34); ctx.bezierCurveTo(hx - 92, top - 70, hx + 92, top - 70, hx + 86, top + 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#6c5a9c"; ctx.fillRect(hx - 86, top + 8, 172, 18);
      ctx.beginPath(); ctx.arc(hx + 56, top + 16, 12, 0, TAU); ctx.fillStyle = "#b3263f"; ctx.fill();
    }
    if (outfit.main === "bouquet") {
      const { x: bx, y: by } = handR;
      ctx.strokeStyle = "#3f5a36"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(bx - 6, by + 34); ctx.lineTo(bx - 12, by - 22); ctx.moveTo(bx - 6, by + 34); ctx.lineTo(bx + 12, by - 22); ctx.moveTo(bx - 6, by + 34); ctx.lineTo(bx, by - 30); ctx.stroke();
      for (const [dx, dy] of [[-16, -28], [16, -28], [0, -44]]) {
        circle(bx + dx, by + dy, 16, "#8c2a45", INK, 5.5);
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(bx + dx, by + dy, 9, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
      }
      circle(bx - 6, by + 8, 7, "#6c5a9c", INK, 4.5); // ruban
    } else if (outfit.main === "peluche") {
      const bx = handL.x, by = handL.y;
      ctx.fillStyle = "#3a3444"; ctx.strokeStyle = INK; ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 30, by - 36, bx - 56, by - 10); ctx.quadraticCurveTo(bx - 36, by + 6, bx - 20, by + 20);
      ctx.quadraticCurveTo(bx, by + 10, bx + 20, by + 20); ctx.quadraticCurveTo(bx + 36, by + 6, bx + 56, by - 10); ctx.quadraticCurveTo(bx + 30, by - 36, bx, by); ctx.fill(); ctx.stroke();
      circle(bx, by - 4, 21, "#3a3444", INK, 5.5);
      ctx.fillStyle = "#f4f0ea"; ctx.beginPath(); ctx.arc(bx - 8, by - 9, 4.5, 0, TAU); ctx.arc(bx + 8, by - 9, 4.5, 0, TAU); ctx.fill();
    }
    // bougie la nuit (si la main est libre)
    if (night && !outfit.main && k !== "dodo") {
      const lx = handR.x + 16, ly = handR.y + 10;
      const gl = ctx.createRadialGradient(lx, ly - 40, 0, lx, ly - 40, 110);
      gl.addColorStop(0, "rgba(255,207,122,0.5)"); gl.addColorStop(1, "rgba(255,207,122,0)");
      ctx.fillStyle = gl; ctx.fillRect(lx - 110, ly - 150, 220, 220);
      ctx.fillStyle = "#efe9da"; ctx.strokeStyle = INK; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.roundRect(lx - 12, ly - 30, 24, 50, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffcf7a"; ctx.beginPath(); ctx.ellipse(lx, ly - 46 + Math.sin(t * 9) * 2, 9, 16, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };
  if (fx.prev) pose(fx.prev, 1 - fx.p, 1);
  pose(key, fx.prev ? fx.p : 1, fx.pop);
}

// ---------------------------------------------------------------------------
// Saisons et météo. La météo change toutes les 3 heures (tirage stable par créneau).
// Démo : ?meteo=pluie|neige|clair et ?mois=10 pour forcer.
// ---------------------------------------------------------------------------
const Q = new URLSearchParams(location.search);
const month = () => (Q.get("mois") ? Number(Q.get("mois")) : new Date().getMonth() + 1);
function seasonNow() {
  const m = month();
  return m === 12 || m <= 2 ? "hiver" : m <= 5 ? "printemps" : m <= 8 ? "ete" : "automne";
}
function weatherNow() {
  const forced = Q.get("meteo");
  if (forced) return forced === "neige" ? "snow" : forced === "pluie" ? "rain" : "clear";
  const d = new Date();
  const key = `${d.toLocaleDateString("fr-CA")}-${Math.floor(d.getHours() / 3)}`;
  let h = 2166136261; for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const r = ((h >>> 0) % 1000) / 1000;
  const season = seasonNow();
  if (season === "hiver" && r < 0.25) return "snow";
  const rain = { automne: 0.33, hiver: 0.45, printemps: 0.3, ete: 0.12 }[season];
  return r < rain ? "rain" : "clear";
}

const WX = { drops: [], flakes: [], leaves: [] };
function wxInit() {
  if (WX.drops.length) return;
  for (let i = 0; i < 70; i++) WX.drops.push({ x: Math.random() * C.W, y: Math.random() * 800, v: 380 + Math.random() * 160 });
  for (let i = 0; i < 55; i++) WX.flakes.push({ x: Math.random() * C.W, y: Math.random() * 800, v: 25 + Math.random() * 30, r: 1.2 + Math.random() * 2.2, p: Math.random() * TAU });
  for (let i = 0; i < 9; i++) WX.leaves.push({ x: Math.random() * C.W, y: Math.random() * 800, v: 22 + Math.random() * 18, p: Math.random() * TAU, c: i % 3 });
}

/** Sol : neige sur la prairie, feuilles mortes, citrouilles d'octobre, voile gris de pluie. */
function drawWeatherGround(night, t) {
  const w = weatherNow(), season = seasonNow(), m = meadowBand();
  if (w === "rain") { ctx.fillStyle = night ? "rgba(20,20,40,0.18)" : "rgba(80,90,120,0.16)"; ctx.fillRect(0, 0, C.W, view.H); }
  if (w === "snow") {
    ctx.fillStyle = night ? "rgba(200,205,230,0.55)" : "rgba(252,252,255,0.8)";
    ctx.beginPath(); ctx.moveTo(0, view.H);
    for (let x = 0; x <= C.W; x += 10) ctx.lineTo(x, m.top - 4 + Math.sin(x * 0.12) * 3);
    ctx.lineTo(C.W, view.H); ctx.closePath(); ctx.fill();
  }
  if (season === "automne") {
    const cols = ["#e0893a", "#c9553a", "#e6b44a"];
    [[0.12, 0.35], [0.36, 0.7], [0.5, 0.25], [0.7, 0.8], [0.88, 0.45], [0.26, 0.9]].forEach(([u, v], i) => {
      const [x, y] = m.at(u, v);
      ctx.save(); ctx.translate(x, y); ctx.rotate(i * 1.3);
      ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.4, 0, 0, TAU); ctx.fill();
      ctx.restore();
    });
  }
  if (month() === 10) { // citrouilles d'octobre (Halloween approche)
    drawDecor("citrouille", ...m.at(0.08, 0.55), t, night, 0.8);
    drawDecor("citrouille", ...m.at(0.56, 0.3), t, night, 0.65);
  }
}

/** Air : pluie, flocons, feuilles qui tombent, pétales de printemps. */
function drawWeatherAir(t, night, dt = 1 / 60) {
  wxInit();
  const w = weatherNow(), season = seasonNow(), H = view.H;
  if (w === "rain") {
    ctx.strokeStyle = night ? "rgba(190,200,240,0.45)" : "rgba(90,110,150,0.45)"; ctx.lineWidth = 1.4; ctx.lineCap = "round";
    ctx.beginPath();
    for (const d of WX.drops) {
      d.y += d.v * dt; d.x -= d.v * 0.15 * dt;
      if (d.y > H) { d.y = -20; d.x = Math.random() * (C.W + 40); }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 2.5, d.y - 11);
    }
    ctx.stroke();
  }
  if (w === "snow") {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (const f of WX.flakes) {
      f.y += f.v * dt; f.x += Math.sin(t * 1.2 + f.p) * 12 * dt;
      if (f.y > H) { f.y = -8; f.x = Math.random() * C.W; }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill();
    }
  }
  if (season === "automne" || season === "printemps") {
    const cols = season === "automne" ? ["#e0893a", "#c9553a", "#e6b44a"] : ["#ffc2d4", "#fbd8e2", "#ffffff"];
    for (const l of WX.leaves) {
      l.y += l.v * dt; l.x += Math.sin(t * 1.5 + l.p) * 20 * dt;
      if (l.y > H) { l.y = -10; l.x = Math.random() * C.W; }
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(Math.sin(t * 2 + l.p) * 1.2);
      ctx.fillStyle = cols[l.c]; ctx.beginPath(); ctx.ellipse(0, 0, season === "automne" ? 4.5 : 3.2, 2.2, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------------------
// Écran principal : la mare (œuf, perso, besoins, soins)
// ---------------------------------------------------------------------------
const TUTO = ["calin", "miam", "baignade", "dodo", "jeu"];

class PondScene {
  constructor(game) {
    this.game = game;
    this.particles = new Particles();
    this.t = 0;
    this.actionMood = null; this.actionTimer = 0;
    this.bounce = 0; this.shake = 0; this.celebrate = 0;
    this.pressed = null; this.pressTimer = 0;
    this.petTapCooldown = 0;
    this.eggWobble = 0;
    this.gearOpen = false;
    this.toast = null;
    this.visitor = null; // amoureux de passage
    this.visitorDelay = 6;
    this.dialog = null; // fenêtre « nouvelle génération »
    this.picker = false; // choix du mini-jeu
    this.girlMoodT = 0; this.girlMood = null;
    this.girlJoy = 0; // Ombeline sourit un peu plus pendant un instant après un soin
    this.girlTalk = 0;
    this.lastAmbient = ambientMood(game.pet);
  }

  get pet() { return this.game.pet; }
  get tutoStep() {
    const pet = this.pet;
    return !pet.isEgg && !pet.tutoDone && !pet.asleep && !pet.nounou && !this.naming && !this.banner
      ? TUTO[pet.tutoIndex ?? 0] : null;
  }

  say(str, seconds = 2.2) { this.toast = { str, t: seconds }; }

  // ------------------------------------------------------------ entrées
  tap(x, y) {
    if (this.banner && this.banner.t < this.banner.max - 0.8) { this.banner = null; return; }
    if (this.gearOpen) {
      const p = this.gearPanel();
      const row = x >= p.x && x <= p.x + p.w ? Math.floor((y - p.y - 4) / 38) : -1;
      const action = this.gearRows()[row]?.id;
      if (action === "son") { audio.setMuted(!audio.muted); audio.play("clic"); }
      else if (action === "musique") { audio.setMusicOn(!audio.musicOn); audio.play("clic"); }
      else if (action === "guide") { audio.play("clic"); this.game.pet.save(); location.href = "guide.html"; }
      else if (action === "theme") { this.game.pet.save(); setTheme(NEXT_THEME[THEME.name]); }
      else if (action === "ecole") {
        const mode = cycleSchoolMode();
        this.game.pet.lastTick = Date.now();
        audio.play("clic");
        this.say(mode === "off" ? "Mode école coupé (vacances !)."
          : mode === "nl" ? "École néerlandophone : congés flamands automatiques."
            : "École francophone : congés de la Fédération Wallonie-Bruxelles automatiques.", 3.5);
      } else if (action === "code") { audio.play("clic"); askSecretCode(this); }
      else if (action === "rappels") { audio.play("clic"); toggleReminders(this); }
      this.gearOpen = false;
      return;
    }
    if (this.dialog) { this.tapDialog(x, y); return; }
    if (this.picker) { this.tapPicker(x, y); return; }
    if (Math.hypot(x - L.gear.x, y - L.gear.y) <= L.gear.r + 6) { this.gearOpen = true; audio.play("clic"); return; }
    const cp = L.coins;
    if (x >= cp.x - 4 && x <= cp.x + cp.w + 4 && y >= cp.y - 6 && y <= cp.y + cp.h + 8) {
      audio.play("clic");
      try { localStorage.setItem("froggotchi-boutique-vue", "1"); } catch {}
      this.game.setScene(new BookScene(this.game, "boutique"));
      return;
    }
    if (Math.hypot(x - L.family.x, y - L.family.y) <= L.family.r + 6) {
      audio.play("clic");
      this.game.setScene(new BookScene(this.game));
      return;
    }

    if (this.pet.isEgg) {
      if (GOTH && Math.abs(x - GIRL.x) < 36 && y > this.girlFeet() - 125 && y < this.girlFeet()) { this.tapGirl(); return; }
      const b = charBox("oeuf");
      if (x >= b.x - 20 && x <= b.x + b.w + 20 && y >= b.y - 20 && y <= b.y + b.h + 10) this.tapEgg();
      return;
    }

    for (const b of L.buttons) {
      if (Math.hypot(x - b.cx, y - b.cy) <= b.r + 4) {
        const step = this.tutoStep;
        if (step && b.name !== step) { this.say(T("tutoWrong")); return; }
        this.pressed = b.name; this.pressTimer = 0.15;
        this.press(b.name);
        if (step) this.advanceTuto();
        return;
      }
    }
    if (GOTH && Math.abs(x - GIRL.x) < 36 && y > this.girlFeet() - 125 && y < this.girlFeet()) { this.tapGirl(); return; }
    const br = this.bubbleRect;
    if (this.pet.atSchool && br && x >= br.x && x <= br.x + br.w && y >= br.y && y <= br.y + br.h) { this.askDayOff(); return; }
    if (this.letter) {
      const [bx, by] = this.bottlePos();
      if (Math.hypot(x - bx, y - by) < 30) { this.openLetter(); return; }
    }
    if (this.visitor?.arrived && Math.hypot(x - this.visitor.x, y - (L.charBottom - 30)) < 45) { this.acceptVisitor(); return; }
    if (this.pet.familyEgg) {
      const e = this.familyEggPos();
      if (Math.hypot(x - e.x, y - e.y) < 34) { this.openDialog(); return; }
    }
    for (let i = 0; i < 0; i++) {
      const p = this.poopPos(i);
      if (Math.hypot(x - p.x, y - (p.y - 8)) < 22) { this.cleanPoop(i); return; }
    }
    const box = charBox(this.pet.stage, this.spriteKey());
    if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) this.tapPet(x, y);
  }

  // ------------------------------------------------------------ lettres de papa
  bottlePos() { return [C.W - 62, L.pond.cy + 20]; }

  checkLetter() {
    this.letter = LETTERS.length && !this.pet.isEgg ? letterOfTheDay() : null; // la bouteille attend l'éclosion
    if (this.letter && !this.letterHinted) {
      this.letterHinted = true;
      this.say("Oh ! Une bouteille flotte sur la mare… Touche-la !", 4.5);
    }
  }

  openLetter() {
    const letter = this.letter;
    audio.play("calin");
    askName({
      title: "Une lettre de papa",
      text: letter.texte,
      note: "— Papa",
      input: false,
      ok: "Merci papa",
    }).then(() => {
      readLetter(letter);
      record("lettre");
      this.letter = null;
      this.girlJoy = 2;
      this.setGirlMood("content", 3);
      this.say("Tu peux répondre à papa dans le grimoire (onglet Lettres).", 4);
      this.particles.burst(C.W / 2, L.charBottom - 60, null, { count: 14, speed: 80, life: 1.6, radius: 5, gravity: -15, shape: "heart" });
    });
  }

  // ------------------------------------------------------------ récompenses
  notify(str, coins = 0) {
    (this.notices ??= []).push({ str, coins, t: 2.6 });
  }

  updateNotices(dt) {
    const n = this.notices?.[0];
    if (!n) return;
    if (!n.started) {
      n.started = true;
      if (n.coins) { audio.playNote(988, 0.08); setTimeout(() => audio.playNote(1319, 0.14), 90); }
    }
    if ((n.t -= dt) <= 0) this.notices.shift();
  }

  drawNotice() {
    const n = this.notices?.[0];
    if (!n || !n.started) return;
    const k = Math.min(1, (2.6 - n.t) / 0.25), out = Math.min(1, n.t / 0.3);
    const y = L.hudBottom - 6 + (1 - k) * -20;
    ctx.globalAlpha = Math.min(k, out);
    let fs = 13;
    ctx.font = `700 ${fs}px ${FONT}`;
    while (fs > 10 && ctx.measureText(n.str).width + (n.coins ? 70 : 28) > C.W - 24) { fs--; ctx.font = `700 ${fs}px ${FONT}`; }
    const w = Math.min(C.W - 24, ctx.measureText(n.str).width + (n.coins ? 70 : 28));
    rr(C.W / 2 - w / 2, y + 3, w, 30, "rgba(58,74,48,0.18)", null);
    rr(C.W / 2 - w / 2, y, w, 30, "#f3e3a0", C.COLORS.trait, 2.5);
    text(n.str, C.W / 2 - (n.coins ? 20 : 0), y + 15, fs, C.COLORS.trait, "center", 700);
    if (n.coins) { coinIcon(C.W / 2 + w / 2 - 44, y + 15, 7); text(`+${n.coins}`, C.W / 2 + w / 2 - 34, y + 15, 12, C.COLORS.trait, "left", 700); }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ Ombeline
  /** Ombeline change d'expression un instant (amour, miam, splash, clin…). */
  setGirlMood(mood, secs = 2) { if (mood) { this.girlMood = mood; this.girlMoodT = secs; } }

  girlFeet() { return decorOn() ? L.charBottom + 47 : L.pond.cy + 50; } // debout sur la berge, au-dessus des messages

  girlTier() {
    const base = Math.min(3, Math.floor(this.pet.sourire / 25));
    return Math.min(3, base + (this.girlJoy > 0 ? 1 : 0));
  }

  /** « Pas d'école aujourd'hui ? » : arrête la pause école pour la journée. */
  async askDayOff() {
    audio.play("clic");
    const r = await askName({
      title: "Pas d'école aujourd'hui ?",
      text: "Congé, jour férié ou petite grippe : la mare reprend vie normalement jusqu'à ce soir. Le mode école revient tout seul demain.",
      input: false, ok: "Pas d'école aujourd'hui", cancel: "Annuler",
    });
    if (r === null) return;
    setDayOff();
    this.pet.lastTick = Date.now();
    this.say(`Chouette, une journée entière avec ${this.pet.name} !`, 3.5);
  }

  tapGirl() {
    if (this.pet.atSchool && !this.toast) { this.askDayOff(); return; }
    const tier = Math.min(3, Math.floor(this.pet.sourire / 25));
    const lines = GIRL_LINES[tier];
    this.say(`${GIRL.name} : « ${lines[Math.floor(Math.random() * lines.length)].replace("{p}", player.name)} »`, 3.4);
    this.girlJoy = 1.2;
    this.setGirlMood(tier >= 2 && Math.random() < 0.35 ? "clin" : "content", 2.4);
    audio.playNote(tier >= 2 ? 659 : 330, 0.18);
    record("ombeline");
  }

  // ------------------------------------------------------------ famille
  acceptVisitor() {
    const v = this.visitor;
    this.pet.meet(v);
    record("coup_de_coeur");
    this.pet.save();
    this.visitor = null;
    audio.play("niveau");
    vibrate([40, 30, 40]);
    this.setMood("amour", 2.5);
    this.celebrate = 1.5;
    this.particles.burst(C.W / 2, L.charBottom - 60, null, { count: 12, speed: 70, life: 1.3, radius: 5, gravity: -15, shape: "heart" });
    this.say(T("love", { a: this.pet.name, b: v.name }), 3.5);
  }

  familyEggPos() { return { x: C.W - 36, y: L.charBottom - 8 }; }

  openDialog() {
    audio.play("clic");
    this.dialog = { t: 0 };
  }

  dialogButtons() {
    const y = view.H * 0.42;
    return { yes: { x: 40, y: y + 52, w: 116, h: 40 }, no: { x: 164, y: y + 52, w: 116, h: 40 }, top: y - 92 };
  }

  tapDialog(x, y) {
    const b = this.dialogButtons();
    const inside = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (inside(b.yes)) {
      this.dialog = null;
      audio.play("calin");
      this.game.setScene(new DepartureScene(this.game));
    } else if (inside(b.no)) {
      audio.play("clic");
      this.dialog = null;
    }
  }

  drawDialog() {
    const pet = this.pet;
    const b = this.dialogButtons();
    ctx.fillStyle = "rgba(46,38,80,0.45)";
    ctx.fillRect(0, 0, C.W, view.H);
    rr(20, b.top, C.W - 40, 200, C.COLORS.blanc, C.COLORS.trait, 2, 24);
    const k = "grenouille_amour";
    const s = img[k];
    if (s) {
      const h = 54, w = (s.width * h) / s.height;
      drawSprite(k, C.W / 2 - w - 6, b.top + 16, w, h, pet.hue);
      drawSprite(k, C.W / 2 + 6, b.top + 16, w, h, pet.partner.hue);
    }
    text(T("genTitle"), C.W / 2, b.top + 92, 18, C.COLORS.trait, "center", 700);
    text(T("genText1", { a: pet.name, b: pet.partner.name }), C.W / 2, b.top + 116, 13);
    text(T("genText2"), C.W / 2, b.top + 134, 13);
    rr(b.yes.x, b.yes.y, b.yes.w, b.yes.h, C.COLORS.vert, C.COLORS.trait, 2);
    text("Oui !", b.yes.x + b.yes.w / 2, b.yes.y + b.yes.h / 2 + 1, 15, C.COLORS.trait, "center", 700);
    rr(b.no.x, b.no.y, b.no.w, b.no.h, "#fff", C.COLORS.trait, 2);
    text("Plus tard", b.no.x + b.no.w / 2, b.no.y + b.no.h / 2 + 1, 15, C.COLORS.trait, "center", 600);
  }

  updateVisitor(dt) {
    const pet = this.pet;
    if (!this.visitor) {
      if (!pet.canMeet) return;
      if ((this.visitorDelay -= dt) > 0) return;
      this.visitor = { name: randomName([pet.name, ...pet.family.map((f) => f.name)]), hue: randomHue(),
        x: C.W + 50, arrived: false, leaving: false };
      audio.play("calin");
      return;
    }
    const v = this.visitor;
    if (!pet.canMeet) v.leaving = true;
    const target = v.leaving ? C.W + 60 : C.W - 44;
    v.x += Math.sign(target - v.x) * Math.min(Math.abs(target - v.x), 70 * dt);
    v.arrived = !v.leaving && Math.abs(v.x - target) < 1;
    if (v.leaving && v.x >= C.W + 59) { this.visitor = null; this.visitorDelay = 30; }
  }

  drawCouple(night) {
    const pet = this.pet;
    const hop = (t) => Math.abs(Math.sin(t)) * 6;
    if (pet.partner && !pet.isEgg) {
      const k = spriteName("grenouille", pet.asleep ? "dodo" : "paisible");
      const s = img[k];
      if (s) {
        const h = 70, w = (s.width * h) / s.height, x = 48;
        lilyPad(x, L.charBottom + 6, 40, night);
        drawSprite(k, x - w / 2, L.charBottom - h + 8 - (pet.asleep ? 0 : hop(this.t * 1.3) * 0.4), w, h, pet.partner.hue,
          night && pet.asleep ? "brightness(0.85)" : "");
        if (!pet.asleep) {
          ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.t * 2);
          drawIcon(ctx, "calin", x + 26, L.charBottom - h - 2, 14);
          ctx.globalAlpha = 1;
        }
      }
    }
    if (pet.familyEgg) {
      const e = this.familyEggPos();
      const wob = Math.sin(this.t * 3) * 0.08;
      lilyPad(e.x, e.y + 14, 26, night);
      ctx.save(); ctx.translate(e.x, e.y + 12); ctx.rotate(wob);
      ctx.beginPath(); ctx.ellipse(0, -16, 14, 18, 0, 0, TAU);
      ctx.fillStyle = EGG_SHELL; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
      ctx.fillStyle = EGG_SPOTS;
      ctx.beginPath(); ctx.arc(-4, -22, 4, 0, TAU); ctx.arc(5, -12, 3, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(this.t * 4));
      ctx.fillStyle = "#ffd84a"; sparkle(e.x + 18, e.y - 22, 5);
      ctx.globalAlpha = 1;
    }
    const v = this.visitor;
    if (v) {
      const k = spriteName("grenouille", "clin");
      const s = img[k];
      if (s) {
        const h = 64, w = (s.width * h) / s.height;
        const y = L.charBottom - h + 6 - (v.arrived ? hop(this.t * 3) : hop(this.t * 8) * 1.5);
        drawSprite(k, v.x - w / 2, y, w, h, v.hue);
        if (v.arrived) {
          circle(v.x - 4, y - 16, 16, "#fff", C.COLORS.trait, 2);
          drawIcon(ctx, "calin", v.x - 4, y - 16, 18 * (1 + 0.1 * Math.sin(this.t * 6)));
        }
      }
    }
  }

  advanceTuto() {
    this.pet.tutoIndex = (this.pet.tutoIndex ?? 0) + 1;
    if (this.pet.tutoIndex >= TUTO.length) this.pet.tutoDone = true;
    this.pet.save();
  }

  tapEgg() {
    this.pet.tapEgg();
    this.eggWobble = 0.5;
    audio.play("clic");
    vibrate(10);
  }

  tapPet(x, y) {
    if (this.petTapCooldown > 0) return;
    this.petTapCooldown = C.PET_TAP_COOLDOWN;
    if (this.pet.asleep) { this.say(T("asleep")); return; }
    if (this.pet.nounou) return;
    this.pet.add("amour", C.PET_TAP_AMOUR);
    this.pet.smile(0.05);
    record("caresse");
    this.bounce = 0.35;
    this.setMood(["grenouille", "adulte"].includes(this.pet.stage) ? "clin" : "content", 0.8);
    this.particles.burst(x, y - 10, null, { count: 3, speed: 35, life: 0.9, radius: 5, gravity: -20, shape: "heart" });
    audio.play("clic");
  }

  cleanPoop(i) {
    const p = this.poopPos(i);
    this.pet.cleanPoop(i);
    record("caca");
    audio.play("baignade");
    this.particles.burst(p.x, p.y - 8, null, { count: 8, speed: 40, life: 0.7, radius: 3, gravity: -30, shape: "bubble" });
    this.pet.save();
  }

  setMood(mood, seconds = C.ACTION_MOOD_DURATION) { this.actionMood = mood; this.actionTimer = seconds; }

  refuse(message) {
    this.shake = 0.5;
    this.setMood("boudeur", 0.9);
    this.say(message);
    audio.play("reclame");
  }

  press(name) {
    const pet = this.pet;
    if (name === "nounou") {
      pet.nounou = !pet.nounou;
      audio.play(pet.nounou ? "dodo" : "clic");
      this.say(pet.nounou ? T("nounouOn") : T("nounouOff"));
      pet.save();
      return;
    }
    if (pet.nounou) {
      // Toucher un soin réveille le mode Nounou, en le montrant clairement.
      pet.nounou = false;
      pet.lastTick = Date.now();
      this.bounce = 0.35;
      this.particles.burst(C.W / 2, L.charBottom - 60, "#fff7b0", { count: 10, speed: 60, life: 0.8, radius: 3, shape: "star" });
      this.say(T("nounouWake"));
    }
    const box = charBox(pet.stage, this.spriteKey());

    if (name === "dodo") {
      const r = pet.toggleNap();
      if (r === "dort") this.say(T("nightAlready"));
      else if (r === "refus") this.refuse(T("noNap"));
      else if (r === "reveil") { this.say(T("wake")); audio.play("clic"); this.bounce = 0.35; }
      else { this.say(T("nap")); audio.play("dodo"); record("sieste"); }
      pet.save();
      return;
    }
    if (name === "jeu") {
      if (pet.asleep) { this.say(T("asleep")); return; }
      if (pet.stats.energie < C.ENERGIE_JEU_MIN) { this.refuse(T("tired")); return; }
      audio.play("jeu");
      this.picker = true;
      return;
    }

    const poopsBefore = pet.poops.length;
    const r = pet.care(name);
    if (r === "dort") { this.say(T("asleep")); return; }
    if (r === "refus") {
      this.refuse(name === "miam" ? T("full") : T("clean"));
      return;
    }
    this.girlJoy = 1.6;
    this.setGirlMood({ calin: "amour", miam: "miam", baignade: "splash" }[name], 2.2);
    record({ calin: "calin", miam: "miam", baignade: "bain" }[name]);
    if (name === "baignade" && poopsBefore) record("caca", poopsBefore);
    const mood = { calin: "amour", miam: "miam", baignade: "splash" }[name];
    this.setMood(mood);
    this.bounce = 0.35;
    audio.play(name);
    if (name === "calin") this.particles.burst(box.cx, box.cy, null, { count: 6, speed: 55, life: 1, radius: 5, gravity: -10, shape: "heart" });
    if (name === "miam") this.particles.burst(box.cx, box.cy + 10, "#c98a3c", { count: 10, speed: 50, life: 0.6, radius: 2.5 });
    if (name === "baignade") this.particles.burst(box.cx, box.cy, null, { count: 16, speed: 70, life: 1, radius: 4, gravity: -20, shape: "bubble" });
    pet.save();
  }

  // ------------------------------------------------------------ logique
  spriteKey() {
    const pet = this.pet;
    if (pet.isEgg) return null;
    let mood = this.actionMood;
    if (!mood && this.celebrate > 0) mood = "content";
    if (!mood && pet.nounou) mood = "paisible";
    return spriteName(pet.stage, mood || ambientMood(pet));
  }

  update(dt) {
    const pet = this.pet;
    this.t += dt;
    if (this.actionMood && (this.actionTimer -= dt) <= 0) this.actionMood = null;
    for (const k of ["celebrate", "bounce", "shake", "pressTimer", "petTapCooldown", "eggWobble", "girlJoy", "girlMoodT"]) {
      this[k] = Math.max(0, this[k] - dt);
    }
    if (this.toast && (this.toast.t -= dt) <= 0) this.toast = null;
    this.particles.update(dt);

    this.flash = Math.max(0, (this.flash || 0) - dt * 1.6);
    if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;

    if (pet.isEgg && pet.eggProgress >= 1) {
      pet.hatch();
      record("eclosion");
      audio.play("niveau");
      vibrate([60, 40, 120]);
      this.flash = 1;
      const b = charBox("oeuf");
      // Éclats de coquille + étoiles
      this.particles.burst(b.cx, b.cy - 10, EGG_SHELL, { count: 16, speed: 120, life: 1, radius: 6, gravity: 160 });
      this.particles.burst(b.cx, b.cy, "#fff7b0", { count: 20, speed: 90, life: 1.3, radius: 3, shape: "star" });
    }

    // Évolution (peut arriver pendant que l'app était fermée) : on la fête à l'écran.
    if (!pet.isEgg && pet.seenStage !== pet.stage) {
      const firstTime = pet.seenStage === null;
      pet.seenStage = pet.stage;
      pet.save();
      this.celebrate = 2;
      if (!firstTime) {
        record(`stade_${pet.stage}`);
        audio.play("niveau");
        vibrate([60, 40, 60, 40, 120]);
        this.flash = 0.8;
        this.banner = { title: T("grew"), sub: T("grewSub", { s: pet.stageInfo.label.toLowerCase() }), t: 4, max: 4 };
      } else if (!pet.named) {
        this.naming = true;
        const suggestion = pet.name;
        setTimeout(() => {
          askName({
            title: T("hatchTitle"),
            text: T("hatchText"),
            value: suggestion,
            reroll: () => randomName([pet.name, ...pet.family.map((f) => f.name)]),
          }).then((name) => {
            pet.name = name;
            pet.named = true;
            pet.save();
            this.naming = false;
            this.bounce = 0.35;
            this.banner = { title: T("welcomeFrog", { n: name }), sub: pet.generation > 1 ? `Génération ${pet.generation}` : T("welcomeFrogSub"), t: 3.5, max: 3.5 };
            this.particles.burst(C.W / 2, L.charBottom - 50, null, { count: 10, speed: 70, life: 1.2, radius: 5, gravity: -15, shape: "heart" });
          });
        }, 1400);
      }
      const b = charBox(pet.stage, this.spriteKey());
      this.particles.burst(b.cx, b.cy, "#fff7b0", { count: 26, speed: 110, life: 1.2, radius: 3, shape: "star" });
    }

    this.lastDt = dt;
    const wx = weatherNow();
    if (wx !== this.lastWx) {
      if (this.lastWx !== undefined && !pet.isEgg && !this.toast) {
        if (wx === "rain") this.say(`Il pleut ! ${pet.name} adore ça.`, 3.5);
        if (wx === "snow") this.say("Il neige sur la mare !", 3.5);
      }
      this.lastWx = wx;
    }
    this.updateVisitor(dt);
    if (!this.shopHintDone && !shopSeen() && !pet.isEgg && !this.banner && !this.toast && !this.naming
        && SHOP.some((i) => !owns(i.id) && progress.coins >= i.price)) {
      this.shopHintDone = true;
      this.say(GOTH ? "Ombeline : « Tu as assez de pièces pour ma boutique. Touche tes pièces, en haut. »"
        : "Tu as assez de pièces pour la boutique ! Touche tes pièces, en haut.", 5);
    }
    if (pet.isDoree && !progress.done.includes("doree")) record("doree");
    this.updateNotices(dt);

    // La grenouille sourit un peu plus à chaque palier : on le fête (thème gothique).
    if (GOTH && !pet.isEgg && !pet.asleep && !this.banner && !this.naming) {
      const m = SMILE_MOMENTS.find((x) => pet.sourire >= x.at && (pet.smileSeen ?? 0) < x.at);
      if (m) {
        pet.smileSeen = m.at;
        record("sourire", m.at);
        pet.save();
        layers.key = null; // la mare reprend des couleurs : on redessine le décor
        const fill = (str) => str.replace("{n}", pet.name).replace("{p}", player.name);
        this.banner = { title: fill(m.title), sub: fill(m.sub), t: 4.5, max: 4.5 };
        this.setMood(["grenouille", "adulte"].includes(pet.stage) ? "clin" : "content", 3);
        this.flash = 0.5;
        audio.play("niveau");
        confetti(this.particles);
      }
    }

    const ambient = ambientMood(pet);
    if (ambient === "reclame" && this.lastAmbient !== "reclame") {
      audio.play("reclame");
      vibrate([80, 60, 80]);
    }
    this.lastAmbient = ambient;
  }

  // ------------------------------------------------------------ rendu
  draw() {
    const pet = this.pet;
    const night = pet.isNight();
    drawSky(this.t, night);
    drawPond(night);
    drawWeatherGround(night, this.t);
    if (pet.isEgg) {
      this.drawEgg();
      if (GOTH) drawGirl(GIRL.x, this.girlFeet(), this.girlTier(), this.t, night);
    }
    else {
      this.drawDecorItems(night);
      if (this.letter) bottle(...this.bottlePos(), this.t);
      this.drawCouple(night);
      this.drawCharacter(night);
      if (GOTH) {
        drawGirl(GIRL.x, this.girlFeet(), this.girlTier(), this.t, night,
          { worried: { reclame: true, sec: "sec" }[ambientMood(this.pet)] || false, cheer: this.girlJoy > 0.7 && !(this.girlMoodT > 0), mood: this.girlMoodT > 0 ? this.girlMood : null });
      }
      this.drawBubble(night);
    }
    drawWeatherAir(this.t, night, this.lastDt || 1 / 60);
    this.particles.draw();
    this.drawHud();
    this.drawDock(night);
    this.drawStatusLine(night);
    if (this.dialog) this.drawDialog();
    if (this.picker) this.drawPicker();
    this.drawNotice();
    if (this.gearOpen) this.drawGearMenu(); // le menu passe devant les notifications
    if (this.banner) drawBanner(this.banner);
    if (this.flash > 0) { ctx.globalAlpha = this.flash * 0.8; ctx.fillStyle = C.COLORS.blanc; ctx.fillRect(0, 0, C.W, view.H); ctx.globalAlpha = 1; }
  }

  // ------------------------------------------------------------ choix du jeu
  pickerCards() {
    const top = view.H * 0.24;
    return GAMES.map((g, i) => ({ ...g, x: 34, y: top + 58 + i * 78, w: C.W - 68, h: 66 }));
  }

  tapPicker(x, y) {
    for (const c of this.pickerCards()) {
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        audio.play("jeu");
        this.picker = false;
        this.game.setScene(new c.Scene(this.game));
        return;
      }
    }
    this.picker = false;
  }

  drawPicker() {
    const cards = this.pickerCards();
    const top = view.H * 0.24;
    ctx.fillStyle = "rgba(46,38,80,0.4)";
    ctx.fillRect(0, 0, C.W, view.H);
    const h = 58 + cards.length * 78 + 12;
    rr(20, top + 4, C.W - 40, h, "rgba(58,74,48,0.2)", null, 0, 26);
    rr(20, top, C.W - 40, h, C.COLORS.creme_jour, C.COLORS.trait, 2, 26);
    text(T("pick"), C.W / 2, top + 30, 19, C.COLORS.trait, "center", 700);
    for (const c of cards) {
      rr(c.x, c.y + 3, c.w, c.h, shade(c.color), C.COLORS.trait, 2, 20);
      rr(c.x, c.y, c.w, c.h, c.color, C.COLORS.trait, 2, 20);
      circle(c.x + 36, c.y + c.h / 2, 22, "#fff", C.COLORS.trait, 2);
      c.drawIcon(c.x + 36, c.y + c.h / 2);
      text(c.title, c.x + 70, c.y + 25, 16, C.COLORS.trait, "left", 700);
      text(c.sub, c.x + 70, c.y + 45, 12, "#6b5a50", "left", 500);
    }
  }

  drawEgg() {
    const b = charBox("oeuf");
    const p = this.pet.eggProgress;
    const wob = Math.sin(this.t * 18) * (this.eggWobble * 0.3 + (p > 0.6 ? 0.04 + 0.08 * Math.max(0, Math.sin(this.t * 2.5)) : 0.02));
    if (!decorOn()) lilyPad(C.W / 2, L.charBottom, b.w * 0.7, this.pet.isNight());
    ctx.save();
    ctx.translate(b.cx, L.charBottom - 4);
    ctx.rotate(wob);
    const w = b.w * 0.5, h = b.h;
    const egg = new Path2D();
    egg.moveTo(0, -h);
    egg.bezierCurveTo(w * 0.62, -h, w, -h * 0.5, w, -h * 0.34);
    egg.bezierCurveTo(w, -h * 0.12, w * 0.58, 0, 0, 0);
    egg.bezierCurveTo(-w * 0.58, 0, -w, -h * 0.12, -w, -h * 0.34);
    egg.bezierCurveTo(-w, -h * 0.5, -w * 0.62, -h, 0, -h);
    ctx.fillStyle = EGG_SHELL; ctx.fill(egg);
    ctx.save(); ctx.clip(egg);
    ctx.fillStyle = EGG_SPOTS;
    for (const [sx, sy, r] of [[-0.45, -0.7, 0.2], [0.35, -0.5, 0.26], [-0.2, -0.3, 0.14], [0.15, -0.85, 0.12]]) {
      ctx.beginPath(); ctx.arc(sx * w * 2, sy * h, r * w * 2, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = C.COLORS.trait; ctx.stroke(egg);
    if (p > 0.5) {
      ctx.beginPath();
      const cy = -h * 0.55;
      ctx.moveTo(-w * 0.6, cy);
      const n = p > 0.8 ? 6 : 4;
      for (let i = 1; i <= n; i++) ctx.lineTo(-w * 0.6 + (i * w * 1.2) / n, cy + (i % 2 ? -8 : 6));
      ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
    // Barre d'éclosion
    const bw = 120;
    rr(C.W / 2 - bw / 2, L.charBottom + 28, bw, 12, "#fff", C.COLORS.trait, 2);
    if (p > 0) rr(C.W / 2 - bw / 2 + 2, L.charBottom + 30, Math.max(8, (bw - 4) * p), 8, C.NEEDS.faim.fill, null);
  }

  drawDecorItems(night) {
    const m = meadowBand();
    const spots = {
      champignons: m.at(0.45, 0.55), lanterne: m.at(0.8, 0.35), citrouille: m.at(0.62, 0.95),
      chaudron: m.at(0.16, 0.85), corbeau: [m.at(0.93, 0.95)[0], m.at(0.93, 0.95)[1] - 25], chat: [62, L.pond.cy + 52],
    };
    for (const [id, [x, y]] of Object.entries(spots)) if (owns(id)) drawDecor(id, x, y, this.t, night);
  }

  poopPos(i) {
    const x = this.pet.poops[i];
    const side = x < 0.5 ? -1 : 1;
    return { x: C.W / 2 + side * (70 + Math.abs(x - 0.5) * 120), y: L.pond.cy + 8 + (i % 2) * 8 };
  }

  drawPoops() {
    for (let i = 0; i < this.pet.poops.length; i++) {
      const p = this.poopPos(i);
      poop(p.x, p.y + Math.sin(this.t * 2 + i) * 1.5, 1);
      // Petites mouches qui tournent autour, comme dans le Tamagotchi original.
      const a = this.t * 3 + i * 2;
      ctx.fillStyle = C.COLORS.trait;
      ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 14, p.y - 22 + Math.sin(a * 1.3) * 5, 1.6, 0, TAU); ctx.fill();
    }
  }

  drawCharacter(night) {
    const key = this.spriteKey();
    const sprite = img[key];
    if (!sprite) return;
    const box = charBox(this.pet.stage, key);
    const sleepy = this.pet.asleep;
    const breath = Math.sin(this.t * (sleepy ? 1.3 : 2.4));
    let sx = 1 - 0.012 * breath, sy = 1 + 0.02 * breath, lift = 0, dx = 0;
    if (this.bounce > 0) {
      const p = 1 - this.bounce / 0.35;
      lift = Math.sin(p * Math.PI) * 14;
      sy += Math.sin(p * Math.PI) * 0.05;
    }
    if (this.shake > 0) dx = Math.sin(this.shake * 40) * 6 * (this.shake / 0.5);
    if (this.celebrate > 0) {
      const pop = Math.sin(((this.celebrate % 0.6) / 0.6) * Math.PI);
      sx += pop * 0.06; sy += pop * 0.06;
    }
    if (this.pet.isDoree) {
      const a = box.h * (0.85 + 0.05 * Math.sin(this.t * 2));
      const g = ctx.createRadialGradient(box.cx, box.cy, 0, box.cx, box.cy, a);
      g.addColorStop(0, "rgba(255,236,150,0.9)"); g.addColorStop(1, "rgba(255,236,150,0)");
      ctx.fillStyle = g; ctx.fillRect(box.cx - a, box.cy - a, a * 2, a * 2);
    }
    if (!decorOn()) lilyPad(C.W / 2, L.charBottom, Math.min(110, box.w * 0.5), night);
    const fx = swapState("grenouille", key, this.t);
    sx *= fx.pop; sy *= fx.pop;
    const w = box.w * sx, h = box.h * sy;
    if (fx.prev && img[fx.prev]) {
      const pb = charBox(this.pet.stage, fx.prev);
      ctx.globalAlpha = 1 - fx.p;
      drawSprite(fx.prev, pb.cx - pb.w / 2 + dx, L.charBottom - pb.h - lift + 4, pb.w, pb.h, this.pet.hue);
      ctx.globalAlpha = fx.p;
    }
    drawSprite(key, box.cx - w / 2 + dx, L.charBottom - h - lift + 4, w, h, this.pet.hue,
      night && sleepy ? "brightness(0.85)" : "");
    ctx.globalAlpha = 1;
    if (progress.hat) {
      const hd = headTop(this.pet.stage, box.cx - w / 2 + dx, L.charBottom - h - lift + 4, w, h);
      drawHat(progress.hat, hd.cx, hd.top, hd.w, this.t);
    }
    if (this.pet.nounou) {
      ctx.globalAlpha = 0.9;
      drawIcon(ctx, "nounou", box.x + box.w - 6, box.y + 10, 24);
      ctx.globalAlpha = 1;
    }
  }

  /** Bulle de pensée au-dessus de la tête : besoin urgent, sommeil, ou bouton du tuto. */
  drawBubble(night) {
    const pet = this.pet;
    let content = null;
    if (pet.asleep) content = "zzz";
    else if (this.tutoStep) content = this.tutoStep;
    else if (!this.actionMood && !pet.nounou && pet.urgentNeed) content = pet.urgentNeed;
    if (!content) return;
    const box = charBox(pet.stage, this.spriteKey());
    const bob = Math.sin(this.t * 2.5) * 3;
    const bx = Math.min(C.W - 34, box.x + box.w * 0.82), by = box.y - 24 + bob;
    ctx.fillStyle = "#fff";
    circle(bx - 18, by + 26, 3, "#fff", C.COLORS.trait, 1.5);
    circle(bx - 11, by + 18, 5, "#fff", C.COLORS.trait, 1.5);
    circle(bx + 6, by, 22, "#fff", C.COLORS.trait, 2);
    if (content === "zzz") {
      text("Zzz", bx + 6, by + 1, 15, C.COLORS.trait, "center", 700);
    } else {
      const pulse = 1 + 0.08 * Math.sin(this.t * 6);
      drawIcon(ctx, content, bx + 6, by, 26 * pulse);
    }
  }

  drawHud() {
    const pet = this.pet;
    const a = L.age;
    rr(a.x, a.y + 3, a.w, a.h, "rgba(58,74,48,0.14)", null);
    rr(a.x, a.y, a.w, a.h, C.COLORS.blanc);
    const label = pet.isEgg ? `Œuf · Gén. ${pet.generation}` : `${pet.name} · J${pet.day}`;
    let ls = 13;
    ctx.font = `700 ${ls}px ${FONT}`;
    while (ls > 10 && ctx.measureText(label).width > a.w - 22) { ls--; ctx.font = `700 ${ls}px ${FONT}`; }
    text(label, a.x + 11, a.y + a.h / 2, ls, C.COLORS.trait, "left", 700);
    // Croissance : fine barre en bas de l'étiquette, jusqu'au prochain stade (ou éclosion)
    const g = pet.isEgg ? pet.eggProgress : pet.growth;
    ctx.save(); ctx.beginPath(); ctx.roundRect(a.x, a.y, a.w, a.h, a.h / 2); ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(a.x, a.y + a.h - 4, a.w, 4);
    ctx.fillStyle = GOTH ? "#7f9a7b" : "#9ccc65"; ctx.fillRect(a.x, a.y + a.h - 4, a.w * g, 4);
    ctx.restore();
    rr(a.x, a.y, a.w, a.h, null);
    // Pièces (on les touche pour ouvrir la boutique)
    const c = L.coins;
    const canBuy = SHOP.some((i) => !owns(i.id) && progress.coins >= i.price);
    rr(c.x, c.y + 3, c.w, c.h, "rgba(58,74,48,0.14)", null);
    rr(c.x, c.y, c.w, c.h, canBuy ? "#fbeec0" : C.COLORS.blanc);
    if (canBuy && !shopSeen()) {
      const k = 0.5 + 0.5 * Math.sin(this.t * 5);
      rr(c.x - 3 - k * 2, c.y - 3 - k * 2, c.w + 6 + k * 4, c.h + 6 + k * 4, null, "#e6c25a", 2.5, (c.h + 6) / 2);
      ctx.fillStyle = "#e6c25a"; sparkle(c.x + c.w - 4, c.y - 2, 4 + k * 2);
    }
    // icône + nombre centrés ensemble dans la pastille
    ctx.font = `700 13px ${FONT}`;
    const cw = 15 + 5 + ctx.measureText(`${progress.coins}`).width;
    const cx0 = c.x + (c.w - cw) / 2;
    coinIcon(cx0 + 7.5, c.y + c.h / 2, 7.5);
    text(`${progress.coins}`, cx0 + 20, c.y + c.h / 2 + 0.5, 13, C.COLORS.trait, "left", 700);
    drawIcon(ctx, "reglages", L.gear.x, L.gear.y, 30);
    circle(L.family.x, L.family.y, L.family.r, C.COLORS.blanc, C.COLORS.trait, 2);
    drawIcon(ctx, "grimoire", L.family.x, L.family.y + 1, 22);
    if (progress.quests?.list.some((q) => !q.done)) circle(L.family.x + 11, L.family.y - 11, 4, "#a3354a", C.COLORS.trait, 1.5);

    for (const gz of L.gauges) {
      const need = C.NEEDS[gz.name];
      const value = pet.isEgg ? 100 : pet.stats[gz.name];
      const alert = !pet.isEgg && value < C.RECLAME_SEUIL;
      const pulse = alert ? 1 + 0.2 * Math.max(0, Math.sin(this.t * 7)) : 1;
      drawIcon(ctx, gz.name, gz.x + 10, gz.y + 7, 20 * pulse);
      const barX = gz.x + 26, barW = 112;
      rr(barX, gz.y + 1, barW, 13, need.track, alert && Math.sin(this.t * 7) > 0 ? "#e0526f" : C.COLORS.trait, 2);
      const fill = (barW - 4) * (value / C.STAT_MAX);
      if (fill > 1) {
        rr(barX + 2, gz.y + 3, Math.max(9, fill), 9, need.fill, null);
        ctx.globalAlpha = 0.45;
        rr(barX + 5, gz.y + 4.5, Math.max(3, fill - 8), 2.5, "#fff", null);
        ctx.globalAlpha = 1;
      }
    }
  }

  drawDock(night) {
    const d = L.dock;
    // Verre : ombre teintée, fond translucide, liseré clair intérieur (reflet du haut).
    rr(d.x, d.y + 4, d.w, d.h, night ? "rgba(14,10,36,0.35)" : "rgba(58,74,48,0.14)", null);
    rr(d.x, d.y, d.w, d.h, GOTH && !HYB ? "rgba(29,27,34,0.84)" : night ? "rgba(214,209,255,0.88)" : "rgba(255,255,255,0.72)", C.COLORS.trait, 2);
    ctx.beginPath(); ctx.roundRect(d.x + 5, d.y + 4, d.w - 10, d.h - 8, (d.h - 8) / 2);
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.stroke();
    const pet = this.pet;
    const step = this.tutoStep;
    for (const b of L.buttons) {
      const r = b.r * (this.pressed === b.name && this.pressTimer > 0 ? 0.88 : 1);
      const color = { calin: C.NEEDS.amour.button, miam: C.NEEDS.faim.button, jeu: C.COLORS.vert,
        dodo: C.NEEDS.energie.button, baignade: C.NEEDS.fraicheur.button, nounou: "#ffe3c4" }[b.name];
      if ((b.name === "nounou" && pet.nounou) || (b.name === "dodo" && pet.napping)) {
        circle(b.cx, b.cy, b.r + 4, null, C.COLORS.trait, 2.5);
      }
      if (step === b.name) {
        const k = 0.5 + 0.5 * Math.sin(this.t * 6);
        circle(b.cx, b.cy, b.r + 5 + k * 4, null, "#f2a900", 3);
        this.drawFinger(b.cx, b.cy - b.r - 18 - k * 6);
      }
      // Bouton « bonbon » : un rebord sombre dessous, qui disparaît quand on appuie.
      const down = this.pressed === b.name && this.pressTimer > 0;
      const lip = down ? 0 : 3;
      circle(b.cx, b.cy + 3, b.r, shade(color), C.COLORS.trait, 2);
      circle(b.cx, b.cy + 3 - lip, b.r, color, C.COLORS.trait, 2);
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.ellipse(b.cx - b.r * 0.3, b.cy - lip - b.r * 0.45 + 3, b.r * 0.35, b.r * 0.16, -0.5, 0, TAU);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.globalAlpha = 1;
      drawIcon(ctx, b.name, b.cx, b.cy + 3 - lip, r * 1.12);
      const disabled = !pet.isEgg && ((pet.asleep && !["dodo", "nounou"].includes(b.name))
        || (b.name === "jeu" && pet.stats.energie < C.ENERGIE_JEU_MIN));
      if (disabled || (pet.isEgg && b.name !== "nounou")) {
        ctx.globalAlpha = 0.55; circle(b.cx, b.cy + 3 - lip, b.r, night ? "#d6d1ff" : "#fff", null); ctx.globalAlpha = 1;
      }
    }
  }

  drawFinger(x, y) {
    // Petite flèche arrondie qui pointe le bouton du tuto.
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x - 9, y - 1); ctx.lineTo(x - 4, y - 1); ctx.lineTo(x - 4, y - 10);
    ctx.lineTo(x + 4, y - 10); ctx.lineTo(x + 4, y - 1); ctx.lineTo(x + 9, y - 1);
    ctx.closePath();
    ctx.fillStyle = "#ffd84a"; ctx.fill();
    ctx.lineJoin = "round"; ctx.lineWidth = 2; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
  }

  drawStatusLine(night) {
    const pet = this.pet;
    let str = this.toast?.str;
    if (!str) {
      if (pet.isEgg) str = T("egg");
      else if (!pet.named && this.naming) str = "";
      else if (pet.nounou) str = T("nounouLine");
      else if (pet.atSchool) str = `C'est l'heure de l'école : ${pet.name} t'attend, la mare est en pause. Pas d'école aujourd'hui ? Touche-moi !`;
      else if (pet.familyEgg && !pet.asleep) str = T("familyEgg");
      else if (pet.asleep && pet.isNight()) str = T("nightAsleep");
      else if (pet.napping) str = T("napLine");
    }
    this.bubbleRect = null;
    if (!str) return;
    if (GOTH) { this.drawGirlBubble(str); return; }
    // Le texte rétrécit, puis passe sur deux lignes s'il est trop long pour l'écran.
    let size = 13, lines = [str];
    const fits = (l) => { ctx.font = `600 ${size}px ${FONT}`; return l.every((x) => ctx.measureText(x).width <= C.W - 44); };
    while (!fits(lines) && size > 11) size--;
    if (!fits(lines)) {
      const words = str.split(" "); const mid = Math.ceil(words.length / 2);
      lines = [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
      size = 12;
    }
    ctx.font = `600 ${size}px ${FONT}`;
    const w = Math.min(C.W - 20, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24);
    const h = 12 + lines.length * (size + 5);
    const y = L.dock.y - 8 - h;
    const dark = (GOTH && !HYB) || night;
    rr(C.W / 2 - w / 2, y, w, h, dark ? "rgba(29,27,34,0.82)" : "rgba(255,255,255,0.85)", null, 0, 12);
    lines.forEach((l, i) => text(l, C.W / 2, y + 8 + (size + 5) * (i + 0.5), size, dark ? "#f4f0ea" : C.COLORS.trait));
  }

  /** Bulle de parole d'Ombeline, accrochée au-dessus de sa tête. */
  drawGirlBubble(str) {
    const clean = str.replace(/^Ombeline : « (.*) »$/, "$1");
    ctx.font = `600 13px ${FONT}`;
    const maxW = C.W - 60;
    const words = clean.split(" "), lines = [];
    let cur = "";
    for (const wd of words) {
      const test = cur ? `${cur} ${wd}` : wd;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = test;
    }
    if (cur) lines.push(cur);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 26;
    const h = 14 + lines.length * 17;
    const head = this.girlFeet() - 128;
    const x = 12, y = L.hudBottom + 6; // en haut de la scène : ne cache jamais la grenouille
    this.bubbleRect = { x, y, w, h };
    ctx.fillStyle = "rgba(29,27,34,0.2)";
    ctx.beginPath(); ctx.roundRect(x, y + 3, w, h, 10); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10);
    ctx.fillStyle = C.COLORS.blanc; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
    // petits ronds qui descendent jusqu'à la tête d'Ombeline
    const from = { x: x + 26, y: y + h + 8 }, to = { x: GIRL.x + 4, y: head - 4 };
    for (let i = 0; i < 4; i++) {
      const k = (i + 0.5) / 4;
      circle(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, 5 - i, C.COLORS.blanc, C.COLORS.trait, 2);
    }
    lines.forEach((l, i) => text(l, x + 13, y + 16 + i * 17, 13, C.COLORS.trait, "left", 600));
  }

  /** Lignes du menu réglages (même ordre pour le dessin et les touchers). */
  gearRows() {
    const school = schoolModeOn();
    return [
      { id: "son", label: audio.muted ? "Son coupé" : "Son activé", fill: audio.muted ? C.NEEDS.amour.button : C.COLORS.vert, icon: audio.muted ? "muet" : "son" },
      { id: "musique", label: audio.musicOn ? "Musique : oui" : "Musique : non", fill: audio.musicOn ? C.NEEDS.fraicheur.button : C.COLORS.blanc, icon: "note" },
      { id: "guide", label: "Comment jouer", fill: C.NEEDS.faim.button, icon: "?" },
      { id: "theme", label: `Thème : ${THEME_LABEL[THEME.name]} ›`, fill: C.NEEDS.energie.button },
      { id: "ecole", label: !school ? "Vacances : école coupée" : schoolCommunity() === "nl" ? "École : néerlandophone" : "École : francophone", fill: school ? C.COLORS.vert : C.COLORS.blanc },
      { id: "rappels", label: remindersOn() ? "Rappels : oui" : "Rappels : non", fill: remindersOn() ? C.NEEDS.amour.button : C.COLORS.blanc, icon: "calin" },
      { id: "code", label: "Code secret", fill: "#fbeec0", icon: "coin" },
    ];
  }

  gearPanel() { return { x: C.W - 178, y: L.gear.y + L.gear.r + 8, w: 166, h: 8 + 38 * this.gearRows().length }; }

  drawGearMenu() {
    const p = this.gearPanel();
    rr(p.x, p.y, p.w, p.h, C.COLORS.blanc, C.COLORS.trait, 2, 14);
    this.gearRows().forEach((r, i) => {
      const y = p.y + 9 + i * 38;
      rr(p.x + 10, y, p.w - 20, 28, r.fill, C.COLORS.trait, 2);
      const cy = y + 14;
      if (r.icon === "coin") coinIcon(p.x + 30, cy, 7);
      else if (r.icon === "?") text("?", p.x + 30, cy, 16, C.COLORS.trait, "center", 700);
      else if (r.icon === "note") { // petite croche
        ctx.fillStyle = C.COLORS.trait; ctx.beginPath(); ctx.ellipse(p.x + 27, cy + 4, 3.6, 2.8, -0.4, 0, TAU); ctx.fill();
        ctx.fillRect(p.x + 29.6, cy - 8, 1.8, 12); ctx.beginPath(); ctx.moveTo(p.x + 31.4, cy - 8); ctx.quadraticCurveTo(p.x + 36, cy - 5, p.x + 34, cy - 1);
        ctx.lineWidth = 1.8; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
      } else if (r.icon) drawIcon(ctx, r.icon, p.x + 30, cy, 18);
      if (r.icon) text(r.label, p.x + 44, cy + 1, 13, C.COLORS.trait, "left");
      else text(r.label, p.x + p.w / 2, cy + 1, 12, C.COLORS.trait, "center");
    });
  }
}

// ---------------------------------------------------------------------------
// Mini-jeu gobe-mouches : on vise, la langue part et revient avec la proie.
// Combos, 4 insectes, difficulté croissante, étoiles et record.
// ---------------------------------------------------------------------------
const BUGS = {
  mouche: { pts: 1, r: 9, speed: [55, 85] },
  luciole: { pts: 3, r: 8, speed: [40, 60] },
  libellule: { pts: 5, r: 11, speed: [130, 170] },
  guepe: { pts: -3, r: 10, speed: [60, 95] },
};
const FLIES_DURATION = 30;
const FLIES_STARS = [15, 35, 60];

function loadRecords() { try { return JSON.parse(localStorage.getItem("froggotchi-records")) || {}; } catch { return {}; } }
function saveRecord(game, score) {
  const r = loadRecords();
  const isNew = score > (r[game] ?? 0);
  if (isNew) { r[game] = score; try { localStorage.setItem("froggotchi-records", JSON.stringify(r)); } catch {} }
  return { best: Math.max(score, r[game] ?? 0), isNew };
}

function starRow(cx, y, n, t) {
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * 34;
    const on = i < n;
    const pop = on ? 1 + 0.12 * Math.max(0, Math.sin(t * 5 - i)) : 1;
    ctx.save(); ctx.translate(x, y - (i === 1 ? 6 : 0)); ctx.scale(pop, pop);
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5, rr2 = k % 2 ? 6.5 : 14;
      ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
    }
    ctx.closePath();
    ctx.fillStyle = on ? "#ffd84a" : "#efe6d6"; ctx.fill();
    ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
    ctx.restore();
  }
}

class MinigameScene {
  constructor(game) {
    this.game = game;
    this.bugs = [];
    this.score = 0;
    this.combo = 0; this.lastCatch = -9;
    this.t = 0;
    this.countdown = 3;
    this.timer = FLIES_DURATION;
    this.spawnTimer = 0.4;
    this.particles = new Particles();
    this.tongue = null; // { x, y, k, caught: [] }
    this.dizzy = 0;
    this.shake = 0;
    this.hitStop = 0;
    this.state = "countdown";
    this.result = null;
  }

  get frog() {
    const stage = this.game.pet.stage;
    const mood = this.dizzy > 0 ? "sec" : this.tongue ? "miam" : this.combo >= 3 ? "content" : "jeu";
    const key = spriteName(stage, mood);
    const sprite = img[key];
    const h = C.AGE_SIZES_PX[stage] * 1.05;
    const w = sprite ? (sprite.width * h) / sprite.height : h;
    const bottom = view.H - 64;
    const x = C.W / 2 - w / 2, y = bottom - h + 4;
    const [mx, my] = MOUTH[stage]; // position de la bouche mesurée sur les sprites Figma
    return { key, x, y: bottom - h, w, h, bottom, mouthX: x + w * mx, mouthY: y + h * my };
  }

  get multiplier() { return Math.min(4, 1 + Math.floor(this.combo / 3)); }

  tap(x, y) {
    if (hitExit(x, y) && this.state !== "end") { quitToPond(this.game); return; }
    if (this.state === "end") { if (this.t - this.endAt > 1) this.finish(); return; }
    if (this.state !== "play" || this.dizzy > 0) return;
    if (this.tongue && this.tongue.k < 0.5) return; // la langue est déjà en route
    const f = this.frog;
    if (y > f.mouthY) y = f.mouthY - 10;
    this.tongue = { x, y, k: 0, caught: [], checked: false };
    audio.playNote(880, 0.06);
  }

  spawn() {
    const elapsed = FLIES_DURATION - this.timer;
    const roll = Math.random();
    let kind = "mouche";
    if (elapsed > 8 && roll < 0.1) kind = "libellule";
    else if (elapsed > 4 && roll < 0.1 + Math.min(0.2, elapsed * 0.008)) kind = "guepe";
    else if (roll < 0.45) kind = "luciole";
    const def = BUGS[kind];
    const fromLeft = Math.random() < 0.5;
    const top = C.HUD_TOP + 70, bottom = this.frog.mouthY - 60;
    this.bugs.push({
      kind, r: def.r, x: fromLeft ? -20 : C.W + 20, baseY: top + Math.random() * (bottom - top),
      dir: fromLeft ? 1 : -1, speed: def.speed[0] + Math.random() * (def.speed[1] - def.speed[0]),
      amp: kind === "libellule" ? 26 : 10 + Math.random() * 22, freq: kind === "libellule" ? 5 : 1.5 + Math.random() * 2,
      phase: Math.random() * TAU, y: 0, caught: false,
    });
  }

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    if (this.hitStop > 0) { this.hitStop -= dt; return; }

    if (this.state === "countdown") {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      if (Math.ceil(this.countdown) !== before && this.countdown > 0) audio.playNote(523, 0.12);
      if (this.countdown <= 0) { this.state = "play"; audio.playNote(1046, 0.25); }
      return;
    }
    if (this.state === "end") return;

    this.timer -= dt;
    this.dizzy = Math.max(0, this.dizzy - dt);
    if (this.t - this.lastCatch > 1.6) this.combo = 0;

    const elapsed = FLIES_DURATION - this.timer;
    if ((this.spawnTimer -= dt) <= 0) {
      this.spawn();
      this.spawnTimer = Math.max(0.28, 0.75 - elapsed * 0.016);
    }
    for (const b of this.bugs) {
      if (b.caught) continue;
      b.x += b.dir * b.speed * dt;
      b.y = b.baseY + Math.sin(this.t * b.freq + b.phase) * b.amp;
    }
    this.bugs = this.bugs.filter((b) => b.caught || (b.x > -40 && b.x < C.W + 40));

    // Langue : aller (k 0 -> 0.5), puis retour avec les proies collées.
    const tg = this.tongue;
    if (tg) {
      tg.k += dt / 0.26;
      const f = this.frog;
      const ext = tg.k < 0.5 ? tg.k * 2 : Math.max(0, 2 - tg.k * 2);
      const tipX = f.mouthX + (tg.x - f.mouthX) * ext, tipY = f.mouthY + (tg.y - f.mouthY) * ext;
      if (tg.k >= 0.5 && !tg.checked) {
        tg.checked = true;
        for (const b of this.bugs) {
          if (!b.caught && Math.hypot(b.x - tipX, b.y - tipY) < b.r + 16) { b.caught = true; tg.caught.push(b); }
        }
        if (tg.caught.length) this.onCatch(tg.caught, tipX, tipY);
        else { this.combo = 0; }
      }
      for (const b of tg.caught) { b.x = tipX; b.y = tipY; }
      if (tg.k >= 1) {
        this.bugs = this.bugs.filter((b) => !tg.caught.includes(b));
        this.tongue = null;
      }
    }

    if (this.timer <= 0) {
      this.state = "end";
      this.endAt = this.t;
      this.bugs = [];
      this.tongue = null;
      const stars = FLIES_STARS.filter((s) => this.score >= s).length;
      this.result = { stars, ...saveRecord("gobe-mouches", this.score) };
      audio.play(stars ? "niveau" : "clic");
    }
  }

  onCatch(bugs, x, y) {
    let gained = 0;
    for (const b of bugs) {
      if (b.kind === "guepe") {
        gained += BUGS.guepe.pts;
        this.combo = 0;
        this.dizzy = 1.1;
        this.shake = 0.35;
        audio.play("reclame");
        vibrate([60, 40, 60]);
        this.particles.float(x, y - 16, "Aïe ! −3", "#c0392b");
        this.particles.burst(x, y, "#ffd84a", { count: 10, speed: 70, life: 0.6, radius: 3 });
        continue;
      }
      this.combo++;
      this.lastCatch = this.t;
      const pts = BUGS[b.kind].pts * this.multiplier;
      gained += pts;
      this.particles.float(x, y - 16, `+${pts}`, b.kind === "mouche" ? C.COLORS.trait : "#b8860b");
      this.particles.burst(x, y, b.kind === "libellule" ? "#7fd6d0" : b.kind === "luciole" ? "#ffd84a" : "#ffffff",
        { count: 8, speed: 55, life: 0.5, radius: 2.5 });
    }
    if (gained > 0) {
      this.hitStop = 0.05;
      audio.playNote(660 + Math.min(6, this.combo) * 80, 0.1);
      vibrate(12);
      if (this.combo > 0 && this.combo % 3 === 0) {
        this.particles.float(C.W / 2, view.H * 0.3, `Combo ×${this.multiplier} !`, "#e0527a");
        audio.play("niveau");
      }
    }
    this.score = Math.max(0, this.score + gained);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    record("jeu_mouches"); record("score_mouches", this.score); record("etoiles_mouches", this.result?.stars ?? 0);
    backToPond(this.game, { coins: Math.floor(this.score / 4), faim: Math.min(40, this.score * 0.6), amour: Math.min(30, this.score * 0.4) });
  }

  draw() {
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * this.shake * 3, (Math.random() - 0.5) * 6 * this.shake * 3);
    const savedCy = L.pond.cy;
    L.pond.cy = view.H - 70; // la mare du jeu est en bas de l'écran
    drawSky(this.t, false);
    drawPond(false, false);
    L.pond.cy = savedCy;

    const f = this.frog;
    lilyPad(C.W / 2, f.bottom, f.w * 0.6, false);
    const wob = this.dizzy > 0 ? Math.sin(this.t * 20) * 4 : 0;
    drawSprite(f.key, f.x + wob, f.y + 4, f.w, f.h, this.game.pet.hue);
    if (progress.hat) { const hd = headTop(this.game.pet.stage, f.x + wob, f.y + 4, f.w, f.h); drawHat(progress.hat, hd.cx, hd.top, hd.w, this.t); }
    // Langue dessinée par-dessus le sprite : elle sort de la bouche, pas de derrière.
    const tg = this.tongue;
    if (tg) {
      const ext = tg.k < 0.5 ? tg.k * 2 : Math.max(0, 2 - tg.k * 2);
      const tipX = f.mouthX + (tg.x - f.mouthX) * ext, tipY = f.mouthY + (tg.y - f.mouthY) * ext;
      ctx.lineCap = "round";
      ctx.strokeStyle = C.COLORS.trait; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(f.mouthX, f.mouthY); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.strokeStyle = "#f28aa0"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(f.mouthX, f.mouthY); ctx.lineTo(tipX, tipY); ctx.stroke();
      circle(tipX, tipY, 6, "#f28aa0", C.COLORS.trait, 2);
    }
    if (this.dizzy > 0) {
      for (let i = 0; i < 3; i++) {
        const a = this.t * 5 + (i * TAU) / 3;
        ctx.fillStyle = "#ffd84a"; sparkle(C.W / 2 + Math.cos(a) * 26, f.y + 4 + Math.sin(a) * 6, 5);
      }
    }
    for (const b of this.bugs) this.drawBug(b);
    this.particles.draw();
    ctx.restore();

    // HUD : score, combo, temps
    rr(12, C.HUD_TOP + 5, 100, 32, "rgba(58,74,48,0.14)", null);
    rr(12, C.HUD_TOP + 2, 100, 32, C.COLORS.blanc);
    drawIcon(ctx, "mouche", 32, C.HUD_TOP + 18, 22);
    text(`${this.score}`, 50, C.HUD_TOP + 19, 18, C.COLORS.trait, "left", 700);
    const tw = C.W - 168;
    rr(120, C.HUD_TOP + 10, tw, 16, C.COLORS.blanc);
    const frac = Math.max(0, this.timer / FLIES_DURATION);
    if (frac > 0) rr(123, C.HUD_TOP + 13, Math.max(10, (tw - 6) * frac), 10, frac < 0.2 ? "#f27a9b" : "#7cc47f", null);
    if (this.multiplier > 1 && this.state === "play") {
      const pulse = 1 + 0.08 * Math.sin(this.t * 10);
      ctx.save(); ctx.translate(62, C.HUD_TOP + 52); ctx.scale(pulse, pulse);
      rr(-38, -13, 76, 26, "#ffd1dc", C.COLORS.trait, 2.5);
      text(`Combo ×${this.multiplier}`, 0, 1, 13, C.COLORS.trait, "center", 700);
      ctx.restore();
    }

    if (this.state !== "end") drawExit();
    if (this.state === "countdown") {
      const n = Math.ceil(this.countdown);
      const k = this.countdown % 1;
      ctx.globalAlpha = Math.min(1, k * 3);
      text(`${n}`, C.W / 2, view.H * 0.36, 64 + (1 - k) * 20, C.COLORS.trait, "center", 700);
      ctx.globalAlpha = 1;
      rr(C.W / 2 - 128, view.H * 0.36 + 46, 256, 64, "rgba(255,255,255,0.9)", null, 0, 18);
      text("Touche un insecte pour tirer la langue", C.W / 2, view.H * 0.36 + 66, 13, C.COLORS.trait, "center", 600);
      text("Évite les guêpes !", C.W / 2, view.H * 0.36 + 88, 13, "#a3354a", "center", 700);
    }
    if (this.state === "end") this.drawEnd();
  }

  drawEnd() {
    const r = this.result;
    const cy = view.H * 0.38;
    ctx.fillStyle = "rgba(58,74,48,0.25)"; ctx.fillRect(0, 0, C.W, view.H);
    rr(30, cy - 86, C.W - 60, 196, "rgba(58,74,48,0.2)", null, 0, 26);
    rr(30, cy - 90, C.W - 60, 196, C.COLORS.blanc, C.COLORS.trait, 2.5, 26);
    starRow(C.W / 2, cy - 52, r.stars, this.t);
    text(`${this.score} points`, C.W / 2, cy + 2, 26, C.COLORS.trait, "center", 700);
    text(r.isNew && this.score > 0 ? T("record") : `Record : ${r.best}`, C.W / 2, cy + 32, 14,
      r.isNew && this.score > 0 ? "#e0527a" : "#6b5a50", "center", 700);
    if (this.t - this.endAt > 1) {
      rr(C.W / 2 - 70, cy + 52, 140, 38, shade(C.COLORS.vert), C.COLORS.trait, 2.5);
      rr(C.W / 2 - 70, cy + 49, 140, 38, C.COLORS.vert, C.COLORS.trait, 2.5);
      text("Continuer", C.W / 2, cy + 69, 15, C.COLORS.trait, "center", 700);
    }
  }

  drawBug(b) {
    const { x, y, r } = b;
    const flap = Math.sin(this.t * 32 + b.phase) * 0.35;
    const face = b.dir;
    const wings = (count, len, wid, color) => {
      for (let i = 0; i < count; i++) {
        const side = i % 2 ? 1 : -1, off = i < 2 ? 0 : 5;
        ctx.beginPath();
        ctx.ellipse(x + side * r * 0.5 - off * face, y - r * 0.6, len, wid, side * (0.6 + flap), 0, TAU);
        ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
      }
    };
    if (b.kind === "luciole") {
      ctx.globalAlpha = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(this.t * 8 + b.phase));
      circle(x, y, r * 2.2, "#fff3a0", null);
      ctx.globalAlpha = 1;
      wings(2, r * 0.7, r * 0.4, "rgba(255,255,255,0.9)");
      circle(x, y, r * 0.75, "#ffd84a", C.COLORS.trait, 2);
    } else if (b.kind === "libellule") {
      wings(4, r * 1.1, r * 0.32, "rgba(214,240,255,0.9)");
      ctx.lineCap = "round";
      ctx.strokeStyle = C.COLORS.trait; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x + face * 6, y); ctx.lineTo(x - face * 20, y + 2); ctx.stroke();
      ctx.strokeStyle = "#46b8b0"; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(x + face * 6, y); ctx.lineTo(x - face * 20, y + 2); ctx.stroke();
      circle(x + face * 8, y - 1, 4.5, "#46b8b0", C.COLORS.trait, 2);
    } else if (b.kind === "guepe") {
      wings(2, r * 0.75, r * 0.42, "rgba(255,255,255,0.85)");
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.8, 0, 0, TAU);
      ctx.fillStyle = "#ffd23f"; ctx.fill(); ctx.clip();
      ctx.fillStyle = C.COLORS.trait;
      for (const dx of [-4, 3]) ctx.fillRect(x + dx * face - 1.8, y - r, 3.6, r * 2);
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.8, 0, 0, TAU);
      ctx.lineWidth = 2; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - face * r * 1.1, y); ctx.lineTo(x - face * (r * 1.1 + 6), y + 1); ctx.stroke();
      ctx.fillStyle = C.COLORS.trait;
      ctx.beginPath(); ctx.arc(x + face * r * 0.6, y - 2, 1.6, 0, TAU); ctx.fill();
    } else {
      wings(2, r * 0.7, r * 0.4, "rgba(255,255,255,0.9)");
      circle(x, y, r * 0.75, C.COLORS.trait, C.COLORS.trait, 1.5);
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(x + face * r * 0.35, y - 2, 1.8, 0, TAU); ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// Grande bannière de moment fort (naissance, évolution, nouvelle génération)
// ---------------------------------------------------------------------------
function drawBanner(b) {
  const age = b.max - b.t;
  const k = Math.min(1, age / 0.35);
  const pop = k < 1 ? 0.7 + 0.3 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * 0.08 : 1;
  const alpha = Math.min(1, b.t / 0.4);
  const y = L.hudBottom + 30;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(C.W / 2, y + 36);
  ctx.scale(pop, pop);
  rr(-138, -32, 276, 72, "rgba(58,74,48,0.18)", null, 0, 24);
  rr(-138, -36, 276, 72, C.COLORS.blanc, C.COLORS.trait, 3, GOTH ? 8 : 24);
  if (GOTH) rr(-132, -30, 264, 60, null, C.COLORS.trait, 1.2, 5); // double filet, façon faire-part
  ctx.fillStyle = "#ffd84a";
  sparkle(-118, -22, 7); sparkle(120, 18, 6);
  let size = 21; // le titre rétrécit pour tenir dans la bannière (prénoms longs)
  ctx.font = `700 ${size}px ${FONT}`;
  while (size > 13 && ctx.measureText(b.title).width > 240) { size--; ctx.font = `700 ${size}px ${FONT}`; }
  text(b.title, 0, -12, size, C.COLORS.trait, "center", 700);
  text(b.sub, 0, 14, 13, "#6b5a50", "center", 600);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Départ des parents vers la Grande Mare, puis l'œuf de la génération suivante
// ---------------------------------------------------------------------------
class DepartureScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.parents = game.pet;
    this.particles = new Particles();
  }

  tap() { if (this.t > 1.5) this.t = Math.max(this.t, 4.2); }

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    if (Math.random() < dt * 6 && this.t < 4) {
      const k = Math.min(1, this.t / 4);
      this.particles.burst(C.W / 2 + k * 170, L.charBottom - 60 - k * 90, null,
        { count: 1, speed: 20, life: 1.2, radius: 4, gravity: -25, shape: "heart" });
    }
    if (this.t >= 4.6 && !this.done) {
      this.done = true;
      const parents = this.parents;
      const child = parents.newGeneration();
      record("generation");
      child.save();
      audio.play("niveau");
      this.game.pet = child;
      this.game.pond = new PondScene(this.game);
      this.game.pond.banner = { title: T("genBanner", { g: child.generation }), sub: T("genBannerSub", { a: parents.name, b: parents.partner.name }), t: 4, max: 4 };
      this.game.pond.flash = 0.6;
      this.game.setScene(this.game.pond);
    }
  }

  draw() {
    const night = this.parents.isNight();
    drawSky(this.t, night);
    drawPond(night);
    const k = Math.min(1, Math.max(0, (this.t - 0.6) / 3.4));
    const ease = k * k * (3 - 2 * k);
    const hop = (p) => Math.abs(Math.sin(this.t * 5 + p)) * 10 * (1 - ease);
    const couple = [
      { hue: this.parents.hue, x0: C.W / 2, h0: 118, phase: 0 },
      { hue: this.parents.partner.hue, x0: 48, h0: 70, phase: 1.2 },
    ];
    for (const c of couple) {
      const key = spriteName("grenouille", "amour");
      const s = img[key];
      if (!s) continue;
      const scale = 1 - ease * 0.7;
      const h = c.h0 * scale * (c.h0 < 100 ? 1.2 : 1), w = (s.width * h) / s.height;
      const x = c.x0 + ease * (C.W + 40 - c.x0);
      const y = L.charBottom - ease * 110 - hop(c.phase);
      ctx.globalAlpha = 1 - Math.max(0, (ease - 0.8) * 5);
      drawSprite(key, x - w / 2, y - h, w, h, c.hue);
      ctx.globalAlpha = 1;
    }
    // L'œuf reste sur le nénuphar
    if (!decorOn()) lilyPad(C.W / 2, L.charBottom, 60, night);
    ctx.beginPath(); ctx.ellipse(C.W / 2, L.charBottom - 24, 20, 26, 0, 0, TAU);
    ctx.fillStyle = EGG_SHELL; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
    this.particles.draw();
    drawBanner({ title: T("bye", { a: this.parents.name, b: this.parents.partner.name }), sub: T("byeSub"), t: Math.min(3, 4.6 - this.t), max: 4.6 });
  }
}

// ---------------------------------------------------------------------------
// Bouton ✕ (en haut à droite) : retour à la mare depuis n'importe quel écran
// ---------------------------------------------------------------------------
const EXIT = { x: C.W - 26, y: C.HUD_TOP + 16, r: 15 };
const hitExit = (x, y) => Math.hypot(x - EXIT.x, y - EXIT.y) <= EXIT.r + 9;

function drawExit() {
  circle(EXIT.x, EXIT.y + 2.5, EXIT.r, "rgba(29,27,34,0.2)", null);
  circle(EXIT.x, EXIT.y, EXIT.r, C.COLORS.blanc, C.COLORS.trait, 2.5);
  ctx.strokeStyle = C.COLORS.trait; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  const k = 5;
  ctx.beginPath(); ctx.moveTo(EXIT.x - k, EXIT.y - k); ctx.lineTo(EXIT.x + k, EXIT.y + k);
  ctx.moveTo(EXIT.x + k, EXIT.y - k); ctx.lineTo(EXIT.x - k, EXIT.y + k); ctx.stroke();
}

/** Quitter un écran : retour à la mare, sans récompense ni pénalité. */
function quitToPond(game) {
  audio.play("clic");
  game.setScene(game.pond);
}

// ---------------------------------------------------------------------------
// Outils communs aux mini-jeux
// ---------------------------------------------------------------------------
function backToPond(game, { faim = 0, amour = 0, coins = 0 } = {}) {
  const pet = game.pet;
  pet.smile(1.5);
  record("jeux");
  if (coins > 0) {
    progress.coins += coins;
    game.pond.notify(`+${coins} pièces gagnées au jeu`, coins);
  }
  pet.add("faim", faim);
  pet.add("amour", amour);
  pet.add("energie", -C.MINIGAME_ENERGIE_COUT);
  pet.save();
  const pond = game.pond;
  pond.setMood("content", 2);
  pond.bounce = 0.35;
  game.setScene(pond);
}

function gameBackground(color) {
  if (bodyColor !== color) { document.body.style.background = color; bodyColor = color; }
  const g = ctx.createLinearGradient(0, 0, 0, view.H);
  g.addColorStop(0, color); g.addColorStop(1, shade(color, 0.93));
  ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, view.H);
  drawGrain();
}

/** Petite grenouille spectatrice en bas de l'écran (réagit aux réussites / ratés). */
function drawWatcher(game, mood, t) {
  const pet = game.pet;
  const key = spriteName(pet.stage, mood);
  const s = img[key];
  if (!s) return;
  const h = C.AGE_SIZES_PX[pet.stage] * 0.75, w = (s.width * h) / s.height;
  const bottom = view.H - 40;
  lilyPad(C.W / 2, bottom, w * 0.55, false);
  const hop = mood === "content" ? Math.abs(Math.sin(t * 8)) * 6 : 0;
  drawSprite(key, C.W / 2 - w / 2, bottom - h + 4 - hop, w, h, pet.hue);
}

function endCard(title, line) {
  const cy = view.H * 0.4;
  rr(40, cy - 40, C.W - 80, 88, "rgba(58,74,48,0.18)", null, 0, 22);
  rr(40, cy - 44, C.W - 80, 88, C.COLORS.blanc, C.COLORS.trait, 2, 22);
  text(title, C.W / 2, cy - 14, 24, C.COLORS.trait, "center", 700);
  text(line, C.W / 2, cy + 18, 15);
}

// ---------------------------------------------------------------------------
// Mini-jeu « Chanson des bulles » : mémoire musicale façon Simon.
// ---------------------------------------------------------------------------
const BUBBLES = [
  { color: C.NEEDS.amour.fill, soft: C.NEEDS.amour.button, note: 523.25 },
  { color: C.NEEDS.faim.fill, soft: C.NEEDS.faim.button, note: 659.25 },
  { color: C.NEEDS.energie.fill, soft: C.NEEDS.energie.button, note: 783.99 },
  { color: C.NEEDS.fraicheur.fill, soft: C.NEEDS.fraicheur.button, note: 1046.5 },
];
const SIMON_MAX = 10;
if (GOTH) [220, 261.63, 329.63, 392].forEach((n, i) => { BUBBLES[i].note = n; }); // la mineur, façon violoncelle

class SimonScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.seq = [];
    this.round = 0;
    this.state = "pause"; // pause -> show -> input -> (pause | end)
    this.timer = 1.0;
    this.showIdx = 0;
    this.inputIdx = 0;
    this.lit = -1; this.litT = 0;
    this.mood = "paisible";
    this.particles = new Particles();
  }

  bubblePos(i) {
    const cx = C.W / 2, cy = view.H * 0.4;
    return { x: cx + (i % 2 ? 64 : -64), y: cy + (i < 2 ? -64 : 64), r: 54 };
  }

  light(i, dur = 0.4) {
    this.lit = i; this.litT = dur;
    audio.playNote(BUBBLES[i].note, dur + 0.1);
  }

  tap(x, y) {
    if (hitExit(x, y) && this.state !== "end") { quitToPond(this.game); return; }
    if (this.state === "end") { this.timer = 0.01; return; }
    if (this.state !== "input") return;
    for (let i = 0; i < 4; i++) {
      const b = this.bubblePos(i);
      if (Math.hypot(x - b.x, y - b.y) > b.r) continue;
      this.light(i, 0.3);
      if (i !== this.seq[this.inputIdx]) {
        this.state = "end"; this.timer = 2.8; this.mood = "boudeur";
        this.record = saveRecord("bulles", this.round).best;
        audio.play("reclame");
        return;
      }
      this.inputIdx++;
      if (this.inputIdx === this.seq.length) {
        this.round++;
        this.mood = "content";
        this.particles.burst(C.W / 2, view.H * 0.4, "#fff7b0", { count: 12, speed: 80, life: 0.9, radius: 3, shape: "star" });
        if (this.round >= SIMON_MAX) {
          this.state = "end"; this.timer = 2.8; audio.play("niveau");
          this.record = saveRecord("bulles", this.round).best;
        }
        else { this.state = "pause"; this.timer = 1.0; }
      }
      return;
    }
  }

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    if (this.litT > 0 && (this.litT -= dt) <= 0) this.lit = -1;
    this.timer -= dt;
    if (this.state === "pause" && this.timer <= 0) {
      this.seq.push(Math.floor(Math.random() * 4));
      this.state = "show"; this.showIdx = 0; this.timer = 0.3; this.mood = "paisible";
    } else if (this.state === "show" && this.timer <= 0) {
      if (this.showIdx < this.seq.length) {
        const speed = Math.max(0.28, 0.5 - this.round * 0.02);
        this.light(this.seq[this.showIdx++], speed);
        this.timer = speed + 0.18;
      } else {
        this.state = "input"; this.inputIdx = 0;
      }
    } else if (this.state === "end" && this.timer <= 0 && !this.done) {
      this.done = true;
      record("jeu_sonate"); record("score_sonate", this.round);
      backToPond(this.game, { coins: this.round * 2, amour: this.round * 3 });
    }
  }

  draw() {
    gameBackground(GOTH ? "#d7d2dd" : "#f3efff");
    rr(12, C.HUD_TOP + 2, 118, 28, C.COLORS.blanc);
    text(`Manche ${Math.min(this.round + 1, SIMON_MAX)}/${SIMON_MAX}`, 71, C.HUD_TOP + 17, 14, C.COLORS.trait, "center", 700);
    const hint = this.state === "show" ? "Écoute bien…" : this.state === "input" ? "À toi !" : "";
    if (hint) text(hint, C.W - 52, C.HUD_TOP + 17, 15, C.COLORS.trait, "right", 700);
    if (this.state !== "end") drawExit();

    for (let i = 0; i < 4; i++) {
      const b = this.bubblePos(i);
      const on = this.lit === i;
      const r = b.r * (on ? 1.06 : 1);
      if (on) { ctx.globalAlpha = 0.35; circle(b.x, b.y, r + 12, BUBBLES[i].color, null); ctx.globalAlpha = 1; }
      circle(b.x, b.y + 4, r, shade(on ? BUBBLES[i].color : BUBBLES[i].soft), C.COLORS.trait, 2);
      circle(b.x, b.y, r, on ? BUBBLES[i].color : BUBBLES[i].soft, C.COLORS.trait, 2.5);
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(b.x - r * 0.35, b.y - r * 0.4, r * 0.28, r * 0.14, -0.6, 0, TAU);
      ctx.fillStyle = "#fff"; ctx.fill(); ctx.globalAlpha = 1;
    }
    this.particles.draw();
    drawWatcher(this.game, this.mood, this.t);

    if (this.state === "end") {
      endCard(this.round >= SIMON_MAX ? T("perfect") : this.round > 0 ? T("win") : T("almost"),
        `${this.round} chanson${this.round > 1 ? "s" : ""} · record ${this.record}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Mini-jeu « Cache-cache » : un petit têtard se cache sous une feuille, on les mélange.
// ---------------------------------------------------------------------------
const SHELL_ROUNDS = 5;

function leafDome(x, yBase, lift) {
  const w = 44, h = 50, y = yBase - lift;
  ctx.fillStyle = "rgba(70,120,140,0.18)";
  ctx.beginPath(); ctx.ellipse(x, yBase + 4, w, 9, 0, 0, TAU); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w, y - h * 1.2, x + w, y - h * 1.2, x + w, y);
  ctx.quadraticCurveTo(x, y + 10, x - w, y);
  ctx.fillStyle = C.COLORS.nenuphar; ctx.fill();
  ctx.lineWidth = 3.5; ctx.strokeStyle = C.COLORS.trait; ctx.lineJoin = "round"; ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - h * 0.85); ctx.lineTo(x, y + 3);
  ctx.moveTo(x, y - h * 0.45); ctx.lineTo(x - 18, y - h * 0.7);
  ctx.moveTo(x, y - h * 0.45); ctx.lineTo(x + 18, y - h * 0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - h * 0.88); ctx.quadraticCurveTo(x + 4, y - h * 1.1, x + 10, y - h * 1.12); ctx.stroke();
}

class ShellScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.round = 0;
    this.found = 0;
    this.particles = new Particles();
    this.mood = "paisible";
    this.startRound();
  }

  slotX(slot) { return C.W / 2 + (slot - 1) * 96; }
  get baseY() { return view.H * 0.47; }

  startRound() {
    this.cups = [0, 1, 2].map((slot) => ({ slot, x: this.slotX(slot), lift: 38 }));
    this.baby = Math.floor(Math.random() * 3); // index de la feuille qui cache le têtard
    this.state = "peek"; this.timer = 1.3;
    this.swapsLeft = 3 + this.round * 2;
    this.swap = null;
    this.picked = -1;
    this.mood = "paisible";
  }

  tap(x, y) {
    if (hitExit(x, y) && this.state !== "end") { quitToPond(this.game); return; }
    if (this.state === "end") { this.timer = 0.01; return; }
    if (this.state !== "pick") return;
    let best = -1, bestD = 56;
    this.cups.forEach((c, i) => { const d = Math.hypot(x - c.x, y - (this.baseY - 24)); if (d < bestD) { best = i; bestD = d; } });
    if (best < 0) return;
    this.picked = best;
    this.state = "reveal"; this.timer = 1.5;
    if (best === this.baby) {
      this.found++;
      this.mood = "content";
      audio.play("niveau");
      vibrate(30);
      this.particles.burst(this.cups[best].x, this.baseY - 30, null, { count: 8, speed: 60, life: 1, radius: 5, gravity: -15, shape: "heart" });
    } else {
      this.mood = "boudeur";
      audio.play("clic");
    }
  }

  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    this.timer -= dt;
    const lerp = (a, b, k) => a + (b - a) * k;
    for (const [i, c] of this.cups.entries()) {
      let target = 0;
      if (this.state === "peek") target = 38;
      if (this.state === "reveal" && (i === this.picked || i === this.baby)) target = 42;
      if (this.state === "end") target = 0;
      c.lift = lerp(c.lift, target, Math.min(1, dt * 10));
    }
    if (this.state === "peek" && this.timer <= 0) { this.state = "cover"; this.timer = 0.5; }
    else if (this.state === "cover" && this.timer <= 0) { this.state = "shuffle"; this.nextSwap(); }
    else if (this.state === "shuffle") {
      const sw = this.swap;
      sw.k = Math.min(1, sw.k + dt / sw.dur);
      const e = sw.k < 0.5 ? 2 * sw.k * sw.k : 1 - Math.pow(-2 * sw.k + 2, 2) / 2;
      const [a, b] = [this.cups[sw.a], this.cups[sw.b]];
      a.x = lerp(this.slotX(sw.fromA), this.slotX(sw.fromB), e);
      b.x = lerp(this.slotX(sw.fromB), this.slotX(sw.fromA), e);
      a.arc = Math.sin(e * Math.PI) * 18; b.arc = -Math.sin(e * Math.PI) * 18;
      if (sw.k >= 1) {
        a.slot = sw.fromB; b.slot = sw.fromA; a.arc = b.arc = 0;
        if (--this.swapsLeft > 0) this.nextSwap();
        else this.state = "pick";
      }
    } else if (this.state === "reveal" && this.timer <= 0) {
      this.round++;
      if (this.round >= SHELL_ROUNDS) { this.state = "end"; this.timer = 2.6; }
      else this.startRound();
    } else if (this.state === "end" && this.timer <= 0 && !this.done) {
      this.done = true;
      record("jeu_cache"); record("score_cache", this.found);
      backToPond(this.game, { coins: this.found * 3, amour: this.found * 4 });
    }
  }

  nextSwap() {
    const a = Math.floor(Math.random() * 3);
    let b = Math.floor(Math.random() * 2); if (b >= a) b++;
    this.swap = { a, b, fromA: this.cups[a].slot, fromB: this.cups[b].slot, k: 0,
      dur: Math.max(0.22, 0.55 - this.round * 0.07) };
    audio.playNote(392 + Math.random() * 60, 0.12);
  }

  draw() {
    gameBackground(GOTH ? "#d3d8d0" : "#eef8e6");
    rr(12, C.HUD_TOP + 2, 118, 28, C.COLORS.blanc);
    text(`Manche ${Math.min(this.round + 1, SHELL_ROUNDS)}/${SHELL_ROUNDS}`, 71, C.HUD_TOP + 17, 14, C.COLORS.trait, "center", 700);
    rr(C.W - 120, C.HUD_TOP + 2, 70, 28, C.COLORS.blanc);
    drawIcon(ctx, "calin", C.W - 102, C.HUD_TOP + 16, 16);
    text(`${this.found}`, C.W - 86, C.HUD_TOP + 17, 15, C.COLORS.trait, "left", 700);
    if (this.state !== "end") drawExit();

    const hint = { peek: "Regarde où le têtard se cache…", shuffle: "Suis la bonne feuille !", pick: "Où est le têtard ?" }[this.state];
    if (hint) text(hint, C.W / 2, this.baseY - 110, 16, C.COLORS.trait, "center", 700);

    // Eau sous les feuilles
    ctx.fillStyle = "#cdeefa";
    ctx.beginPath(); ctx.ellipse(C.W / 2, this.baseY + 4, 150, 22, 0, 0, TAU); ctx.fill();

    const babyKey = "tetard_content";
    const s = img[babyKey];
    const cup = this.cups[this.baby];
    if (s && cup.lift > 6) {
      const h = 34, w = (s.width * h) / s.height;
      drawSprite(babyKey, cup.x - w / 2, this.baseY - h + 2, w, h, this.game.pet.hue);
    }
    for (const c of this.cups) leafDome(c.x, this.baseY + (c.arc || 0) * 0.3, c.lift + Math.max(0, c.arc || 0));
    this.particles.draw();
    drawWatcher(this.game, this.mood, this.t);

    if (this.state === "end") endCard(this.found >= 4 ? (GOTH ? "Détective redoutable." : "Super détective !") : T("win"), `Trouvé ${this.found} fois sur ${SHELL_ROUNDS}`);
  }
}

// Menu des jeux (le bouton « jeu » de la mare ouvre ce choix).
const GAMES = [
  { title: "Gobe-mouches", sub: "Attrape les mouches", color: C.COLORS.vert, Scene: MinigameScene,
    drawIcon: (x, y) => drawIcon(ctx, "mouche", x, y, 28) },
  { title: GOTH ? "Sonate des bulles" : "Chanson des bulles", sub: GOTH ? "Retiens la sonate" : "Retiens la mélodie", color: C.NEEDS.energie.button, Scene: SimonScene,
    drawIcon: (x, y) => { BUBBLES.forEach((b, i) => circle(x + (i % 2 ? 6 : -6), y + (i < 2 ? -6 : 6), 5.5, b.color, C.COLORS.trait, 1.5)); } },
  { title: "Cache-cache", sub: "Retrouve le têtard", color: C.NEEDS.faim.button, Scene: ShellScene,
    drawIcon: (x, y) => { ctx.save(); ctx.translate(x, y + 8); ctx.scale(0.36, 0.36); leafDome(0, 0, 0); ctx.restore(); } },
];

// ---------------------------------------------------------------------------
// Le grimoire : quêtes du jour, boutique d'Ombeline, succès (+ lien vers la famille).
// Le contenu défile au doigt.
// ---------------------------------------------------------------------------
const BOOK_TABS = [["quetes", "Quêtes"], ["boutique", "Boutique"], ["lettres", "Lettres"], ["succes", "Succès"], ["famille", "Famille"]];

class BookScene {
  constructor(game, tab = "quetes") {
    this.game = game; this.t = 0; this.tab = tab; this.scroll = 0; this.maxScroll = 0;
    this.particles = new Particles(); this.msg = null; this.hits = [];
  }

  get top() { return C.HUD_TOP + 86; }
  get bottom() { return view.H - 78; }

  down(x, y) { this.start = { x, y, scroll: this.scroll, moved: false }; }
  move(x, y) {
    if (!this.start) return;
    const dy = y - this.start.y;
    if (Math.abs(dy) > 6) this.start.moved = true;
    if (this.start.moved) this.scroll = Math.max(0, Math.min(this.maxScroll, this.start.scroll - dy));
  }
  up(x, y) {
    const s = this.start; this.start = null;
    if (s && !s.moved) this.tap(x, y);
  }

  tap(x, y) {
    if (hitExit(x, y) || y > view.H - 70) { quitToPond(this.game); return; }
    const tw = (C.W - 24) / BOOK_TABS.length;
    if (y > C.HUD_TOP + 42 && y < C.HUD_TOP + 76) {
      const [id] = BOOK_TABS[Math.max(0, Math.min(BOOK_TABS.length - 1, Math.floor((x - 12) / tw)))];
      audio.play("clic");
      if (id === "famille") { this.game.setScene(new FamilyScene(this.game)); return; }
      this.tab = id; this.scroll = 0;
      if (id === "boutique") { try { localStorage.setItem("froggotchi-boutique-vue", "1"); } catch {} }
      return;
    }
    for (const h of this.hits) {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { h.on(); return; }
    }
  }

  say(str) { this.msg = { str, t: 2.4 }; }

  update(dt) {
    this.t += dt; this.particles.update(dt);
    if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
  }

  draw() {
    const H = view.H;
    const bg = GOTH ? "#e2ddd6" : C.COLORS.creme_jour;
    if (bodyColor !== bg) { document.body.style.background = bg; bodyColor = bg; }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, C.W, H);
    drawGrain();
    // En-tête
    drawIcon(ctx, "grimoire", 28, C.HUD_TOP + 16, 28);
    text(GOTH ? "Grimoire" : "Mon carnet", 48, C.HUD_TOP + 17, 22, C.COLORS.trait, "left", 700);
    rr(C.W - 120, C.HUD_TOP + 4, 70, 26, C.COLORS.blanc);
    coinIcon(C.W - 105, C.HUD_TOP + 17, 8);
    text(`${progress.coins}`, C.W - 93, C.HUD_TOP + 17, 14, C.COLORS.trait, "left", 700);
    drawExit();
    // Onglets
    const tw = (C.W - 24) / BOOK_TABS.length;
    BOOK_TABS.forEach(([id, label], i) => {
      const on = id === this.tab, x = 12 + i * tw;
      rr(x + 2, C.HUD_TOP + 46, tw - 4, 28, on ? C.COLORS.trait : C.COLORS.blanc, C.COLORS.trait, 2, GOTH ? 6 : 14);
      text(label, x + tw / 2, C.HUD_TOP + 60, 11, on ? C.COLORS.blanc : C.COLORS.trait, "center", 700);
    });
    // Contenu (découpé + défilant)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, this.top, C.W, this.bottom - this.top); ctx.clip();
    this.hits = [];
    const y0 = this.top + 6 - this.scroll;
    const end = this.tab === "quetes" ? this.drawQuests(y0) : this.tab === "boutique" ? this.drawShop(y0)
      : this.tab === "lettres" ? this.drawLetters(y0) : this.drawAchievements(y0);
    this.maxScroll = Math.max(0, end + this.scroll - this.bottom + 10);
    ctx.restore();
    this.hits = this.hits.filter((h) => h.y + h.h > this.top && h.y < this.bottom);
    this.particles.draw();
    if (this.maxScroll > 0) { // petite barre de défilement
      const trackH = this.bottom - this.top - 8, k = this.scroll / this.maxScroll;
      rr(C.W - 6, this.top + 4 + k * (trackH - 40), 3, 40, "rgba(29,27,34,0.3)", null, 0, 2);
    }
    if (this.msg) {
      ctx.font = `600 13px ${FONT}`;
      const w = Math.min(C.W - 24, ctx.measureText(this.msg.str).width + 28);
      rr(C.W / 2 - w / 2, H - 116, w, 30, C.COLORS.trait, null, 0, 10);
      text(this.msg.str, C.W / 2, H - 101, 13, C.COLORS.blanc);
    }
    rr(C.W / 2 - 80, H - 58, 160, 42, shade(C.COLORS.vert), C.COLORS.trait, 2);
    rr(C.W / 2 - 80, H - 62, 160, 42, C.COLORS.vert, C.COLORS.trait, 2);
    text("Retour à la mare", C.W / 2, H - 40, 14, C.COLORS.trait, "center", 700);
  }

  card(x, y, w, h, done = false) {
    rr(x, y + 3, w, h, "rgba(29,27,34,0.12)", null, 0, GOTH ? 8 : 16);
    rr(x, y, w, h, done ? (GOTH ? "#e7eadf" : "#eef7e8") : C.COLORS.blanc, C.COLORS.trait, 2, GOTH ? 8 : 16);
  }

  bar(x, y, w, k, color) {
    rr(x, y, w, 10, "rgba(29,27,34,0.08)", C.COLORS.trait, 1.8);
    if (k > 0) rr(x + 2, y + 2, Math.max(6, (w - 4) * Math.min(1, k)), 6, color, null);
  }

  check(x, y) {
    circle(x, y, 10, "#7f9a7b", C.COLORS.trait, 2);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - 4.5, y); ctx.lineTo(x - 1, y + 3.5); ctx.lineTo(x + 5, y - 3.5); ctx.stroke();
  }

  drawQuests(y) {
    const q = progress.quests;
    text(GOTH ? "Trois épreuves pour aujourd'hui." : "Tes 3 quêtes du jour", C.W / 2, y + 12, 14, C.COLORS.trait, "center", 600);
    y += 30;
    for (const it of q?.list ?? []) {
      const def = questDef(it.id);
      this.card(14, y, C.W - 28, 70, it.done);
      let qs = 14;
      ctx.font = `700 ${qs}px ${FONT}`;
      while (qs > 10 && ctx.measureText(def.text).width > C.W - 120) { qs--; ctx.font = `700 ${qs}px ${FONT}`; }
      text(def.text, 28, y + 20, qs, C.COLORS.trait, "left", 700);
      this.bar(28, y + 40, C.W - 130, it.n / def.goal, C.NEEDS.faim.fill);
      text(`${Math.min(it.n, def.goal)}/${def.goal}`, C.W - 96, y + 45, 12, C.COLORS.trait, "left", 600);
      if (it.done) this.check(C.W - 40, y + 35);
      else { coinIcon(C.W - 52, y + 22, 7); text(`${def.reward}`, C.W - 42, y + 22, 13, C.COLORS.trait, "left", 700); }
      y += 80;
    }
    const all = q?.bonus;
    this.card(14, y, C.W - 28, 52, all);
    text(all ? "Bonus des 3 quêtes : gagné !" : "Bonus si tu finis les 3", 28, y + 26, 13, C.COLORS.trait, "left", 700);
    if (all) this.check(C.W - 40, y + 26);
    else { coinIcon(C.W - 52, y + 26, 7); text(`${QUESTS_BONUS}`, C.W - 42, y + 26, 13, C.COLORS.trait, "left", 700); }
    y += 66;
    text(GOTH ? "De nouvelles épreuves chaque matin." : "De nouvelles quêtes chaque jour !", C.W / 2, y + 8, 12, "#6b5a50", "center", 500);
    text("+5 pièces à chaque visite du jour.", C.W / 2, y + 28, 12, "#6b5a50", "center", 500);
    return y + 40;
  }

  drawShop(y) {
    text(GOTH ? "Boutique d'Ombeline. Ni repris, ni échangé." : "La boutique d'Ombeline", C.W / 2, y + 12, 12, C.COLORS.trait, "center", 600);
    y += 30;
    const colW = (C.W - 38) / 2, cardH = 132;
    const groups = [["chapeau", "Pour ta grenouille"], ["ombeline", "Pour Ombeline"], ["decor", "Pour la mare"]];
    for (const [kind, label] of groups) {
    text(label, 18, y + 10, 15, C.COLORS.trait, "left", 700);
    y += 24;
    const items = SHOP.filter((it) => it.kind === kind);
    items.forEach((item, i) => {
      const x = 14 + (i % 2) * (colW + 10), yy = y + Math.floor(i / 2) * (cardH + 10);
      const have = owns(item.id);
      const worn = item.kind === "chapeau" ? progress.hat === item.id : item.kind === "ombeline" ? progress.girl?.[item.slot] === item.id : false;
      this.card(x, yy, colW, cardH, have);
      // aperçu
      const cx = x + colW / 2, cy = yy + 62;
      if (item.kind === "ombeline") {
        drawGirl(cx, yy + 88, 2, this.t, false, { outfit: { [item.slot]: item.id }, scale: item.id === "parapluie" ? 0.72 : 0.92 });
      } else if (item.kind === "chapeau") {
        const k = "grenouille_paisible", sp = img[k];
        if (sp) {
          const h = 46, w = (sp.width * h) / sp.height;
          drawSprite(k, cx - w / 2, cy - h / 2 + 4, w, h, 0);
          const hd = headTop("grenouille", cx - w / 2, cy - h / 2 + 4, w, h);
          drawHat(item.id, hd.cx, hd.top, hd.w, this.t);
        }
      } else {
        drawDecor(item.id, cx, cy + 22, this.t, false, 1.5);
      }
      let ns = 12;
      ctx.font = `700 ${ns}px ${FONT}`;
      while (ns > 9 && ctx.measureText(item.name).width > colW - 10) { ns--; ctx.font = `700 ${ns}px ${FONT}`; }
      text(item.name, cx, yy + 100, ns, C.COLORS.trait, "center", 700);
      if (have) {
        const wearable = item.kind !== "decor";
        const label = wearable ? (worn ? "Porté ✓" : "Porter") : "Installé ✓";
        rr(x + 14, yy + 110, colW - 28, 16, worn || !wearable ? "#d3ddd0" : C.COLORS.blanc, C.COLORS.trait, 1.6, 8);
        text(label, cx, yy + 118.5, 11, C.COLORS.trait, "center", 700);
        if (wearable) {
          this.hits.push({ x, y: yy, w: colW, h: cardH, on: () => {
            if (item.kind === "chapeau") toggleHat(item.id); else toggleGirl(item.id);
            audio.play("clic");
          } });
        }
      } else {
        const can = progress.coins >= item.price;
        coinIcon(cx - 14, yy + 118, 7);
        text(`${item.price}`, cx - 4, yy + 118, 13, can ? C.COLORS.trait : "#a3354a", "left", 700);
        this.hits.push({ x, y: yy, w: colW, h: cardH, on: () => {
          if (buy(item.id)) {
            audio.play("niveau");
            confetti(this.particles);
            this.say(item.kind === "decor" ? `${item.name} : installé dans la mare !` : `${item.name} : c'est porté !`);
          } else {
            audio.play("reclame");
            this.say(`Il te manque ${item.price - progress.coins} pièces.`);
          }
        } });
      }
    });
    y += Math.ceil(items.length / 2) * (cardH + 10) + 8;
    }
    return y;
  }

  drawLetters(y) {
    const log = [...(lettersState().log || [])].reverse();
    // Bouton pour répondre à papa
    rr(24, y + 4, C.W - 48, 44, shade(C.NEEDS.amour.button), C.COLORS.trait, 2.5, 22);
    rr(24, y, C.W - 48, 44, C.NEEDS.amour.button, C.COLORS.trait, 2.5, 22);
    drawIcon(ctx, "calin", 52, y + 22, 22);
    text("Écrire à papa", 70, y + 23, 16, C.COLORS.trait, "left", 700);
    this.hits.push({ x: 24, y, w: C.W - 48, h: 44, on: () => { audio.play("calin"); writeToPapa(); } });
    y += 62;
    text(log.length ? "Les mots de papa" : "Pas encore de lettre", C.W / 2, y + 12, 14, C.COLORS.trait, "center", 600);
    y += 30;
    if (!log.length) {
      text("Chaque jour, une bouteille peut flotter", C.W / 2, y + 10, 12, "#6b5a50", "center", 500);
      text("sur la mare. Touche-la pour la lire !", C.W / 2, y + 28, 12, "#6b5a50", "center", 500);
      return y + 50;
    }
    for (const l of log) {
      ctx.font = `500 13px ${FONT}`;
      const words = l.texte.split(" "), lines = [];
      let cur = "";
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > C.W - 64 && cur) { lines.push(cur); cur = w; } else cur = test;
      }
      if (cur) lines.push(cur);
      const h = 46 + lines.length * 18;
      this.card(14, y, C.W - 28, h);
      const [yy, mm, dd] = l.day.split("-");
      text(`${dd}/${mm}`, 28, y + 16, 11, "#6b5a50", "left", 600);
      drawIcon(ctx, "calin", C.W - 34, y + 16, 14);
      lines.forEach((ln, i) => text(ln, 28, y + 36 + i * 18, 13, C.COLORS.trait, "left", 500));
      text("— Papa", C.W - 30, y + h - 12, 12, C.COLORS.trait, "right", 700);
      y += h + 10;
    }
    return y;
  }

  drawAchievements(y) {
    const done = progress.done.length;
    text(`${done} / ${ACHIEVEMENTS.length} succès débloqués`, C.W / 2, y + 12, 14, C.COLORS.trait, "center", 600);
    y += 30;
    // D'abord ceux en cours (du plus avancé au moins avancé), puis ceux déjà gagnés.
    const list = [...ACHIEVEMENTS].sort((a, b) => {
      const da = progress.done.includes(a.id), db = progress.done.includes(b.id);
      if (da !== db) return da ? 1 : -1;
      return achievementValue(b) / b.goal - achievementValue(a) / a.goal;
    });
    for (const a of list) {
      const got = progress.done.includes(a.id);
      this.card(14, y, C.W - 28, 58, got);
      text(a.name, 28, y + 19, a.name.length > 20 ? 12 : 14, C.COLORS.trait, "left", 700);
      if (got) { this.check(C.W - 40, y + 29); text("Débloqué", 28, y + 40, 12, "#5a7a55", "left", 600); }
      else {
        this.bar(28, y + 35, C.W - 140, achievementValue(a) / a.goal, C.NEEDS.energie.fill);
        text(`${achievementValue(a)}/${a.goal}`, C.W - 106, y + 40, 11, C.COLORS.trait, "left", 600);
        coinIcon(C.W - 52, y + 20, 7); text(`${a.reward}`, C.W - 42, y + 20, 13, C.COLORS.trait, "left", 700);
      }
      y += 66;
    }
    return y;
  }
}

// ---------------------------------------------------------------------------
// Album de famille : toutes les générations, de la plus récente à la plus ancienne.
// ---------------------------------------------------------------------------
class FamilyScene {
  constructor(game) { this.game = game; this.t = 0; }

  get entries() {
    const pet = this.game.pet;
    const current = { name: pet.isEgg ? "Œuf" : pet.name, hue: pet.hue, generation: pet.generation,
      days: pet.day, partner: pet.partner, current: true, stage: pet.stage, doree: pet.isDoree };
    return [current, ...[...pet.family].reverse()];
  }

  tap(x, y) {
    if (hitExit(x, y)) { quitToPond(this.game); return; }
    audio.play("clic");
    this.game.setScene(new BookScene(this.game, "quetes"));
  }

  update(dt) { this.t += dt; }

  draw() {
    const H = view.H;
    if (bodyColor !== C.COLORS.creme_jour) { document.body.style.background = C.COLORS.creme_jour; bodyColor = C.COLORS.creme_jour; }
    ctx.fillStyle = C.COLORS.creme_jour; ctx.fillRect(0, 0, C.W, H);
    drawIcon(ctx, "famille", 28, C.HUD_TOP + 16, 26);
    text(T("album"), 48, C.HUD_TOP + 17, 22, C.COLORS.trait, "left", 700);
    const g = this.game.pet.generation;
    text(`${g} génération${g > 1 ? "s" : ""}`, C.W - 52, C.HUD_TOP + 18, 13, C.COLORS.trait, "right");
    drawExit();

    let y = 66;
    const cardH = 92;
    for (const e of this.entries) {
      if (y + cardH > H - 76) break;
      rr(12, y, C.W - 24, cardH - 10, e.current ? "#ffffff" : "rgba(255,255,255,0.6)", C.COLORS.trait, e.current ? 2.5 : 1.5, 20);
      const stage = e.current ? (e.stage === "oeuf" ? null : e.stage) : "grenouille";
      if (stage) {
        const k = spriteName(stage, e.doree ? "doree" : "paisible");
        const s = img[k];
        if (s) {
          let h = 50, w = (s.width * h) / s.height;
          if (w > 66) { h *= 66 / w; w = 66; }
          drawSprite(k, 50 - w / 2, y + 66 - h, w, h, e.hue);
        }
      } else {
        ctx.beginPath(); ctx.ellipse(50, y + 40, 18, 23, 0, 0, TAU);
        ctx.fillStyle = EGG_SHELL; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C.COLORS.trait; ctx.stroke();
      }
      text(e.name, 96, y + 22, 17, C.COLORS.trait, "left", 700);
      const sub = e.current ? `Génération ${e.generation} · Jour ${e.days}` : `Génération ${e.generation} · ${e.days} jours`;
      text(sub, 96, y + 44, 12, "#7a6a60", "left", 500);
      if (e.partner) {
        drawIcon(ctx, "calin", 103, y + 63, 13);
        text(`avec ${e.partner.name}`, 114, y + 63, 12, C.COLORS.trait, "left", 600);
      }
      text(e.current ? "Maintenant" : "Grande Mare", C.W - 26, y + 22, 11, e.current ? "#5a9e5d" : "#2f8fc0", "right", 700);
      y += cardH;
    }

    if (this.game.pet.family.length === 0 && y + 110 < H - 76) {
      const pet = this.game.pet;
      const lines = pet.partner
        ? [`${pet.name} et ${pet.partner.name} s'aiment.`, "Bientôt, un œuf apparaîtra", "sur la mare."]
        : ["Quand ta grenouille sera grande", "et heureuse, un amoureux", "viendra lui rendre visite."];
      y += 10;
      ctx.setLineDash([5, 5]);
      rr(12, y, C.W - 24, 96, null, "#b9a99a", 1.5, 20);
      ctx.setLineDash([]);
      lines.forEach((l, i) => text(l, C.W / 2, y + 28 + i * 20, 13, "#7a6a60", "center", 500));
    }

    rr(C.W / 2 - 80, H - 58, 160, 42, shade(C.COLORS.vert), C.COLORS.trait, 2);
    rr(C.W / 2 - 80, H - 62, 160, 42, C.COLORS.vert, C.COLORS.trait, 2);
    text(GOTH ? "Retour au grimoire" : "Retour au carnet", C.W / 2, H - 40, 15, C.COLORS.trait, "center", 700);
  }
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
const game = {
  pet: Pet.load(), scene: null, pond: null, fade: 0,
  setScene(s) {
    if (this.scene && this.scene !== s) this.fade = 1; // fondu blanc crème entre écrans
    if (s !== this.pond && !this.inSub) { history.pushState({ sub: 1 }, ""); this.inSub = true; }
    if (s === this.pond) this.inSub = false;
    this.scene = s;
  },
};

function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * C.W, ((e.clientY - r.top) / r.height) * view.H];
}

async function start() {
  // Prénom de la joueuse (perso.json est privé : absent du dépôt public, présent sur le site).
  try {
    const perso = await (await fetch(`perso.json?v=${Date.now()}`)).json();
    if (perso?.prenom) DEFAULT_PLAYER = String(perso.prenom).slice(0, 20);
  } catch {}
  resize();
  window.addEventListener("resize", resize);
  await Promise.all([
    ...ALL_SPRITES.map((n) => loadImage(n, `assets/sprites/${n}.png?v=${ASSET_V}`)),
    ...GIRL_SPRITES.map((n) => loadImage(`ombeline_${n}`, `assets/ombeline/${n}.png?v=${ASSET_V}`)),
    ...(GOTH ? Object.keys(DECOR).flatMap((v) => DECOR_PLANS.map((pl) => loadImage(`decor_${v}_${pl}`, `assets/decor/${v}_${pl}.svg?v=${ASSET_V}`))) : []),
    ...GIRL_SPRITES.filter((n) => n !== "amour" && n !== "doree").map((n) => loadImage(`ombeline_robe_${n}`, `assets/ombeline/robe_${n}.png?v=${ASSET_V}`)),
    document.fonts?.load(`600 16px ${FONTS.body}`).catch(() => {}),
    document.fonts?.load(`600 20px ${FONTS.title}`).catch(() => {}),
  ]);
  document.body.classList.add("ready");

  game.pet.advanceTo(); // rattrape le temps passé app fermée
  game.pond = new PondScene(game);
  game.setScene(game.pond);
  onProgress((e) => {
    const n = e.type === "quete" ? `Quête : ${e.text}` : e.type === "succes" ? `Succès : ${e.text}`
      : e.type === "bonus" ? "Les 3 quêtes du jour !" : "Pièces de la visite du jour";
    game.pond.notify(n, e.coins);
    if (e.type !== "visite") confetti(game.pond.particles);
  });
  startDay();
  setInterval(() => { startDay(); game.pond.checkLetter(); }, 60000); // minuit passé : nouvelles quêtes, nouvelle lettre
  pingVisit();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pingVisit(); });
  fetch(`lettres.json?v=${Date.now()}`).then((r) => r.json()).then((list) => {
    LETTERS = Array.isArray(list) ? list.filter((l) => l && l.texte) : [];
    game.pond.checkLetter();
  }).catch(() => {});

  // Accueil : une vraie bienvenue la première fois, puis un bonjour à chaque ouverture.
  const hello = () => {
    const h = new Date().getHours();
    const hi = h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
    game.pond.say(T(hi === "Bonsoir" ? "helloSoir" : "hello"), 3.2);
  };
  let welcomed = false;
  try { welcomed = localStorage.getItem("froggotchi-bienvenue") === "1"; } catch {}
  const welcome = (name) => {
    const from = player.from;
    return askName({
      frog: true,
      input: false,
      title: `Bienvenue à la mare, ${name} !`,
      text: T("welcomeText"),
      note: from ? `${from} t'a préparé cette petite mare rien que pour toi.` : "",
      ok: T("welcomeOk"),
    }).then(() => {
      try { localStorage.setItem("froggotchi-bienvenue", "1"); } catch {}
      confetti(game.pond.particles);
      game.pond.say(T("egg"), 3);
    });
  };
  if (!player.name) {
    askName({ title: "Bienvenue à la mare !", text: "Comment tu t'appelles ?", placeholder: "Ton prénom", ok: "Entrer", frog: true })
      .then((name) => { player.name = name; welcome(name); });
  } else if (!welcomed) {
    welcome(player.name);
  } else {
    hello();
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    touched = true;
    audio.unlock();
    if (sheetOpen()) return;
    const [x, y] = toLogical(e);
    if (game.scene.down) game.scene.down(x, y);
    else game.scene.tap(x, y);
  });
  window.addEventListener("popstate", () => {
    game.inSub = false;
    if (game.scene !== game.pond && !(game.scene instanceof DepartureScene)) quitToPond(game);
  });
  canvas.addEventListener("pointermove", (e) => { if (game.scene.move) game.scene.move(...toLogical(e)); });
  canvas.addEventListener("pointerup", (e) => { if (game.scene.up) game.scene.up(...toLogical(e)); });

  setInterval(() => game.pet.save(), 5000);
  document.addEventListener("visibilitychange", () => { game.pet.advanceTo(); game.pet.save(); });
  window.addEventListener("pagehide", () => game.pet.save());

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.pet.advanceTo();
    game.scene.update(dt);
    game.scene.draw();
    if (touched) audio.setMusic(game.scene === game.pond ? (game.pet.isNight() ? "night" : "day") : null);
    if (game.fade > 0) {
      ctx.globalAlpha = game.fade;
      ctx.fillStyle = C.COLORS.creme_jour;
      ctx.fillRect(0, 0, C.W, view.H);
      ctx.globalAlpha = 1;
      game.fade = Math.max(0, game.fade - dt * 4);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
