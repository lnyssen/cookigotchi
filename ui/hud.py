"""Dessine les 4 jauges de stats (Amour, Faim, Énergie, Fraîcheur) en haut de l'écran."""

import pygame

import assets
import config
from ui.gear_menu import gear_rect

_STAT_DEFS = (
    ("amour", "hud_amour", "rose_amour"),
    ("faim", "hud_faim", "jaune_faim"),
    ("energie", "hud_energie", "vert_energie"),
    ("fraicheur", "hud_fraicheur", "bleu_fraicheur"),
)

_font = None


def _get_font():
    global _font
    if _font is None:
        _font = pygame.font.SysFont("couriernewbold", 11) or pygame.font.Font(None, 12)
    return _font


def draw(surface, stats, level=None, xp=None):
    """stats : dict {nom_stat: valeur 0-100}"""
    trait = config.hex_to_rgb(config.COLORS["trait_sombre"])
    blanc = config.hex_to_rgb(config.COLORS["blanc_ui"])

    unit_width = config.STAT_ICON_SIZE + config.STAT_ICON_BAR_GAP + config.STAT_BAR_WIDTH
    x = config.HUD_X
    y = config.HUD_Y + (config.HUD_HEIGHT - config.STAT_BAR_HEIGHT) // 2

    for stat_name, icon_name, color_key in _STAT_DEFS:
        icon = assets.ui.get(icon_name)
        if icon:
            icon_scaled = config.scale_smooth(icon, (config.STAT_ICON_SIZE, config.STAT_ICON_SIZE))
            icon_y = config.HUD_Y + (config.HUD_HEIGHT - config.STAT_ICON_SIZE) // 2
            surface.blit(icon_scaled, (x, icon_y))

        bar_x = x + config.STAT_ICON_SIZE + config.STAT_ICON_BAR_GAP
        track_rect = pygame.Rect(bar_x, y, config.STAT_BAR_WIDTH, config.STAT_BAR_HEIGHT)
        pygame.draw.rect(surface, blanc, track_rect)
        pygame.draw.rect(surface, trait, track_rect, width=1)

        value = max(config.STAT_MIN, min(config.STAT_MAX, stats.get(stat_name, 0)))
        fill_width = int((track_rect.width - 2) * value / config.STAT_MAX)
        if fill_width > 0:
            fill_rect = pygame.Rect(track_rect.x + 1, track_rect.y + 1, fill_width, track_rect.height - 2)
            pygame.draw.rect(surface, config.hex_to_rgb(config.COLORS[color_key]), fill_rect)

        x += unit_width + config.STAT_GAP

    if level is not None:
        _draw_level_badge(surface, level, xp, trait, blanc)
    _draw_gear(surface, trait)


def _draw_level_badge(surface, level, xp, trait, blanc):
    rect = pygame.Rect(config.META_X, config.META_Y, config.LEVEL_BADGE_WIDTH, config.LEVEL_BADGE_HEIGHT)
    pygame.draw.rect(surface, blanc, rect, border_radius=3)
    pygame.draw.rect(surface, trait, rect, width=1, border_radius=3)

    # antialias=False : à cette taille minuscule le lissage brouille les lettres (ex. "c" -> "o")
    label = _get_font().render(f"Lv.{level} xp{xp}", False, trait)
    label_rect = label.get_rect(center=rect.center)
    surface.blit(label, label_rect)


def _draw_gear(surface, trait):
    rect = gear_rect()
    icon = assets.ui.get("icon_settings")
    if icon:
        icon_scaled = config.scale_smooth(icon, (config.GEAR_ICON_SIZE, config.GEAR_ICON_SIZE))
        icon_rect = icon_scaled.get_rect(center=rect.center)
        surface.blit(icon_scaled, icon_rect)
