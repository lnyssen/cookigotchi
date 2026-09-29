"""Classe abstraite Scene (update/draw/handle_event) commune à toutes les scènes."""


class Scene:
    # Une scène qui veut céder la main (ex. fin du mini-jeu, fin du boot) pose
    # self.next_scene = une autre Scene ; main.py bascule dessus au tour suivant.
    next_scene = None

    def handle_event(self, event):
        pass

    def update(self, dt):
        pass

    def draw(self, surface):
        pass
