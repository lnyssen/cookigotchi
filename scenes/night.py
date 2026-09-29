"""Cycle nuit : détection de l'heure + fond étoilé animé.

Pas un Scene séparé : la nuit est un mode de la scène jour (même dock, mêmes
mécaniques), seuls le décor et le rythme de dégradation changent (doc partie 1).
Pas de fond_nuit.png fourni (doc 2.F) : étoiles scintillantes dessinées en attendant.
"""

import math
import random
import time

import pygame

import config

_rng = random.Random(42)
_STARS = [
    (_rng.randint(10, config.SCREEN_WIDTH - 10), _rng.randint(10, 170), _rng.uniform(0, 6.28))
    for _ in range(18)
]


def is_night(local_time=None):
    hour = (local_time or time.localtime()).tm_hour
    start, end = config.NUIT_HEURE_DEBUT, config.NUIT_HEURE_FIN
    if start > end:  # la plage traverse minuit (ex. 20h -> 6h)
        return hour >= start or hour < end
    return start <= hour < end


def draw_background(surface, t):
    surface.fill(config.hex_to_rgb(config.COLORS["nuit_violet"]))
    for x, y, phase in _STARS:
        alpha = max(50, min(255, int(150 + 105 * math.sin(t * 1.5 + phase))))
        star = pygame.Surface((3, 3), pygame.SRCALPHA)
        pygame.draw.circle(star, (255, 255, 255, alpha), (1, 1), 1)
        surface.blit(star, (x, y))
