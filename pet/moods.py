"""Traduit les stats en humeur ambiante et renvoie le nom d'asset `<stade>_<humeur>.png`.

Pur Python, aucune dépendance Pygame. Les humeurs d'action (content, miam, jeu, dodo,
splash, amour) sont déclenchées par les boutons ailleurs, pas calculées ici.
"""

import config

# Set d'humeurs disponibles par stade (doc partie 2.C : le têtard n'a pas boudeur/jeu/amour...).
_STAGE_MOODS = {
    "tetard": {"paisible", "content", "miam", "dodo", "reclame", "sec"},
    "grenouillette": {"paisible", "content", "miam", "dodo", "reclame", "sec", "jeu", "amour", "boudeur"},
    "grenouille": {
        "paisible", "content", "miam", "dodo", "reclame", "sec",
        "jeu", "amour", "boudeur", "splash", "clin", "doree",
    },
}

# Repli si l'humeur n'existe pas pour ce stade (ex. le têtard n'a pas "boudeur" ni "splash").
_AMBIENT_FALLBACK = {
    "boudeur": "reclame",
    "splash": "content",
    "jeu": "content",
    "amour": "content",
}


def compute_mood(pet_state):
    """Humeur ambiante calculée depuis les stats (pas une humeur d'action)."""
    if pet_state.stats["fraicheur"] < config.SEC_SEUIL:
        return "sec"
    if any(value < config.RECLAME_SEUIL for value in pet_state.stats.values()):
        return "reclame"
    if any(value < config.BOUDEUR_SEUIL for value in pet_state.stats.values()):
        return "boudeur"
    return "paisible"


def asset_name(stage, mood):
    """Construit `<stade>_<humeur>`, avec repli en cascade si l'humeur n'existe pas à ce stade."""
    available = _STAGE_MOODS.get(stage, set())
    while mood not in available and mood in _AMBIENT_FALLBACK:
        mood = _AMBIENT_FALLBACK[mood]
    if mood not in available:
        mood = "paisible"
    return f"{stage}_{mood}"
