"""LED strip control service (neopixel / rpi_ws281x).

Hardware layout
---------------
50 NeoPixels snaked across the climbing board.
The strip starts at the bottom-left corner of the board and snakes
upward row by row:

  Row 0 (y ≈ 0):  LEDs  0-4   →  left  to right
  Row 1 (y ≈ 1.4):LEDs  5-9   ←  right to left
  Row 2 (y ≈ 2.8):LEDs 10-14  →  left  to right
  ...  (alternating)

LEDS_PER_ROW = 5 gives 10 rows covering the full board height.

Hold coordinates on the board range from
  x: 0 – 10  (columns)
  y: 0 – 14  (rows, y=0 is bottom)

Each hold is mapped to the nearest LED position; multiple holds that
map to the same LED are blended (brightest / highest-priority color wins).

Fallback
--------
If `board` or `neopixel` cannot be imported (i.e. not running on a Pi)
the module still works — is_available() returns False and every function
is a safe no-op so the API still returns 200 everywhere.
"""

from typing import List, Dict, Any, Optional

# ─────────────────────────────────────────────────────────────
#  Hardware availability — graceful import
# ─────────────────────────────────────────────────────────────
_HW_AVAILABLE = False
_pixels = None

try:
    import board
    import neopixel as _neopixel
    _HW_AVAILABLE = True
except (ImportError, NotImplementedError):
    # Not on a Pi, or GPIO not accessible
    pass

# ─────────────────────────────────────────────────────────────
#  Configuration
# ─────────────────────────────────────────────────────────────

LED_COUNT    = 50
LED_PIN      = None          # set below after import check
BRIGHTNESS   = 0.3
LEDS_PER_ROW = 5             # LEDs across each physical row of the snake

# Board coordinate ranges (handholds only)
BOARD_X_MAX = 10.0
BOARD_Y_MAX = 14.0

# Hold color → RGB (library converts to GRB wire order via pixel_order=GRB)
COLORS: Dict[str, tuple] = {
    "green":  (0,   200, 60),    # Start holds  — green
    "blue":   (5,   103, 232),   # Hand holds   — blue
    "yellow": (234, 179, 8),     # Foot holds   — yellow
    "red":    (239, 68,  68),    # Finish holds — red
}

# Priority order when two holds share one LED (higher index = higher priority)
COLOR_PRIORITY = {"blue": 0, "yellow": 1, "green": 2, "red": 3}

# ─────────────────────────────────────────────────────────────
#  Snake LED layout
# ─────────────────────────────────────────────────────────────

def _build_led_positions() -> List[tuple]:
    """Return a list of (board_x, board_y) for each LED index 0-49.

    The snake starts at the bottom-left and alternates direction each row:
      even rows → left to right
      odd  rows → right to left
    """
    num_rows = LED_COUNT // LEDS_PER_ROW          # 10 rows
    y_step   = BOARD_Y_MAX / (num_rows - 1)       # spacing between LED rows
    x_step   = BOARD_X_MAX / (LEDS_PER_ROW - 1)  # spacing between LEDs in a row

    positions = []
    for row in range(num_rows):
        board_y = row * y_step
        xs = [col * x_step for col in range(LEDS_PER_ROW)]
        if row % 2 == 1:          # odd rows run right → left
            xs = list(reversed(xs))
        for bx in xs:
            positions.append((bx, board_y))

    return positions


_LED_POSITIONS: List[tuple] = _build_led_positions()


def _nearest_led(hold_x: float, hold_y: float) -> int:
    """Return the LED index whose physical position is closest to (hold_x, hold_y)."""
    best_idx  = 0
    best_dist = float("inf")
    for i, (lx, ly) in enumerate(_LED_POSITIONS):
        dist = (lx - hold_x) ** 2 + (ly - hold_y) ** 2
        if dist < best_dist:
            best_dist = dist
            best_idx  = i
    return best_idx


# ─────────────────────────────────────────────────────────────
#  Initialisation
# ─────────────────────────────────────────────────────────────

def _init_strip():
    """Initialise the NeoPixel strip.  No-op when not on a Pi."""
    global _pixels, LED_PIN

    if not _HW_AVAILABLE:
        return False

    try:
        LED_PIN = board.D18
        _pixels = _neopixel.NeoPixel(
            LED_PIN, LED_COUNT,
            brightness=BRIGHTNESS,
            auto_write=False,
            pixel_order=_neopixel.GRB,
        )
        return True
    except Exception as e:
        print(f"[LED] init failed: {e}")
        _pixels = None
        return False


# Run on import so the strip is ready when the first request arrives
_init_strip()


# ─────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────

def is_available() -> bool:
    return _HW_AVAILABLE and _pixels is not None


def clear() -> bool:
    """Turn all LEDs off."""
    if not is_available():
        return False
    try:
        _pixels.fill((0, 0, 0))
        _pixels.show()
        return True
    except Exception as e:
        print(f"[LED] clear failed: {e}")
        return False


def display_holds(holds: List[Dict[str, Any]]) -> int:
    """Light the LEDs that best represent the given holds.

    Multiple holds can map to the same LED — the highest-priority color wins
    (green/red > yellow > blue).

    Args:
        holds: list of dicts with keys x (float), y (float), color (str).

    Returns:
        Number of unique LEDs lit (0 when hardware not available).
    """
    # Build a map: led_index → best color for that LED
    led_colors: Dict[int, str] = {}

    for hold in holds:
        x     = hold.get("x")
        y     = hold.get("y")
        color = hold.get("color", "blue")

        if x is None or y is None:
            continue

        led_idx  = _nearest_led(float(x), float(y))
        priority = COLOR_PRIORITY.get(color, 0)

        existing = led_colors.get(led_idx)
        if existing is None or COLOR_PRIORITY.get(existing, 0) < priority:
            led_colors[led_idx] = color

    if not is_available():
        # Simulate — log what would light up
        print(f"[LED] simulated: {len(led_colors)} LEDs → {led_colors}")
        return len(led_colors)

    try:
        _pixels.fill((0, 0, 0))          # clear first
        for led_idx, color in led_colors.items():
            _pixels[led_idx] = COLORS.get(color, (255, 255, 255))
        _pixels.show()
        return len(led_colors)
    except Exception as e:
        print(f"[LED] display_holds failed: {e}")
        return 0


def test_pattern() -> bool:
    """Rainbow chase across all 50 LEDs — useful for wiring verification."""
    if not is_available():
        print("[LED] test_pattern: hardware not available")
        return False

    import time
    chase_colors = [
        COLORS["green"],
        COLORS["blue"],
        COLORS["yellow"],
        COLORS["red"],
    ]
    try:
        for i in range(LED_COUNT):
            _pixels[i] = chase_colors[i % len(chase_colors)]
            _pixels.show()
            time.sleep(0.05)
        time.sleep(1)
        _pixels.fill((0, 0, 0))
        _pixels.show()
        return True
    except Exception as e:
        print(f"[LED] test_pattern failed: {e}")
        return False
