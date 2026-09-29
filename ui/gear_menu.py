"""Menu engrenage : ouvre un petit panneau avec un réglage son on/off."""

import pygame

import audio
import config


def gear_rect():
    """Rectangle de l'icône engrenage, calculé une seule fois ici (source unique pour hud.py)."""
    return pygame.Rect(
        config.META_X + config.LEVEL_BADGE_WIDTH + config.STAT_GAP,
        config.META_Y - (config.GEAR_SIZE - config.LEVEL_BADGE_HEIGHT) // 2,
        config.GEAR_SIZE,
        config.GEAR_SIZE,
    )


class GearMenu:
    def __init__(self):
        self.open = False
        self._panel_rect = pygame.Rect(0, 0, 90, 24)
        self._toggle_rect = pygame.Rect(0, 0, 70, 14)
        self._layout()

    def _layout(self):
        gear = gear_rect()
        self._panel_rect.topright = (gear.right, gear.bottom + 4)
        self._toggle_rect.center = self._panel_rect.center

    def handle_click(self, pos):
        """Renvoie True si le clic a été consommé par le menu (pour ne pas le laisser passer au dock)."""
        if gear_rect().collidepoint(pos):
            self.open = not self.open
            return True
        if self.open:
            if self._toggle_rect.collidepoint(pos):
                audio.set_muted(not audio.muted)
                if not audio.muted:
                    audio.play("clic")
            self.open = False
            return True
        return False

    def draw(self, surface):
        if not self.open:
            return
        trait = config.hex_to_rgb(config.COLORS["trait_sombre"])
        blanc = config.hex_to_rgb(config.COLORS["blanc_ui"])

        pygame.draw.rect(surface, blanc, self._panel_rect, border_radius=4)
        pygame.draw.rect(surface, trait, self._panel_rect, width=1, border_radius=4)

        color_key = "vert_energie" if not audio.muted else "rose_amour"
        pygame.draw.rect(surface, config.hex_to_rgb(config.COLORS[color_key]), self._toggle_rect, border_radius=3)
        pygame.draw.rect(surface, trait, self._toggle_rect, width=1, border_radius=3)

        font = pygame.font.SysFont("couriernewbold", 9) or pygame.font.Font(None, 10)
        label = font.render("Son OFF" if audio.muted else "Son ON", False, trait)
        surface.blit(label, label.get_rect(center=self._toggle_rect.center))
