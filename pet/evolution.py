"""Logique XP/niveau : passage têtard -> grenouillette -> grenouille, état doré, mode prestige.

Pur Python, aucune dépendance Pygame.
"""

import config


class Evolution:
    def __init__(self, xp=0, prestige=0):
        self.xp = xp
        self.prestige = prestige  # nombre de fois où le cycle a été relancé (boîte à biscuits/mare)

    @property
    def level(self):
        return 1 + self.xp // config.XP_PER_LEVEL

    @property
    def stage(self):
        level = self.level
        stage = config.AGES[0]
        for age, threshold in config.STAGE_LEVEL_THRESHOLDS:
            if level >= threshold:
                stage = age
        return stage

    def add_xp(self, amount):
        """Ajoute de l'XP, renvoie True si ça déclenche une métamorphose (changement de stade)."""
        old_stage = self.stage
        self.xp += amount
        return self.stage != old_stage

    def is_doree_eligible(self, pet_state):
        """État doré : stade adulte, niveau élevé, et choyée sur la durée (stats hautes)."""
        if self.stage != config.AGES[-1] or self.level < config.DOREE_NIVEAU_MIN:
            return False
        return all(value >= config.DOREE_STAT_MIN for value in pet_state.stats.values())

    def start_prestige(self):
        """Relance un cycle avec un bonus cosmétique (mode prestige, sans couperet)."""
        self.prestige += 1
        self.xp = 0
