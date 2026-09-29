"""Point d'entrée : init Pygame, boucle de jeu, délègue à la scène active.

Le jeu dessine toujours sur une surface logique 320x240 (portable M5Stack) ;
la fenêtre PC affiche cette surface agrandie (config.WINDOW_SCALE) pour rester
confortable à l'écran sans changer la résolution de rendu.
"""

import sys

import pygame

import assets
import audio
import config
import save
from scenes.boot import BootScene
from scenes.day import DayScene


def _to_logical_event(event):
    """Convertit la position d'un événement souris de coordonnées fenêtre -> coordonnées logiques."""
    if not hasattr(event, "pos"):
        return event
    logical_pos = (event.pos[0] / config.WINDOW_SCALE, event.pos[1] / config.WINDOW_SCALE)
    kwargs = {"pos": logical_pos}
    if hasattr(event, "button"):
        kwargs["button"] = event.button
    return pygame.event.Event(event.type, **kwargs)


def main():
    pygame.init()
    window = pygame.display.set_mode((
        config.SCREEN_WIDTH * config.WINDOW_SCALE,
        config.SCREEN_HEIGHT * config.WINDOW_SCALE,
    ))
    pygame.display.set_caption("FrogGotchi")
    # depth=24 (aucun octet alpha physique) : une surface 32 bits sans SRCALPHA garde
    # quand même un octet alpha fantôme qui pollue la composition des sprites (transparence buguée).
    game_surface = pygame.Surface((config.SCREEN_WIDTH, config.SCREEN_HEIGHT), depth=24)
    clock = pygame.time.Clock()

    assets.load_all()
    audio.init()
    pet_state, evolution, elapsed, first_time = save.load_state()
    pet_state.apply_elapsed(elapsed)  # rattrape la dégradation pendant que le jeu était fermé

    scene = BootScene(pet_state, evolution) if first_time else DayScene(pet_state, evolution)

    running = True
    while running:
        dt = clock.tick(config.FPS) / 1000
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False
            elif event.type in (pygame.MOUSEBUTTONDOWN, pygame.MOUSEBUTTONUP, pygame.MOUSEMOTION):
                scene.handle_event(_to_logical_event(event))
            else:
                scene.handle_event(event)

        scene.update(dt)
        if scene.next_scene is not None:
            # Remet next_scene à None sur l'ancienne scène : DayScene est réutilisée d'un
            # aller-retour minijeu à l'autre (return_to=self), sinon elle rebascule seule
            # vers le minijeu déjà terminé à la frame suivante (oscillation infinie).
            old_scene = scene
            scene = scene.next_scene
            old_scene.next_scene = None

        scene.draw(game_surface)

        # smoothscale : le style est pastel/anti-crénelé (pas du pixel art), le plus proche
        # voisin rendait les courbes en escalier. Un léger lissage colle mieux à la maquette.
        scaled = pygame.transform.smoothscale(game_surface, window.get_size())
        window.blit(scaled, (0, 0))
        pygame.display.flip()

    save.save_state(pet_state, evolution)
    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
