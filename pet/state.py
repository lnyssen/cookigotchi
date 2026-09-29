"""Les 4 stats (Amour, Faim, Énergie, Fraîcheur), leur dégradation et leurs couplages.

Pur Python, aucune dépendance Pygame, pour rester portable vers MicroPython (ESP32).
La dégradation est en temps réel (basée sur le temps écoulé, pas sur les ticks de jeu)
pour que le personnage continue de se dessécher même quand le jeu est fermé.
"""

import config


def _clamp(value, low, high):
    return max(low, min(high, value))


class PetState:
    def __init__(self):
        self.stats = {name: config.STAT_START for name in config.STAT_NAMES}

    def _max_for(self, stat_name):
        if stat_name == "amour" and self.stats["fraicheur"] < config.FRAICHEUR_BASSE_SEUIL:
            return config.AMOUR_PLAFOND_SI_SEC
        return config.STAT_MAX

    def apply_elapsed(self, seconds, night=False):
        """Fait avancer la dégradation de `seconds` secondes (temps réel).

        La nuit, l'Énergie se restaure et les autres stats baissent plus lentement (doc).
        """
        minutes = seconds / 60
        faim_basse = self.stats["faim"] < config.FAIM_BASSE_SEUIL

        for stat_name in config.STAT_NAMES:
            if night and stat_name == "energie":
                new_value = self.stats[stat_name] + config.NUIT_ENERGIE_REGEN_PAR_MINUTE * minutes
                self.stats[stat_name] = _clamp(new_value, config.STAT_MIN, self._max_for(stat_name))
                continue

            rate = config.DECAY_PER_MINUTE[stat_name]
            if stat_name == "energie" and faim_basse:
                rate *= config.FAIM_BASSE_MULTIPLICATEUR_ENERGIE
            if night:
                rate *= config.NUIT_MULTIPLICATEUR_AUTRES_STATS
            new_value = self.stats[stat_name] - rate * minutes
            self.stats[stat_name] = _clamp(new_value, config.STAT_MIN, self._max_for(stat_name))

    def apply_action(self, stat_name, amount):
        """Augmente (ou diminue) une stat suite à une interaction (câlin, miam, ...)."""
        new_value = self.stats[stat_name] + amount
        self.stats[stat_name] = _clamp(new_value, config.STAT_MIN, self._max_for(stat_name))

    @property
    def is_sleepy(self):
        """Énergie basse -> s'endort seule et refuse de jouer (doc, cycle émotionnel)."""
        return self.stats["energie"] < config.ENERGIE_BASSE_SEUIL

    @property
    def is_sec(self):
        """Fraîcheur basse -> peau sèche (état visuel « sec »)."""
        return self.stats["fraicheur"] < config.FRAICHEUR_BASSE_SEUIL

    def to_dict(self):
        return dict(self.stats)

    @classmethod
    def from_dict(cls, data):
        pet = cls()
        for name in config.STAT_NAMES:
            pet.stats[name] = _clamp(data.get(name, config.STAT_START), config.STAT_MIN, config.STAT_MAX)
        return pet
