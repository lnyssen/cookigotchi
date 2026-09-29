"""Persistance de l'état entre sessions (JSON simple) : stats, XP, et horodatage
pour appliquer la dégradation en temps réel écoulée pendant que le jeu était fermé.
"""

import json
import os
import time

import config
from pet.evolution import Evolution
from pet.state import PetState


def save_state(pet_state, evolution):
    data = {
        "stats": pet_state.to_dict(),
        "xp": evolution.xp,
        "prestige": evolution.prestige,
        "saved_at": time.time(),
    }
    with open(config.SAVE_PATH, "w") as f:
        json.dump(data, f)


def load_state():
    """Renvoie (pet_state, evolution, secondes_ecoulees_depuis_la_derniere_sauvegarde, premiere_fois).

    Si aucune sauvegarde n'existe, démarre un nouvel état frais (0 seconde écoulée, premiere_fois=True).
    """
    if not os.path.exists(config.SAVE_PATH):
        return PetState(), Evolution(), 0, True

    with open(config.SAVE_PATH) as f:
        data = json.load(f)

    pet_state = PetState.from_dict(data.get("stats", {}))
    evolution = Evolution(xp=data.get("xp", 0), prestige=data.get("prestige", 0))
    elapsed = max(0, time.time() - data.get("saved_at", time.time()))
    return pet_state, evolution, elapsed, False
