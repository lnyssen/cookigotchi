# Cookigotchi 🐸

Un petit Tamagotchi de grenouille, fait par un papa pour sa fille. Il s'installe comme une appli
sur un téléphone Android (PWA) et vit en temps réel : de l'œuf au têtard, puis grenouillette,
ado, adulte… jusqu'à l'amoureux, l'œuf de famille et les générations suivantes.

## Ce qu'il y a dedans

- **Une vraie vie de Tamagotchi** : faim, amour, énergie, propreté, sommeil la nuit, siestes,
  mode Nounou, et un **mode École** (congés scolaires belges FWB / Vlaanderen) qui met la mare
  en pause pendant les cours.
- **Ombeline**, une petite gardienne gothique originale dont le sourire grandit avec les soins.
- **3 mini-jeux** (Gobe-mouches, Sonate des bulles, Cache-cache), pièces, quêtes du jour,
  succès, boutique (chapeaux, garde-robe d'Ombeline, décor).
- **Lettres de papa** dans une bouteille, bouton « Écrire à papa », **codes secrets**.
- Thèmes **hybride** (par défaut), gothique et pastel ; saisons, météo, musique générée.
- **Rappels** doux par notification (Web Push, 1 par jour max).

Tout est en JavaScript sans framework ni build : `web/` se sert tel quel.

## Lancer en local

```bash
python3 -m http.server 5173 --directory web
```

Puis copie les fichiers d'exemple (ils sont privés et hors du dépôt) :

```bash
cp web/perso.example.json web/perso.json      # le prénom de la joueuse
cp web/lettres.example.json web/lettres.json  # les lettres de papa
cp web/codes.example.json web/codes.json      # les codes secrets
```

`?heure=14`, `?meteo=pluie|neige` et `?mois=10` forcent l'heure, la météo et la saison pour tester.

## Rappels (optionnel)

Les notifications passent par des fonctions Vercel (`web/api/`), un stockage Vercel Blob privé
et une tâche programmée (`web/vercel.json`). Variables d'environnement nécessaires :
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`.

## Le reste du dossier

- `BRIEF.md` : la direction créative (ton, esthétique, ce qu'on refuse).
- `main.py` et les dossiers Python : le tout premier prototype Pygame (320×240).
- `figma-svg-orig/` : les grenouilles exportées de Figma, avant traitement.

Les dessins des grenouilles sont de Laurent Nyssen.

## Météo

Le décor suit la météo réelle et le lever/coucher du soleil (API [Open-Meteo](https://open-meteo.com), sans clé).
Le lieu se règle dans `web/perso.json` : `"meteo": { "lat": 50.85, "lon": 4.35 }` (Bruxelles par défaut).
Pour tester : `?meteo=clair|nuages|pluie|orage|neige|brouillard`.

Le décor vient de `decor-svg-orig/` ; `python3 tools/decor_build.py` régénère les plans de `web/assets/decor/`.
