"""Mini-jeu gobe-mouches : la grenouille attrape mouches et lucioles à la langue.

Pas d'assets mouche.png/luciole.png fournis (doc 2.G) : dessinés en cercles colorés
en attendant les vrais sprites Figma.
"""

import random

import pygame

import audio
import config
from fx.particles import ParticleSystem
from .base import Scene


class _FallingObject:
    def __init__(self, x, y, speed, kind):
        self.x = x
        self.y = y
        self.speed = speed
        self.kind = kind  # "mouche" ou "luciole" (bonus, plus rare)
        self.radius = config.MINIGAME_OBJECT_RADIUS

    def rect(self):
        return pygame.Rect(self.x - self.radius, self.y - self.radius, self.radius * 2, self.radius * 2)


class MinigameScene(Scene):
    def __init__(self, pet_state, evolution, return_to):
        self.pet = pet_state
        self.evolution = evolution
        self.return_to = return_to
        self.objects = []
        self.score = 0
        self.timer = config.MINIGAME_DURATION
        self._spawn_timer = 0
        self.particles = ParticleSystem()
        self._rng = random.Random()
        self._font = pygame.font.SysFont("couriernewbold", 12) or pygame.font.Font(None, 14)

    def handle_event(self, event):
        if event.type != pygame.MOUSEBUTTONDOWN:
            return
        for obj in list(self.objects):
            if obj.rect().collidepoint(event.pos):
                self._catch(obj)
                break

    def _catch(self, obj):
        self.objects.remove(obj)
        points = 3 if obj.kind == "luciole" else 1
        self.score += points
        audio.play("jeu")
        color_key = "bleu_fraicheur" if obj.kind == "luciole" else "vert_energie"
        self.particles.spawn_burst(obj.x, obj.y, config.COLORS[color_key], count=6, speed=40, lifetime=0.4, radius=2)

    def update(self, dt):
        self.timer -= dt
        self._spawn_timer -= dt
        if self._spawn_timer <= 0:
            self._spawn()
            self._spawn_timer = config.MINIGAME_SPAWN_INTERVAL

        for obj in list(self.objects):
            obj.y += obj.speed * dt
            if obj.y - obj.radius > config.SCREEN_HEIGHT:
                self.objects.remove(obj)

        self.particles.update(dt)

        if self.timer <= 0:
            self._finish()

    def _spawn(self):
        x = self._rng.randint(20, config.SCREEN_WIDTH - 20)
        speed = self._rng.uniform(*config.MINIGAME_FALL_SPEED_RANGE)
        kind = "luciole" if self._rng.random() < config.MINIGAME_LUCIOLE_CHANCE else "mouche"
        self.objects.append(_FallingObject(x, -10, speed, kind))

    def _finish(self):
        if self.next_scene is not None:
            return
        self.pet.apply_action("faim", self.score * config.MINIGAME_REWARD_FAIM_PAR_POINT)
        self.pet.apply_action("amour", self.score * config.MINIGAME_REWARD_AMOUR_PAR_POINT)
        metamorphosed = self.evolution.add_xp(self.score * config.MINIGAME_XP_PAR_POINT)

        # Repart sur une scène jour "propre" : pas d'humeur/particules figées depuis
        # avant le mini-jeu (la scène d'origine était gelée pendant qu'on jouait).
        self.return_to._action_mood = None
        self.return_to._celebrating = False
        if metamorphosed:
            self.return_to._start_celebration()

        self.next_scene = self.return_to

    def draw(self, surface):
        surface.fill(config.hex_to_rgb(config.COLORS["bleu_baignade"]))

        for obj in self.objects:
            color_key = "trait_sombre" if obj.kind == "mouche" else "jaune_faim"
            pygame.draw.circle(surface, config.hex_to_rgb(config.COLORS[color_key]),
                                (int(obj.x), int(obj.y)), obj.radius)
        self.particles.draw(surface)

        trait = config.hex_to_rgb(config.COLORS["trait_sombre"])
        text = self._font.render(f"Score {self.score}   {max(0, int(self.timer))}s", False, trait)
        surface.blit(text, (10, 10))
