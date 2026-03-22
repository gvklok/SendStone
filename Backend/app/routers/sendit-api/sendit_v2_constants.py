"""
SENDIT v2 — constants and coordinate utilities only.
No torch dependency — safe to import on Raspberry Pi / any inference-only host.
The PyTorch model class lives in sendit_v2_model.py (training use only).
"""

# =============================================================================
# CONSTANTS
# =============================================================================

CNN_CHANNELS = 4
CNN_HEIGHT = 20   # rows (Y)
CNN_WIDTH = 22    # cols (X)

N_HOLD_FEATURES = 21
N_SPACING_FEATURES = 10
N_MOVEMENT_FEATURES = 12
N_INTERACTION_FEATURES = 8

# Full board coordinate range (includes non-LED edge holds)
KILTER_X_MIN = 28
KILTER_X_MAX = 116
KILTER_Y_MIN = 36
KILTER_Y_MAX = 156

UI_X_MAX = 10.0
UI_Y_MAX = 14.0

DIFFICULTY_TO_V_GRADE = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
    13: 1, 14: 1, 15: 2, 16: 3, 17: 3, 18: 4, 19: 4, 20: 5, 21: 5, 22: 6,
    23: 7, 24: 8, 25: 8, 26: 9, 27: 10, 28: 11, 29: 12, 30: 13, 31: 14, 32: 15,
    33: 16, 34: 16, 35: 16
}

# DB role codes
ROLE_START = 12
ROLE_HAND = 13
ROLE_FINISH = 14
ROLE_FOOT = 15

# CNN channel encodings
ROLE_MAP_CNN = {ROLE_START: 1.0, ROLE_HAND: 0.7, ROLE_FINISH: 0.5, ROLE_FOOT: 0.3}
MAX_HOLD_DIFFICULTY = 10.0  # For CNN channel normalization

DEFAULT_UNRATED_HOLD_RATING = 2.0


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def convert_difficulty_to_v_grade(raw_difficulty):
    raw_int = max(1, min(35, round(raw_difficulty)))
    return DIFFICULTY_TO_V_GRADE.get(raw_int, 0)


def kilter_to_ui(x_pixel, y_pixel):
    """Kilter pixel → UI grid (0-10, 0-14). Uses full board range."""
    ui_x = (x_pixel - KILTER_X_MIN) / (KILTER_X_MAX - KILTER_X_MIN) * UI_X_MAX
    ui_y = (y_pixel - KILTER_Y_MIN) / (KILTER_Y_MAX - KILTER_Y_MIN) * UI_Y_MAX
    return max(0.0, min(UI_X_MAX, ui_x)), max(0.0, min(UI_Y_MAX, ui_y))


def ui_to_rating_int(ui_x, ui_y):
    """UI grid → integer rating lookup (bolt-ons). Keys 0-10, 0-14."""
    return int(round(ui_x)), int(round(ui_y))


def ui_to_rating_half(ui_x, ui_y):
    """UI grid → half-step rating lookup (screw-ons). Keys at 0.5 intervals."""
    return round(ui_x * 2) / 2, round(ui_y * 2) / 2


def ui_to_cnn(ui_x, ui_y):
    """UI grid → CNN grid cell. Width=22, Height=20."""
    cnn_x = int(round(ui_x / UI_X_MAX * (CNN_WIDTH - 1)))
    cnn_y = int(round(ui_y / UI_Y_MAX * (CNN_HEIGHT - 1)))
    return max(0, min(CNN_WIDTH - 1, cnn_x)), max(0, min(CNN_HEIGHT - 1, cnn_y))
