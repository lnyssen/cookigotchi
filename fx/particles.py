"""Système générique de particules : étincelle, miette, mousse, cœur-pluie...

Pas d'assets fx/ fournis pour l'instant (voir doc partie 2.G) : dessinées en formes
simples (petits cercles colorés) en attendant les vrais sprites Figma.
"""

import random

import pygame

import config


class _Particle:
    __slots__ = ("x", "y", "vx", "vy", "color", "radius", "lifetime", "max_lifetime")

    def __init__(self, x, y, vx, vy, color, radius, lifetime):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.color = color
        self.radius = radius
        self.lifetime = lifetime
        self.max_lifetime = lifetime


class ParticleSystem:
    def __init__(self):
        self._particles = []

    def spawn_burst(self, x, y, color_hex, count=8, speed=50, lifetime=0.6, radius=3, gravity=60):
        color = config.hex_to_rgb(color_hex)
        for _ in range(count):
            angle = random.uniform(0, 6.283)
            v = random.uniform(speed * 0.4, speed)
            vx, vy = v * pygame.math.Vector2(1, 0).rotate_rad(angle)
            self._particles.append(_Particle(x, y, vx, vy - speed * 0.4, color, radius, lifetime))
        self._gravity = gravity

    def update(self, dt):
        gravity = getattr(self, "_gravity", 60)
        alive = []
        for p in self._particles:
            p.lifetime -= dt
            if p.lifetime <= 0:
                continue
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.vy += gravity * dt
            alive.append(p)
        self._particles = alive

    def draw(self, surface):
        for p in self._particles:
            fade = max(0.0, p.lifetime / p.max_lifetime)
            radius = max(1, int(p.radius * fade))
            particle_surface = pygame.Surface((radius * 2, radius * 2), pygame.SRCALPHA)
            alpha = int(255 * fade)
            pygame.draw.circle(particle_surface, (*p.color, alpha), (radius, radius), radius)
            surface.blit(particle_surface, (int(p.x) - radius, int(p.y) - radius))

    @property
    def is_empty(self):
        return not self._particles
