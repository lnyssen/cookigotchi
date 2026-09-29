"""Chargement et cache des images, exposées par nom logique (nom de fichier sans extension)."""

import os

import pygame
from PIL import Image, ImageDraw

import config

perso = {}
ui = {}
fonds = {}
fx = {}


def _strip_opaque_corners(pil_image, tolerance=40):
    """Corrige les exports Figma dont le fond de frame (blanc) n'a pas été retiré.

    Solution temporaire côté code (validée avec l'utilisateur) : la vraie
    correction est de retirer le fill des frames perso dans Figma.
    """
    img = pil_image.convert("RGBA")
    w, h = img.size
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(img, seed, (0, 0, 0, 0), thresh=tolerance)
    return img


def _load_folder(folder, strip_background=False):
    images = {}
    if not os.path.isdir(folder):
        return images
    for filename in os.listdir(folder):
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            name = os.path.splitext(filename)[0]
            path = os.path.join(folder, filename)
            if strip_background:
                pil_image = _strip_opaque_corners(Image.open(path))
                surface = pygame.image.fromstring(pil_image.tobytes(), pil_image.size, pil_image.mode)
            else:
                surface = pygame.image.load(path)
            images[name] = surface.convert_alpha()
    return images


def load_all():
    global perso, ui, fonds, fx
    perso = _load_folder(config.PERSO_DIR, strip_background=True)
    ui = _load_folder(config.UI_DIR)
    fonds = _load_folder(config.FONDS_DIR)
    fx = _load_folder(config.FX_DIR)
