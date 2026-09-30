// Cache hors-ligne : tout le jeu est mis en cache à l'installation.
// Réseau d'abord (les mises à jour arrivent dès qu'il y a du réseau), cache en secours hors-ligne.
const VERSION = "cookigotchi-v33";
const FILES = [
  "./",
  "assets/sprites/grenouille_amour.png",
  "assets/sprites/grenouille_boudeur.png",
  "assets/sprites/grenouille_clin.png",
  "assets/sprites/grenouille_content.png",
  "assets/sprites/grenouille_dodo.png",
  "assets/sprites/grenouille_doree.png",
  "assets/sprites/grenouille_jeu.png",
  "assets/sprites/grenouille_miam.png",
  "assets/sprites/grenouille_paisible.png",
  "assets/sprites/grenouille_reclame.png",
  "assets/sprites/grenouille_sec.png",
  "assets/sprites/grenouille_splash.png",
  "assets/sprites/grenouillette_amour.png",
  "assets/sprites/grenouillette_boudeur.png",
  "assets/sprites/grenouillette_content.png",
  "assets/sprites/grenouillette_dodo.png",
  "assets/sprites/grenouillette_jeu.png",
  "assets/sprites/grenouillette_miam.png",
  "assets/sprites/grenouillette_paisible.png",
  "assets/sprites/grenouillette_reclame.png",
  "assets/sprites/grenouillette_sec.png",
  "assets/sprites/tetard_content.png",
  "assets/sprites/tetard_dodo.png",
  "assets/sprites/tetard_miam.png",
  "assets/sprites/tetard_paisible.png",
  "assets/sprites/tetard_reclame.png",
  "assets/sprites/tetard_sec.png",
  "assets/decor/crepuscule_avant.svg",
  "assets/decor/crepuscule_fond.svg",
  "assets/decor/crepuscule_nuages.svg",
  "assets/decor/hiver_avant.svg",
  "assets/decor/hiver_fond.svg",
  "assets/decor/hiver_nuages.svg",
  "assets/decor/jour_avant.svg",
  "assets/decor/jour_fond.svg",
  "assets/decor/jour_nuages.svg",
  "assets/decor/nuit_avant.svg",
  "assets/decor/nuit_fond.svg",
  "assets/decor/nuit_nuages.svg",
  "assets/ombeline/amour.png",
  "assets/ombeline/boudeur.png",
  "assets/ombeline/clin.png",
  "assets/ombeline/content.png",
  "assets/ombeline/dodo.png",
  "assets/ombeline/doree.png",
  "assets/ombeline/fatiguee.png",
  "assets/ombeline/jeu.png",
  "assets/ombeline/miam.png",
  "assets/ombeline/paisible.png",
  "assets/ombeline/reclame.png",
  "assets/ombeline/robe_boudeur.png",
  "assets/ombeline/robe_clin.png",
  "assets/ombeline/robe_content.png",
  "assets/ombeline/robe_dodo.png",
  "assets/ombeline/robe_fatiguee.png",
  "assets/ombeline/robe_jeu.png",
  "assets/ombeline/robe_miam.png",
  "assets/ombeline/robe_paisible.png",
  "assets/ombeline/robe_reclame.png",
  "assets/ombeline/robe_sourire_a.png",
  "assets/ombeline/robe_sourire_b.png",
  "assets/ombeline/robe_sourire_c.png",
  "assets/ombeline/robe_sourire_d.png",
  "assets/ombeline/robe_splash.png",
  "assets/ombeline/sourire_a.png",
  "assets/ombeline/sourire_b.png",
  "assets/ombeline/sourire_c.png",
  "assets/ombeline/sourire_d.png",
  "assets/ombeline/splash.png",
  "codes.json",
  "fonts/fredoka-latin.woff2",
  "fonts/grenze-gotisch.woff2",
  "fonts/special-elite.woff2",
  "guide.html",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "index.html",
  "js/audio.js",
  "js/config.js",
  "js/game.js",
  "js/icons.js",
  "js/pet.js",
  "js/progress.js",
  "js/theme.js",
  "lettres.json",
  "manifest.webmanifest",
  "perso.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (e.request.url.startsWith("https://api.open-meteo.com/")) return; // météo : toujours en direct, jamais en cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

// Rappels (Web Push) : un petit mot doux quand la joueuse n'est pas encore passée à la mare.
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(data.title || "Cookigotchi", {
    body: data.body || "Ta grenouille t'attend à la mare.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: "rappel-mare",
    lang: "fr",
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});
