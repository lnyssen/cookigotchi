# FrogGotchi — Brief de direction créative

*Référence pour toute décision de design, de texte ou de gameplay. Si une idée contredit ce brief, c'est un choix conscient à valider, pas un accident.*

## Le projet

**FrogGotchi** est un Tamagotchi de grenouille, installé comme appli (PWA) sur un téléphone Samsung. On part d'un œuf, qui devient têtard, puis grenouillette, puis grenouille, en temps réel sur plusieurs jours. Les grenouilles adultes tombent amoureuses, pondent, et les générations se succèdent (inspiration : Tamagotchi Paradise).

- **Public :** une fille de 11 ans. Elle n'est plus une petite, mais elle aime encore le mignon. Elle joue par petites sessions, plusieurs fois par jour, entre l'école et le soir.
- **Objectif :** qu'elle s'attache à sa grenouille, revienne chaque jour avec plaisir, et soit fière de sa famille de grenouilles sur la durée, sans jamais se sentir coupable ou punie.

## Les 4 axes

| Axe | Position | Pourquoi |
|---|---|---|
| **Ton** | **Complice** | Chaleureux et naturel, comme une amie qui lui parle. À 11 ans, le ton bébé la vexe et le ton appli la laisse froide. |
| **Esthétique** | **Maximalisme maîtrisé** | Un petit monde riche et vivant, mais où chaque élément est dessiné avec soin et où la grenouille reste la star. |
| **Relation** | **Compagnon** | C'est elle l'héroïne. La grenouille compte sur elle, et le jeu l'accompagne sans jamais la gronder. |
| **Émotion** | **Qui touche** | Les moments clés (naissance, évolution, coup de cœur, départ à la Grande Mare) sont mis en scène pour qu'elle ressente quelque chose. |

## Synthèse

FrogGotchi est un petit monde de mare qu'on a envie de visiter, pas une appli qu'on consulte. L'écran est riche : collines, roseaux, lotus, papillons le jour, lucioles la nuit. Mais tout sert l'ambiance, et la grenouille reste toujours au centre et lisible. Les textes sont courts et chaleureux, écrits comme une complice : ils nomment la grenouille par son prénom plutôt que « il », et ne font jamais la morale. Les besoins se lisent d'un coup d'œil, par des jauges et une bulle au-dessus de la tête, sans mode d'emploi. Les grands moments prennent leur temps : une naissance, une évolution, une rencontre ou un départ ont chacun leur mise en scène, leur son et leur pause. La négligence a des conséquences visibles mais toujours réversibles (sèche, boudeuse, cacas), et le soin est toujours récompensé plus fort que l'oubli n'est puni.

## Ce qui en découle, concrètement

- **Une seule encre** (`#3a4a30`, celle des contours Figma) pour tous les traits. Plus un élément est gros dans le décor, plus son trait est épais.
- **Une couleur par besoin**, la même sur la jauge, le bouton et la bulle : rose pour l'amour, jaune pour la faim, lavande pour l'énergie, bleu pour la propreté.
- **Des volumes doux** : boutons « bonbon » avec un rebord, ombres teintées de vert, jamais de gris ni de noir purs. Un léger grain papier.
- **Le décor vit** (vent dans les roseaux, ronds dans l'eau, faune), mais rien ne bouge à la même vitesse que la grenouille, pour ne pas lui voler la vedette.
- **Des textes courts, au présent, avec le prénom** : « Pistache a faim », « Menthe dort, reviens demain matin ».
- **Les mini-jeux sont vraiment jouables** : de la visée, des combos, des étoiles et un record. Ils ont de la profondeur sans devenir punitifs.
- **Les moments forts ont un son, une vibration et une pause** : aucun ne passe en une frame.

## Références

- **Tamagotchi Paradise (Bandai, 2025)** : les générations, les partenaires, la fierté de l'arbre familial, et le monde qu'on explore autour de l'animal.
- **Ta planche Figma « Sprites Grenouille »** : elle fixe le trait, les joues roses et la rondeur. Tout le reste s'aligne dessus.
- *À compléter si tu as d'autres références (jeux, illustrateurs, applis que ta fille adore).*

## Ce qu'on refuse

- **Pas de mort ni de game over.** Au pire, la grenouille est sèche ou boudeuse, et tout se soigne.
- **Pas de culpabilisation** : pas de « tu l'as abandonnée », pas de séries de jours perdues, pas de notification qui fait peur.
- **Pas de ton bébé** (« Coucou mon petit chou ! ») **ni de ton appli froide** (« Action impossible »).
- **Pas d'achats, de pubs ou de monnaie virtuelle à acheter.**
- **Pas de contour brun ou noir** qui jure avec les sprites, et pas de liseré blanc autour des personnages.
- **Pas d'interface plate et générique** : pas de boutons gris, pas d'icônes système, pas de listes façon tableur.
- **Pas d'écran surchargé** au point qu'on ne voit plus ce dont la grenouille a besoin.
- **Pas de texte long** : si ça ne tient pas sur une ligne, ça passe par une image.

## Questions ouvertes

1. **Choisir le prénom** : ta fille devrait-elle pouvoir nommer elle-même sa grenouille à l'éclosion, plutôt qu'avoir un prénom tiré au hasard ? Ça colle au positionnement « compagnon ».
2. **Pronom** : faut-il écrire « il », « elle », ou toujours le prénom ? Toujours le prénom règle la question.
3. **Rappels** : des notifications quand la grenouille a besoin d'elle ? Elles sont utiles, mais peuvent culpabiliser. Si oui, avec un ton doux et plafonnées à 1 ou 2 par jour.
4. **Saisons et météo** (pluie, neige, fleurs de printemps) : c'est dans l'esprit maximaliste maîtrisé, à planifier.
5. **Rythme** : têtard pendant 1 jour, adulte au 4e jour, famille vers le 5e ou 6e jour. À ajuster après une semaine d'utilisation réelle.
