"""Scène jour : fond crème, personnage, HUD, dock (câlin, miam, jeu, dodo, douche/baignade, nounou)."""

import pygame

import assets
import audio
import config
from fx.particles import ParticleSystem
from pet import moods
from ui import hud
from ui.dock import Dock
from ui.gear_menu import GearMenu
from . import night
from .base import Scene

# Couleur de particules par bouton (doc 2.G : cadeau_coeur, miette, eclaboussure, note_zzz).
_ACTION_PARTICLE_COLOR = {
    "calin": "rose_amour",
    "miam": "jaune_faim",
    "dodo": "lavande_dodo",
    "baignade": "bleu_baignade",
}


class DayScene(Scene):
    def __init__(self, pet_state, evolution):
        self.dock = Dock()
        self.gear_menu = GearMenu()
        self.pet = pet_state
        self.evolution = evolution
        self._action_mood = None
        self._action_mood_timer = 0
        self.paused = False  # mode Nounou : pause générale, les stats ne se dégradent plus
        self.particles = ParticleSystem()
        self._celebrating = False
        self._celebration_timer = 0
        self._clock_t = 0
        self._last_ambient_mood = moods.compute_mood(self.pet)

    @property
    def stage(self):
        return self.evolution.stage

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            if self.gear_menu.handle_click(event.pos):
                return
            clicked = self.dock.get_clicked(event.pos)
            if clicked == "nounou":
                self.paused = not self.paused
            elif clicked:
                self._handle_button(clicked)

    def _handle_button(self, button_name):
        if button_name == "jeu":
            if self.pet.is_sleepy:
                # Énergie basse -> refuse de jouer (doc, cycle émotionnel)
                self._action_mood = "dodo"
                self._action_mood_timer = config.ACTION_MOOD_DURATION
                audio.play("dodo")
                return
            audio.play("jeu")
            from .minigame import MinigameScene
            self.next_scene = MinigameScene(self.pet, self.evolution, return_to=self)
            return

        effect = config.ACTION_EFFECTS.get(button_name)
        if effect is None:
            print(f"Bouton '{button_name}' : pas encore implémenté")
            return
        stat_name, amount, mood = effect
        self.pet.apply_action(stat_name, amount)
        self._action_mood = mood
        self._action_mood_timer = config.ACTION_MOOD_DURATION
        audio.play(button_name)  # "calin"/"miam"/"dodo"/"baignade" == noms des sons

        cx, cy = self._character_center()
        color = _ACTION_PARTICLE_COLOR.get(button_name, "trait_sombre")
        self.particles.spawn_burst(cx, cy, config.COLORS[color], count=8, speed=45, lifetime=0.6, radius=3)

        if self.evolution.add_xp(config.ACTION_XP):
            self._start_celebration()

    def _start_celebration(self):
        self._celebrating = True
        self._celebration_timer = 1.2
        audio.play("niveau")
        cx, cy = self._character_center()
        self.particles.spawn_burst(cx, cy, config.COLORS["blanc_ui"], count=20, speed=70, lifetime=1.0, radius=2)

    def _character_center(self):
        height = config.AGE_SIZES_PX[self.stage]
        return config.SCREEN_WIDTH // 2, config.CHARACTER_BOTTOM_Y - height // 2

    def update(self, dt):
        self._clock_t += dt
        if not self.paused:
            self.pet.apply_elapsed(dt, night=night.is_night())
        if self._action_mood:
            self._action_mood_timer -= dt
            if self._action_mood_timer <= 0:
                self._action_mood = None
        if self._celebrating:
            self._celebration_timer -= dt
            if self._celebration_timer <= 0:
                self._celebrating = False
        self.particles.update(dt)

        # Appel à l'aide : bip uniquement au moment où la stat passe sous le seuil (doc), pas en boucle.
        ambient = moods.compute_mood(self.pet)
        if ambient == "reclame" and self._last_ambient_mood != "reclame":
            audio.play("reclame")
        self._last_ambient_mood = ambient

    def draw(self, surface):
        if night.is_night():
            night.draw_background(surface, self._clock_t)
        else:
            surface.fill(config.hex_to_rgb(config.COLORS["creme_jour"]))
        self._draw_character(surface)
        self.particles.draw(surface)
        hud.draw(surface, self.pet.stats, level=self.evolution.level, xp=self.evolution.xp)
        self.dock.draw(surface, active={"nounou"} if self.paused else None)
        self.gear_menu.draw(surface)

    def _current_mood(self):
        if self._action_mood:
            return self._action_mood
        if self._celebrating:
            return "content"
        if self.evolution.is_doree_eligible(self.pet):
            return "doree"
        return moods.compute_mood(self.pet)

    def _draw_character(self, surface):
        sprite = assets.perso.get(moods.asset_name(self.stage, self._current_mood()))
        if not sprite:
            return
        target_height = config.AGE_SIZES_PX[self.stage]
        scale = target_height / sprite.get_height()
        target_width = int(sprite.get_width() * scale)
        scaled = config.scale_smooth(sprite, (target_width, target_height))
        x = (config.SCREEN_WIDTH - target_width) // 2
        y = config.CHARACTER_BOTTOM_Y - target_height
        surface.blit(scaled, (x, y))
