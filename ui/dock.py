"""Les 6 boutons circulaires du bas (Câlin, Miam, Jeu, Dodo, Baignade, Nounou) + détection de clic."""

import pygame

import assets
import config

_BUTTONS = (
    ("calin", "btn_calin", "rose_amour"),
    ("miam", "btn_miam", "jaune_faim"),
    ("jeu", "btn_jeu", "vert_energie"),
    ("dodo", "btn_dodo", "lavande_dodo"),
    ("baignade", "btn_baignade", "bleu_baignade"),
    ("nounou", "btn_nounou", "rose_amour"),
)


class Dock:
    def __init__(self):
        self.pill_rect = pygame.Rect(
            config.DOCK_MARGIN_X,
            config.DOCK_Y + (config.DOCK_HEIGHT - config.DOCK_PILL_HEIGHT) // 2,
            config.SCREEN_WIDTH - 2 * config.DOCK_MARGIN_X,
            config.DOCK_PILL_HEIGHT,
        )
        self.button_rects = {}
        self._layout_buttons()

        self._glass = pygame.Surface(self.pill_rect.size, pygame.SRCALPHA)
        pygame.draw.rect(self._glass, config.COLORS["verre_fond"], self._glass.get_rect(),
                          border_radius=self.pill_rect.height // 2)

    def _layout_buttons(self):
        usable_width = self.pill_rect.width - 2 * config.DOCK_INNER_PADDING
        n = len(_BUTTONS)
        gap = (usable_width - n * config.DOCK_BUTTON_SIZE) / (n - 1)
        x = self.pill_rect.x + config.DOCK_INNER_PADDING
        y = self.pill_rect.centery - config.DOCK_BUTTON_SIZE // 2
        for name, _, _ in _BUTTONS:
            self.button_rects[name] = pygame.Rect(int(x), y, config.DOCK_BUTTON_SIZE, config.DOCK_BUTTON_SIZE)
            x += config.DOCK_BUTTON_SIZE + gap

    def draw(self, surface, active=None):
        active = active or set()
        trait = config.hex_to_rgb(config.COLORS["trait_sombre"])

        surface.blit(self._glass, self.pill_rect.topleft)
        pygame.draw.rect(surface, trait, self.pill_rect, width=2, border_radius=self.pill_rect.height // 2)

        for name, icon_name, color_key in _BUTTONS:
            rect = self.button_rects[name]

            if name in active:
                pygame.draw.circle(surface, trait, rect.center, rect.width // 2 + 3, width=2)

            color = config.hex_to_rgb(config.COLORS[color_key])
            pygame.draw.rect(surface, color, rect, border_radius=rect.height // 2)
            pygame.draw.rect(surface, trait, rect, width=2, border_radius=rect.height // 2)

            icon = assets.ui.get(icon_name)
            if icon:
                icon_scaled = config.scale_smooth(icon, (config.DOCK_ICON_SIZE, config.DOCK_ICON_SIZE))
                icon_rect = icon_scaled.get_rect(center=rect.center)
                surface.blit(icon_scaled, icon_rect)

    def get_clicked(self, pos):
        for name, rect in self.button_rects.items():
            if rect.collidepoint(pos):
                return name
        return None
