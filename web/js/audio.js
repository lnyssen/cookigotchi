// Bips chiptune synthétisés (Web Audio), mêmes notes que audio.py. Le contexte audio
// ne peut démarrer qu'après un premier geste : unlock() est appelé au premier tap.

const SOUNDS = {
  calin: [[523, 0.08], [659, 0.12]],
  miam: [[392, 0.06], [330, 0.08]],
  dodo: [[220, 0.3, 0.3]],
  baignade: [[440, 0.05], [494, 0.05], [440, 0.05]],
  jeu: [[880, 0.05, 0.3]],
  clic: [[700, 0.04, 0.25]],
  reclame: [[330, 0.08], [0, 0.05], [330, 0.08]],
  niveau: [[523, 0.08], [659, 0.08], [784, 0.16]],
};

let ctx = null;
export let muted = false;
try { muted = localStorage.getItem("froggotchi-muted") === "1"; } catch {}

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx?.state === "suspended") ctx.resume();
}

export function setMuted(value) {
  muted = value;
  try { localStorage.setItem("froggotchi-muted", value ? "1" : "0"); } catch {}
}

export function play(name) {
  if (muted || !ctx || !SOUNDS[name]) return;
  let t = ctx.currentTime + 0.01;
  for (const [freq, dur, vol = 0.4] of SOUNDS[name]) {
    if (freq > 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const peak = vol * 0.5;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.015);
      gain.gain.setValueAtTime(peak, t + Math.max(0.015, dur - 0.015));
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.01);
    }
    t += dur;
  }
}

/** Joue une note isolée (jeu « Chanson des bulles »). */
export function playNote(freq, dur = 0.35) {
  if (muted || !ctx) return;
  const t = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// ---------------------------------------------------------------------------
// Musique d'ambiance générée : boîte à musique le jour, violoncelle la nuit.
// Très douce, jouée seulement quand l'app est visible et que la musique est activée.
// ---------------------------------------------------------------------------
const MUSIC_KEY = "froggotchi-musique";
export let musicOn = true;
try { musicOn = localStorage.getItem(MUSIC_KEY) !== "off"; } catch {}
let musicMode = null, nextAt = 0, master = null, step = 0, timer = null, lastTarget = -1;

const DAY = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];     // do majeur pentatonique
const NIGHT = [110, 130.81, 146.83, 164.81, 196, 220];          // la mineur, registre violoncelle

export function setMusicOn(v) {
  musicOn = v;
  try { localStorage.setItem(MUSIC_KEY, v ? "on" : "off"); } catch {}
  if (!v && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  lastTarget = -1;
}

function box(freq, t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
  o.connect(g).connect(master); o.start(t); o.stop(t + 1.5);
  const o2 = ctx.createOscillator(), g2 = ctx.createGain(); // harmonique cristalline
  o2.type = "sine"; o2.frequency.value = freq * 3;
  g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.08, t + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o2.connect(g2).connect(master); o2.start(t); o2.stop(t + 0.6);
}

function cello(freq, t, dur) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = "sawtooth"; o.frequency.value = freq;
  lfo.frequency.value = 5; lg.gain.value = freq * 0.006; lfo.connect(lg).connect(o.frequency); // vibrato
  f.type = "lowpass"; f.frequency.value = 900; f.Q.value = 0.7;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.5);
  g.gain.setValueAtTime(0.35, t + dur - 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(f).connect(g).connect(master);
  o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}

function schedule() {
  if (!ctx || !musicMode || !musicOn || muted || document.hidden) return;
  const now = ctx.currentTime;
  if (nextAt < now) nextAt = now + 0.1;
  while (nextAt < now + 0.5) {
    if (musicMode === "day") {
      step++;
      if (step % 16 !== 15 && Math.random() > 0.12) box(DAY[(step * 3 + Math.floor(Math.random() * 3)) % DAY.length], nextAt);
      nextAt += 0.62;
    } else {
      const i = Math.floor(Math.random() * NIGHT.length);
      const dur = 2.6 + Math.random() * 1.2;
      cello(NIGHT[i], nextAt, dur);
      if (Math.random() < 0.3) cello(NIGHT[(i + 2) % NIGHT.length] * 2, nextAt + dur * 0.5, dur * 0.7);
      nextAt += dur - 0.4;
    }
  }
}

/** mode : "day", "night" ou null (silence, ex. pendant les mini-jeux). */
export function setMusic(mode) {
  if (!ctx) return;
  if (!master) { master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); }
  const target = mode && musicOn && !muted ? (mode === "night" ? 0.1 : 0.07) : 0;
  if (mode === musicMode && target === lastTarget) return; // appelé à chaque image : rien à changer
  if (mode !== musicMode) { musicMode = mode; nextAt = 0; }
  lastTarget = target;
  master.gain.setTargetAtTime(target, ctx.currentTime, 0.8);
  if (!timer) timer = setInterval(schedule, 200);
}
