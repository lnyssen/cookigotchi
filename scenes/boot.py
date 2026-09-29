"""Scène de naissance : première ouverture, le têtard ouvre les yeux et te regarde.

Court, muet, marquant (doc partie 1) : pas de texte, juste une apparition en fondu.
"""

import pygame

import assets
import config
from .base import Scene

_FADE_IN_DURATION = 0.8
_TOTAL_DURATION = 2.5


class BootScene(Scene):
    def __init__(self, pet_state, evolution):
        self.pet = pet_state
        self.evolution = evolution
        self.timer = 0

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            self._finish()

    def update(self, dt):
        self.timer += dt
        if self.timer >= _TOTAL_DURATION:
            self._finish()

    def _finish(self):
        if self.next_scene is None:
            from .day import DayScene
            self.next_scene = DayScene(self.pet, self.evolution)

    def draw(self, surface):
        surface.fill(config.hex_to_rgb(config.COLORS["creme_jour"]))
        sprite = assets.perso.get("tetard_paisible")
        if not sprite:
            return

        target_height = config.AGE_SIZES_PX["tetard"]
        scale = target_height / sprite.get_height()
        target_width = int(sprite.get_width() * scale)
        scaled = config.scale_smooth(sprite, (target_width, target_height)).copy()

        fade = min(1.0, self.timer / _FADE_IN_DURATION)
        scaled.set_alpha(int(255 * fade))

        x = (config.SCREEN_WIDTH - target_width) // 2
        y = config.CHARACTER_BOTTOM_Y - target_height
        surface.blit(scaled, (x, y))
