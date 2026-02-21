"""
SENDIT v2 — Spatial Enhanced Neural Difficulty Inference Tool
Model architecture + constants. Same architecture as v1, with:
  - Output clamped to [0, 16] (prevents impossible predictions)

6-branch multi-input CNN:
  CNN (4ch 22x20) → 128
  Angle (1) → 16
  Hold features (21) → 16
  Global spacing (10) → 8
  Movement features (12) → 16
  Interaction features (8) → 8
  Combined: 192 → 128 → 64 → 32 → 1 → clamp [0, 16]
"""

import torch
import torch.nn as nn

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


def convert_difficulty_to_v_grade(raw_difficulty):
    raw_int = max(1, min(35, round(raw_difficulty)))
    return DIFFICULTY_TO_V_GRADE.get(raw_int, 0)


# =============================================================================
# COORDINATE CONVERSIONS (canonical — used everywhere)
# =============================================================================

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


# =============================================================================
# MODEL
# =============================================================================

# Output clamp
OUTPUT_MIN = 0.0
OUTPUT_MAX = 16.0  # V16 max


class SENDITv2(nn.Module):
    """
    SENDIT v2 — same architecture as v1 + output clamp.
    Training uses softened grade weights + blended loss.
    """

    def __init__(self, dropout=0.3):
        super().__init__()

        # --- CNN branch (4ch 22x20 → 128) ---
        self.conv1 = nn.Sequential(
            nn.Conv2d(CNN_CHANNELS, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2)  # 22x20 → 11x10
        )
        self.conv2 = nn.Sequential(
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2, 2)  # 11x10 → 5x5
        )
        self.conv3 = nn.Sequential(
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d(1)  # → 128x1x1
        )

        # --- Angle branch (1 → 16) ---
        self.angle_fc = nn.Sequential(
            nn.Linear(1, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.ReLU()
        )

        # --- Hold features branch (21 → 16) ---
        self.hold_fc = nn.Sequential(
            nn.Linear(N_HOLD_FEATURES, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.ReLU()
        )

        # --- Global spacing branch (10 → 8) ---
        self.spacing_fc = nn.Sequential(
            nn.Linear(N_SPACING_FEATURES, 16),
            nn.BatchNorm1d(16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.BatchNorm1d(8),
            nn.ReLU()
        )

        # --- Movement branch (12 → 16) [NEW] ---
        self.movement_fc = nn.Sequential(
            nn.Linear(N_MOVEMENT_FEATURES, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.ReLU()
        )

        # --- Interaction branch (8 → 8) [from V4] ---
        self.interaction_fc = nn.Sequential(
            nn.Linear(N_INTERACTION_FEATURES, 16),
            nn.BatchNorm1d(16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.BatchNorm1d(8),
            nn.ReLU()
        )

        # --- Combined head (192 → 1) ---
        total = 128 + 16 + 16 + 8 + 16 + 8  # 192
        self.head = nn.Sequential(
            nn.Linear(total, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(dropout * 0.7),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.ReLU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(32, 1)
        )

    def forward(self, grid, angle, hold_feats, spacing_feats, movement_feats, interaction_feats):
        # CNN
        x_cnn = self.conv1(grid)
        x_cnn = self.conv2(x_cnn)
        x_cnn = self.conv3(x_cnn)
        x_cnn = x_cnn.view(x_cnn.size(0), -1)  # (B, 128)

        x_angle = self.angle_fc(angle)
        x_hold = self.hold_fc(hold_feats)
        x_spacing = self.spacing_fc(spacing_feats)
        x_movement = self.movement_fc(movement_feats)
        x_interaction = self.interaction_fc(interaction_feats)

        combined = torch.cat([x_cnn, x_angle, x_hold, x_spacing, x_movement, x_interaction], dim=1)
        out = self.head(combined)
        return torch.clamp(out, OUTPUT_MIN, OUTPUT_MAX)
