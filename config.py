"""Constantes globales : résolution, couleurs, chemins, seuils, mise en page du HUD/dock."""

import os

# --- Écran ---
SCREEN_WIDTH = 320
SCREEN_HEIGHT = 240
FPS = 30
# Le rendu logique reste 320x240 (portable M5Stack) ; seule la fenêtre PC est agrandie pour le confort.
WINDOW_SCALE = 3

# --- Chemins ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
PERSO_DIR = os.path.join(ASSETS_DIR, "perso")
UI_DIR = os.path.join(ASSETS_DIR, "ui")
FONDS_DIR = os.path.join(ASSETS_DIR, "fonds")
FX_DIR = os.path.join(ASSETS_DIR, "fx")
SAVE_PATH = os.path.join(BASE_DIR, "save.json")

# --- Couleurs (relevées sur la maquette Figma "tamagotchi-ui-v3") ---
COLORS = {
    "rose_amour": "#ffd1dc",
    "jaune_faim": "#fff7b0",
    "vert_energie": "#c8e6c9",
    "bleu_fraicheur": "#b3e0f2",  # pas encore dans la maquette, extrapolé (jauge 4/4 validée avec l'utilisateur)
    "lavande_dodo": "#d6d1ff",
    "bleu_baignade": "#d1f5ff",
    "creme_jour": "#fff5e1",
    "nuit_violet": "#2e2650",  # placeholder, pas encore illustré dans la maquette
    "blanc_ui": "#ffffff",
    "trait_sombre": "#423229",  # contour foncé utilisé sur tous les éléments UI
    "verre_fond": (255, 255, 255, 178),  # dock semi-transparent (RGBA direct, pas d'hex)
}

# --- Stats (0-100) ---
STAT_NAMES = ("amour", "faim", "energie", "fraicheur")
STAT_MAX = 100
STAT_MIN = 0
STAT_START = 80

# Dégradation par minute (temps réel, y compris jeu fermé). Chiffres provisoires,
# à ajuster au ressenti (~55-65 min pour vider une jauge en partant de STAT_START).
DECAY_PER_MINUTE = {"amour": 1.2, "faim": 1.5, "energie": 1.0, "fraicheur": 1.3}

# --- Couplages (doc partie 1) ---
FAIM_BASSE_SEUIL = 30
FAIM_BASSE_MULTIPLICATEUR_ENERGIE = 1.8  # Faim basse -> Énergie chute plus vite
FRAICHEUR_BASSE_SEUIL = 30
AMOUR_PLAFOND_SI_SEC = 60  # Fraîcheur basse -> l'Amour plafonne
ENERGIE_BASSE_SEUIL = 25  # Énergie basse -> s'endort seule / refuse de jouer

# --- Effets des boutons du dock (stat, montant, humeur d'action affichée) ---
ACTION_EFFECTS = {
    "calin": ("amour", 20, "content"),
    "miam": ("faim", 20, "miam"),
    "dodo": ("energie", 20, "dodo"),
    "baignade": ("fraicheur", 20, "splash"),
}
ACTION_MOOD_DURATION = 1.5  # secondes d'affichage de l'humeur d'action avant de revenir à l'ambiante
ACTION_XP = 5  # XP gagné à chaque interaction positive (câlin, miam, dodo, baignade, mini-jeu)

# --- XP / métamorphose (doc : "la machine à états... l'équilibrage chiffré" reste à faire,
# chiffres provisoires choisis pour que la progression soit visible en quelques minutes de test) ---
XP_PER_LEVEL = 40
# Niveau à partir duquel chaque stade commence (doit suivre l'ordre de AGES).
STAGE_LEVEL_THRESHOLDS = (("tetard", 1), ("grenouillette", 4), ("grenouille", 8))
DOREE_NIVEAU_MIN = 15  # niveau mini pour l'état doré/légendaire
DOREE_STAT_MIN = 70  # + toutes les stats au-dessus de ce seuil ("choyée sur la durée")

# --- Mini-jeu gobe-mouches (doc 2.G). Pas d'assets mouche/luciole fournis : cercles
# colorés en placeholder en attendant les vrais sprites Figma.
MINIGAME_DURATION = 20
MINIGAME_SPAWN_INTERVAL = 0.6
MINIGAME_FALL_SPEED_RANGE = (40, 90)
MINIGAME_OBJECT_RADIUS = 6
MINIGAME_LUCIOLE_CHANCE = 0.25
MINIGAME_REWARD_FAIM_PAR_POINT = 3
MINIGAME_REWARD_AMOUR_PAR_POINT = 1
MINIGAME_XP_PAR_POINT = 4

# --- Cycle jour/nuit (doc : nuit = énergie se restaure, autres stats baissent plus lentement) ---
NUIT_HEURE_DEBUT = 20  # 20h
NUIT_HEURE_FIN = 6  # 6h
NUIT_ENERGIE_REGEN_PAR_MINUTE = 2.0
NUIT_MULTIPLICATEUR_AUTRES_STATS = 0.4

# --- Humeurs ambiantes (doc partie 1 : moments-clés scénarisés) ---
SEC_SEUIL = 10  # fraîcheur très basse, longtemps négligée -> état signature « sec »
RECLAME_SEUIL = 15  # une stat très basse -> appel à l'aide (icône qui pulse)
BOUDEUR_SEUIL = 35  # une stat basse -> boudeuse

# --- Âges (métamorphose) ---
# Tailles réduites par rapport au doc (100/130/155) : la grenouille adulte ne tenait
# pas dans l'espace vertical réellement disponible entre le HUD et le dock (~150px)
# et débordait par-dessus le HUD. Mêmes proportions relatives, plafonnées à 115.
AGES = ("tetard", "grenouillette", "grenouille")
AGE_SIZES_PX = {"tetard": 74, "grenouillette": 96, "grenouille": 115}

# --- HUD (jauges de stats, haut d'écran) ---
HUD_X = 10
HUD_Y = 8
HUD_HEIGHT = 26
STAT_ICON_SIZE = 10
STAT_BAR_WIDTH = 36
STAT_BAR_HEIGHT = 7
STAT_ICON_BAR_GAP = 3
STAT_GAP = 4

# --- Meta (badge niveau + engrenage, coin haut droit du HUD) ---
META_X = HUD_X + 228
META_Y = HUD_Y + 5
LEVEL_BADGE_WIDTH = 52
LEVEL_BADGE_HEIGHT = 14
GEAR_SIZE = 16
GEAR_ICON_SIZE = 10

# --- Dock (6 boutons, bas d'écran) ---
DOCK_MARGIN_X = 10
DOCK_Y = 190
DOCK_HEIGHT = 42
DOCK_PILL_HEIGHT = 38
DOCK_INNER_PADDING = 10
DOCK_BUTTON_SIZE = 26
DOCK_ICON_SIZE = 12

# --- Scène centrale (personnage) ---
CENTER_STAGE_Y = 38
CENTER_STAGE_HEIGHT = 148
CHARACTER_BOTTOM_Y = DOCK_Y - 8  # pieds du personnage, avec marge au-dessus du dock


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))


def scale_smooth(surface, target_size):
    """Réduction progressive (mipmap) : évite le crénelage de smoothscale sur une grosse réduction."""
    import pygame

    w, h = surface.get_size()
    tw, th = target_size
    while w > tw * 2 and h > th * 2:
        w, h = max(tw, w // 2), max(th, h // 2)
        surface = pygame.transform.smoothscale(surface, (w, h))
    return pygame.transform.smoothscale(surface, target_size)
