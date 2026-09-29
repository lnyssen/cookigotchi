# FrogGotchi *(nom de travail)* – Document de référence

*Compagnon grenouille, « entre les deux » : de l’attachement, des conséquences douces et toujours réversibles, jamais de game over. Ce document remplace l’ancienne version « cookie ».*

---

## PARTIE 1 – LE SCÉNARIO COMPLET

### Le pitch
Tu recueilles un têtard au bord d’un étang féérique et tu deviens sa nounou. Il se métamorphose, développe un petit caractère, réclame de l’attention et te le rend bien. Si on le néglige, il ne meurt pas : sa peau **se dessèche**, elle devient terne et craquelée, jusqu’à ce qu’un peu d’eau et de soins la ré-attendrissent. Le but n’est pas de survivre, c’est de l’accompagner jusqu’à son plus bel état : la grenouille dorée.

### L’univers
Un étang douillet et minuscule : nénuphars, roseaux, reflets d’eau, lucioles à la nuit tombée. Ciel qui passe du vert tendre et du crème le jour au bleu-violet la nuit. Aucun ennemi, aucune violence. La seule tension, c’est le temps qui passe et les besoins qui montent.

### Le personnage
Une petite grenouille blob kawaï : corps rond, deux bosses sur la tête avec les yeux dedans, ventre clair, petits pieds. Sa personnalité se lit sur son visage et dans sa posture, jamais par du texte.

### L’arche de vie : la métamorphose (les 3 âges)
1. **Têtard (bébé).** Une petite goutte à grande queue, tout en rondeur, qui nage sur place. Fragile, dort beaucoup, réclame surtout des câlins. Silhouette différente de l’adulte, c’est voulu : la croissance se voit vraiment.
2. **Grenouillette (enfant).** Les pattes apparaissent, la queue régresse. Curieuse, joueuse, elle veut le mini-jeu et se dessèche vite au soleil. Phase la plus vivante.
3. **Grenouille (grande).** Forme adulte, gourmande et un brin coquine. Caprices plus marqués, mais la plus attachante et la plus récompensante à soigner.

Chaque passage est un moment scénarisé (petite métamorphose animée).

**Choix arrêté : métamorphose complète.** Trois silhouettes de corps distinctes (têtard, grenouillette, grenouille), gabarits fournis (`tetard_base.svg`, `grenouillette_base.svg`, `grenouille_base.svg`). Le plan d’expressions par stade, qui borne la quantité de dessin, est détaillé en partie 2, section C.

### Le cycle émotionnel : le cœur du jeu
Quatre besoins : **Amour, Faim, Énergie, Fraîcheur** (l’ex-Propreté, rebaptisée car pour une grenouille l’eau est vitale, pas juste propre). Ils se dégradent et s’influencent :
- Faim basse → l’Énergie chute plus vite.
- Fraîcheur basse → la peau sèche, l’Amour plafonne (moins câline quand elle est toute sèche).
- Énergie basse → elle s’endort seule et refuse de jouer.

Bien traitée, la grenouille est luisante, la peau souple, les yeux vifs. Négligée, elle glisse par étapes douces : boudeuse, puis terne, puis **desséchée**. Rien n’est irréversible : l’eau et les soins la ramènent vers la fraîcheur, simplement plus lentement que la chute.

### L’état signature : « desséchée »
Au lieu de mourir, une grenouille longtemps délaissée se dessèche : teinte grisée, peau craquelée, yeux ternes. C’est la métaphore juste, une grenouille au sec, ça se ranime dès qu’on l’hydrate. Une baignade et quelques câlins, la couleur revient, les craquelures se referment. On culpabilise juste ce qu’il faut, puis on savoure le retour à la fraîcheur.

### Le but long terme (sans couperet)
Pas de fin punitive, mais une ascension : une grenouille menée à l’âge adulte et choyée sur la durée devient **dorée**, façon prince grenouille, avec une petite couronne. Elle peut alors fonder sa propre mare, un mode prestige qui relance un cycle avec un bonus cosmétique. On tire le joueur vers le haut.

### Le rythme d’une journée
- **Jour** (fond vert et crème) : les besoins vivent leur vie, la grenouille sollicite, joue, gobe des mouches, se dessèche au soleil.
- **Nuit** (étang étoilé, lucioles, bouton Lune) : l’Énergie se restaure, les autres besoins baissent plus lentement. Moment calme, respiration du jeu.

### Les moments-clés scénarisés
1. **La rencontre** : premier lancement, tu découvres le têtard qui ouvre les yeux et te regarde.
2. **Le caprice** : de temps en temps elle réclame un besoin précis (une pensée au-dessus de sa tête). Y répondre juste donne un bonus et un grand sourire.
3. **L’appel à l’aide** : un besoin passe sous un seuil, elle te sollicite (icône qui pulse, bip).
4. **La métamorphose** : le passage d’un âge à l’autre, célébré (éclaboussures, étincelles).
5. **Le retour après négligence** : tu reviens, elle est desséchée, tu l’hydrates, elle redevient fraîche. Boucle émotionnelle complète en une session.
6. **La grenouille dorée** : la consécration des joueurs assidus.

---

## PARTIE 2 – CE QU’IL FAUT PRÉPARER DANS FIGMA

### A. Réglages du fichier
- **Frame de rendu** : 320 × 240 px exactement (paysage). Cadre de vérité pour composer l’UI en contexte.
- **Repères** : marque les zones fixes (bande de jauges en haut, dock en bas, engrenage en haut à droite).
- **Variables de couleur** (voir B) : à créer avant tout le reste.

### B. La palette en variables
Une variable par couleur, nommée **comme dans le code** :
- `rose_amour`, `jaune_faim`, `vert_energie`, `bleu_fraicheur` (les 4 jauges)
- `vert_grenouille` (corps), `creme_ventre`
- `creme_jour`, `nuit_violet`, `bleu_eau` (fonds et eau)
- `blanc_ui`, `verre_bord` (faux-verre)

Relève les hex une seule fois depuis le Dev Mode : source unique côté `config.py`.

### C. Le personnage (le plus important)
**Un seul composant à variantes**, propriété « état ». Règles non négociables anti-saut :
- **Boîte englobante identique** : chaque état exporté dans une frame de même taille (160 × 160 px).
- **Même point d’ancrage** : le corps centré au même endroit partout. Si les yeux bougent, c’est le regard, pas le cadre.
- **Export** : PNG transparent, à la plus grande taille cible nette (≈ 160 px). Les paliers de taille sont dérivés au build, ne réexporte pas à la main.

Base fournie : le fichier `grenouille_base.svg` (calques `Corps`, `Ventre`, `Visage` › `Yeux`, `Bouche`, `Rougeurs`). Principe : ne touche jamais au corps, duplique `Visage`, change yeux et bouche.

**États à dessiner** (noms de fichiers suggérés) :

*Idle et variations*
- `grenouille_paisible.png` – repos
- `clin_d_oeil.png` – clignement, alterné par code

*Humeurs d’action (boutons)*
- `grenouille_content.png` – HEUREUX (câlin)
- `coeur.png` – amour intense / cœurs
- `grenouille_miam.png` – MIAM (gobe une mouche, langue qui sort)
- `grenouille_jeu.png` – JEU
- `dodo.png` – DODO
- `grenouille_splash.png` – BAIGNADE (sous l’eau / la pluie)

*Humeurs ambiantes (calculées depuis les stats)*
- `grenouille_reclame.png` – RÉCLAME (yeux implorants)
- `grenouille_boudeur.png` – BOUDEUR
- `grenouille_sec.png` – DESSÉCHÉE (grisée, craquelée, ternes ; le seul état où le corps change)

*État spécial*
- `grenouille_doree.png` – DORÉE (prince grenouille, petite couronne)

**Plan d’expressions par stade (métamorphose).** La liste ci-dessus est le set complet de l’adulte. Le bébé et l’enfant en ont une part réduite : un têtard n’a pas la palette émotionnelle d’un adulte, et ça borne la quantité de dessin. Convention de nommage : `<stade>_<humeur>.png` (ex. `tetard_paisible.png`, `grenouillette_jeu.png`, `grenouille_doree.png`). Le visage garde le même vocabulaire d’un stade à l’autre, seul le corps change.

- **Têtard (~6)** : paisible, content, miam, dodo, réclame, sec. Il dort, mange, câline, réclame. C’est tout, et c’est cohérent avec un bébé.
- **Grenouillette (~9)** : les 6 du têtard + jeu, amour, boudeur. La palette s’étoffe avec la curiosité.
- **Grenouille (~11 + dorée)** : le set complet listé ci-dessus, plus l’état doré réservé à ce stade.

Total : environ 26 sprites de personnage au lieu de 33, sans rien perdre du sens narratif. Les corps de base sont fournis : `tetard_base.svg`, `grenouillette_base.svg`, `grenouille_base.svg`.

### D. Ce qui est fait par CODE, pas en asset
- **Bouncing / respiration** : étirement et lévitation, gérés par le moteur. Aucun PNG.
- **Clignement** : alternance `paisible` / `clin_d_oeil`.
- **Desséchée** : garde un vrai dessin (les craquelures ne se simulent pas bien par code).

### E. L’UI
- **Dock, 6 boutons ronds, icônes seules** : Câlin (cœur), Miam (mouche), Jeu (manette), Dodo (lune), **Baignade (goutte / vague, ex-douche)**, Nounou (biberon).
- **Engrenage** (son) en haut à droite.
- **4 jauges** en haut : Amour, Faim, Énergie, Fraîcheur. Barres de progression, pas de texte, une couleur chacune.
- **Faux-verre léger** : ne cuis pas le flou dans un PNG (le fond change). Fournis une forme semi-transparente, un liseré clair, un reflet. Le code assemble.

### F. Les fonds
- `fond_jour.png` – vert et crème, ambiance étang
- `fond_nuit.png` – étoilé, lucioles (ondulation animée par code)
- `fond_minijeu.png` – variante pour le mini-jeu

### G. Mini-jeu et particules
- Idée thématique : « gobe-mouches », la grenouille attrape mouches et lucioles à la langue (au lieu d’étoiles). Assets : `mouche.png`, `luciole.png`, plus `coeur_pluie.png`.
- Effets : `eclaboussure` (baignade), `note_zzz` (dodo), `cadeau_coeur` (câlin), `etincelle` (métamorphose), `gouttelette_seche` (désséchée).
- Garde-les petits et à contour net, ils s’affichent en multiples.

### H. Customisation (plus tard)
Petits accessoires transparents (chapeaux, couronne, nœuds) posés sur le personnage, même point d’ancrage que le corps.

### I. Conventions d’export
- **Format** : PNG transparent.
- **Nommage** : minuscules, sans accent ni espace, exactement comme ci-dessus.
- **Dossiers** : `perso/`, `ui/`, `fonds/`, `fx/`.

### J. Les 2 pièges techniques M5Stack, à intégrer dès le dessin
1. **Écran 16 bits (RGB565).** L’afficheur ne rend pas les 16 millions de couleurs mais environ 65 000. Tes verts et pastels doux vont « bander » (bandes visibles au lieu d’un fondu). Prévois contours francs, aplats assumés, dégradés courts plutôt que de longues transitions.
2. **Lisibilité à petite taille.** À l’échelle réelle (grenouille de ~100 à 155 px, icônes de quelques dizaines de pixels), les traits fins deviennent illisibles. Teste tes assets à 100 % dans la frame 320 × 240, jamais zoomé.

---

*Prochaines étapes possibles : la machine à états (humeurs, seuils, transitions) en Python portable ; l’équilibrage chiffré des 4 jauges ; ou l’intégration du bouton Baignade dans le code.*
