// Icônes vectorielles dessinées sur une grille 24x24 : nettes à toutes les tailles (écran
// haute densité), même trait brun que le reste de l'UI. Chaque icône = liste de calques
// { d: chemin SVG, fill?, stroke? }.

let INK = "#1d1b22"; // même encre que les contours des grenouilles (le thème peut la changer)
export function setInk(c) { INK = c; }

const ICONS = {
  // Câlin / Amour
  calin: [
    { d: "M12 20.2C6.2 16.3 3 13 3 9.2A4.6 4.6 0 0 1 12 7.4A4.6 4.6 0 0 1 21 9.2C21 13 17.8 16.3 12 20.2Z", fill: "#f58fab", stroke: true },
    { d: "M7.4 8.6A2 2 0 0 1 9.4 7.2", stroke: "#fff", width: 1.6 },
  ],
  // Miam / Faim : cookie croqué
  miam: [
    { d: "M20.6 10.2A9 9 0 1 1 13.8 3.2A3.2 3.2 0 0 0 17 7.2A3 3 0 0 0 20.6 10.2Z", fill: "#e8b46a", stroke: true },
    { d: "M8.3 9.3a1.3 1.3 0 1 0 0.01 0Z M13.2 13.6a1.3 1.3 0 1 0 0.01 0Z M8.8 15.4a1.2 1.2 0 1 0 0.01 0Z M16.6 15.9a1 1 0 1 0 0.01 0Z", fill: "ink" },
  ],
  // Jeu : une manette
  jeu: [
    { d: "M7.2 7.5H16.8C19.6 7.5 21.3 9.8 21.8 12.6L22.4 16.2C22.8 18.4 21.2 20 19.4 19.2C18 18.6 17.1 16.9 16 16H8C6.9 16.9 6 18.6 4.6 19.2C2.8 20 1.2 18.4 1.6 16.2L2.2 12.6C2.7 9.8 4.4 7.5 7.2 7.5Z", fill: "#f4f0ea", stroke: true },
    { d: "M7.3 10.4V14.4M5.3 12.4H9.3", stroke: true, width: 2.2 },
    { d: "M16.4 11.2a1.2 1.2 0 1 0 0.01 0Z", fill: "#a3354a", stroke: true, width: 1.2 },
    { d: "M18.4 13.6a1.2 1.2 0 1 0 0.01 0Z", fill: "#6c5a9c", stroke: true, width: 1.2 },
  ],
  // Mouche (le mini-jeu gobe-mouches)
  mouche: [
    { d: "M11 10.5C8 5.2 3.4 6.4 4.2 9.4C4.9 12 8.4 12.2 11 10.5Z M13 10.5C16 5.2 20.6 6.4 19.8 9.4C19.1 12 15.6 12.2 13 10.5Z", fill: "#ffffff", stroke: true },
    { d: "M12 9.2C14.6 9.2 16 11.8 16 14.4C16 17.4 14.2 19.6 12 19.6C9.8 19.6 8 17.4 8 14.4C8 11.8 9.4 9.2 12 9.2Z", fill: "ink", stroke: true },
    { d: "M8.4 14h7.2 M9 16.8h6", stroke: "#8a7a70", width: 1.2 },
  ],
  // Dodo / Énergie : lune + petite étoile
  dodo: [
    { d: "M19.8 14.6A8.4 8.4 0 1 1 9.6 3.8A6.8 6.8 0 0 0 19.8 14.6Z", fill: "#ffe27a", stroke: true },
    { d: "M17.5 3.2l0.8 1.7 1.7 0.8-1.7 0.8-0.8 1.7-0.8-1.7-1.7-0.8 1.7-0.8Z", fill: "#fff", stroke: true, width: 1.2 },
  ],
  // Baignade / Fraîcheur : goutte
  baignade: [
    { d: "M12 2.8C12 2.8 5 10.6 5 14.8A7 7 0 0 0 19 14.8C19 10.6 12 2.8 12 2.8Z", fill: "#5dbde6", stroke: true },
    { d: "M8.6 14.6A3.4 3.4 0 0 0 11 17.8", stroke: "#fff", width: 1.8 },
  ],
  // Nounou : petite maison (il t'attend à la maison)
  nounou: [
    { d: "M5 11.2V19.4A1.2 1.2 0 0 0 6.2 20.6H17.8A1.2 1.2 0 0 0 19 19.4V11.2", fill: "#fff", stroke: true },
    { d: "M2.8 12.2L12 4L21.2 12.2", stroke: true, width: 2.4 },
    { d: "M9.8 20.6V16.2A2.2 2.2 0 0 1 14.2 16.2V20.6Z", fill: "#f58fab", stroke: true },
  ],
  // Réglages : engrenage
  reglages: [
    { d: gearPath(12, 12, 9.2, 7, 8), fill: "#fff", stroke: true },
    { d: "M12 9a3 3 0 1 0 0.01 0Z", fill: "#d6d1ff", stroke: true },
  ],
  // Famille : deux cœurs
  famille: [
    { d: "M8.6 17.6C4.4 14.8 2.2 12.4 2.2 9.8A3.3 3.3 0 0 1 8.6 8.5A3.3 3.3 0 0 1 15 9.8C15 12.4 12.8 14.8 8.6 17.6Z", fill: "#f58fab", stroke: true },
    { d: "M16.2 20.8C13.2 18.8 11.6 17.1 11.6 15.2A2.4 2.4 0 0 1 16.2 14.3A2.4 2.4 0 0 1 20.8 15.2C20.8 17.1 19.2 18.8 16.2 20.8Z", fill: "#ffd84a", stroke: true },
  ],
  // Grimoire : livre relié avec une lune
  grimoire: [
    { d: "M4.5 5.5A2 2 0 0 1 6.5 3.5H18.5V18.5H6.5A2 2 0 0 0 4.5 20.5Z", fill: "#6c5a9c", stroke: true },
    { d: "M4.5 20.5A2 2 0 0 1 6.5 18.5H18.5V21.5H6.5A2 2 0 0 1 4.5 20.5Z", fill: "#f4f0ea", stroke: true },
    { d: "M14.2 8.2A3.4 3.4 0 1 0 14.2 14.2A2.7 2.7 0 1 1 14.2 8.2Z", fill: "#e6c25a", stroke: true, width: 1.3 },
  ],
  // Son coupé / activé (menu réglages)
  son: [
    { d: "M4 9.5h3.4L12 5.5v13l-4.6-4H4Z", fill: "#fff", stroke: true },
    { d: "M15.2 9a4.2 4.2 0 0 1 0 6 M17.8 6.6a7.6 7.6 0 0 1 0 10.8", stroke: true },
  ],
  muet: [
    { d: "M4 9.5h3.4L12 5.5v13l-4.6-4H4Z", fill: "#fff", stroke: true },
    { d: "M15.5 9.5l5 5 M20.5 9.5l-5 5", stroke: true },
  ],
};

// Aliases : les jauges reprennent l'icône de leur bouton de soin.
ICONS.amour = ICONS.calin;
ICONS.faim = ICONS.miam;
ICONS.energie = ICONS.dodo;
ICONS.fraicheur = ICONS.baignade;

function gearPath(cx, cy, rOut, rIn, teeth) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    for (const [da, r] of [[-0.3, rIn], [-0.18, rOut], [0.18, rOut], [0.3, rIn]]) {
      pts.push([cx + Math.cos(a + da * step * 1.6) * r, cy + Math.sin(a + da * step * 1.6) * r]);
    }
  }
  return "M" + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z";
}

const cache = {};
function compiled(name) {
  if (!cache[name]) cache[name] = ICONS[name].map((l) => ({ ...l, path: new Path2D(l.d) }));
  return cache[name];
}

/** Dessine l'icône `name` centrée en (cx, cy), de côté `size` px logiques. */
export function drawIcon(ctx, name, cx, cy, size) {
  if (!ICONS[name]) return;
  const s = size / 24;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const layer of compiled(name)) {
    if (layer.fill) { ctx.fillStyle = layer.fill === "ink" ? INK : layer.fill; ctx.fill(layer.path); }
    if (layer.stroke) {
      ctx.strokeStyle = layer.stroke === true ? INK : layer.stroke;
      // Trait visuellement constant (~1.6px logique) quelle que soit la taille de l'icône.
      ctx.lineWidth = (layer.width ?? 2) * Math.max(0.8, Math.min(1.25, 20 / size));
      ctx.stroke(layer.path);
    }
  }
  ctx.restore();
}
