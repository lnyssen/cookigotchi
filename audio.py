"""Sons courts synthétisés en Python pur (pas de numpy : portable ESP32/M5Stack plus tard).

Pas de fichiers audio fournis (aucun n'existe dans le doc) : de petits bips chiptune
générés à l'exécution, dans l'esprit d'un buzzer Tamagotchi.
"""

import array
import math

import pygame

_SAMPLE_RATE = 22050
_sounds = {}
_ready = False
muted = False


def _tone(freq, duration, volume=0.4, fade=0.015):
    n_samples = max(1, int(_SAMPLE_RATE * duration))
    fade_samples = max(1, int(_SAMPLE_RATE * fade))
    amplitude = int(32767 * volume)
    samples = array.array("h", [0]) * n_samples

    for i in range(n_samples):
        value = amplitude * math.sin(2 * math.pi * freq * i / _SAMPLE_RATE)
        if i < fade_samples:
            value *= i / fade_samples
        elif i > n_samples - fade_samples:
            value *= (n_samples - i) / fade_samples
        samples[i] = int(value)
    return samples


def _silence(duration):
    return array.array("h", [0]) * max(1, int(_SAMPLE_RATE * duration))


def _sequence(*notes):
    """notes : liste de (frequence_hz, duree_s) ; frequence 0 = silence."""
    samples = array.array("h")
    for freq, duration in notes:
        samples.extend(_silence(duration) if freq <= 0 else _tone(freq, duration))
    return samples


def init():
    """À appeler une fois après pygame.init(). Ne plante pas si aucun périphérique audio."""
    global _ready
    if _ready:
        return
    try:
        if pygame.mixer.get_init() is None:
            pygame.mixer.init(frequency=_SAMPLE_RATE, size=-16, channels=1)
    except pygame.error:
        return  # pas de périphérique audio disponible, le jeu reste jouable en silence

    _sounds["calin"] = pygame.mixer.Sound(buffer=_sequence((523, 0.08), (659, 0.12)))
    _sounds["miam"] = pygame.mixer.Sound(buffer=_sequence((392, 0.06), (330, 0.08)))
    _sounds["dodo"] = pygame.mixer.Sound(buffer=_tone(220, 0.3, volume=0.3))
    _sounds["baignade"] = pygame.mixer.Sound(buffer=_sequence((440, 0.05), (494, 0.05), (440, 0.05)))
    _sounds["jeu"] = pygame.mixer.Sound(buffer=_tone(880, 0.05, volume=0.3))
    _sounds["clic"] = pygame.mixer.Sound(buffer=_tone(700, 0.04, volume=0.25))
    _sounds["reclame"] = pygame.mixer.Sound(buffer=_sequence((330, 0.08), (0, 0.05), (330, 0.08)))
    _sounds["niveau"] = pygame.mixer.Sound(buffer=_sequence((523, 0.08), (659, 0.08), (784, 0.16)))
    _ready = True


def play(name):
    if muted or not _ready:
        return
    sound = _sounds.get(name)
    if sound:
        sound.play()


def set_muted(value):
    global muted
    muted = value
