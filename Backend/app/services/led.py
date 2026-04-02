"""LED strip control service (neopixel / rpi_ws281x).

Hardware layout
---------------
Kilter Board LED system:
- 225 hold LEDs mapped to led_position (0–224)
- Physical strip indices: 25–249 (offset = 25)
- LEDs 0–24 are unused (pre-hold)

Board layout:
- x: 0 – 10 (columns, includes half-step screw-ons)
- y: 0 – 14 (rows, bottom → top)
- Bolt-ons at integer positions
- Screw-ons at half-step positions (x+0.5, y+0.5)

Snake wiring:
- Even columns go UP (y=0 → 14)
- Odd columns go DOWN (y=14 → 0)
"""

from typing import List, Dict, Any

# ─────────────────────────────────────────────────────────────
# Hardware availability
# ─────────────────────────────────────────────────────────────
_HW_AVAILABLE = False
_pixels = None

try:
    import board
    import neopixel as _neopixel
    _HW_AVAILABLE = True
except (ImportError, NotImplementedError):
    pass


# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────

LED_COUNT = 225
LED_STRIP_TOTAL = 250
LED_STRIP_OFFSET = 25

LED_PIN = None
BRIGHTNESS = 0.3

BOARD_X_MAX = 10.0
BOARD_Y_MAX = 14.0

COLORS: Dict[str, tuple] = {
    "green": (0, 255, 0),
    "blue": (0, 0, 255),
    "yellow": (255, 255, 0),
    "red": (255, 0, 0),
}

COLOR_PRIORITY = {"blue": 0, "yellow": 1, "green": 2, "red": 3}


# ─────────────────────────────────────────────────────────────
# Kilter LED layout
# ─────────────────────────────────────────────────────────────

def _build_led_positions() -> List[tuple]:
    """Return 225 (x, y) LED positions indexed 0–224.
    Physical LED = index + 25.
    """
    positions: List[tuple] = []

    for col in range(10):
        x_int = float(col)
        x_half = col + 0.5

        if col % 2 == 0:
            # even column → bottom → top
            for pair in range(6):
                y0 = pair * 2
                positions.append((x_int, float(y0)))
                positions.append((x_int, float(y0 + 1)))
                positions.append((x_half, y0 + 1.5))

            positions.append((x_int, 12.0))
            positions.append((x_int, 13.0))
            positions.append((x_int, 14.0))

        else:
            # odd column → top → bottom
            positions.append((x_int, 14.0))
            positions.append((x_int, 13.0))
            positions.append((x_int, 12.0))
            positions.append((x_int, 11.0))

            for pair in range(5):
                y_high = 10 - pair * 2
                positions.append((x_half, y_high + 0.5))
                positions.append((x_int, float(y_high)))
                positions.append((x_int, float(y_high - 1)))

            positions.append((x_half, 0.5))
            positions.append((x_int, 0.0))

    # final column x=10
    for y in range(15):
        positions.append((10.0, float(y)))

    return positions


_LED_POSITIONS = _build_led_positions()


def _nearest_led(x: float, y: float) -> int:
    """Return nearest LED index (0–224). Physical LED = index + 25."""
    best_idx = 0
    best_dist = float("inf")

    for i, (lx, ly) in enumerate(_LED_POSITIONS):
        dist = (lx - x) ** 2 + (ly - y) ** 2
        if dist < best_dist:
            best_dist = dist
            best_idx = i

    return best_idx


# ─────────────────────────────────────────────────────────────
# Init
# ─────────────────────────────────────────────────────────────

def _init_strip():
    global _pixels, LED_PIN

    if not _HW_AVAILABLE:
        return False

    try:
        LED_PIN = board.D18
        _pixels = _neopixel.NeoPixel(
            LED_PIN,
            LED_STRIP_TOTAL,  # ← 250 LEDs total
            brightness=BRIGHTNESS,
            auto_write=False,
            pixel_order=_neopixel.GRB,
        )
        return True
    except Exception as e:
        print(f"[LED] init failed: {e}")
        return False


_init_strip()


# ─────────────────────────────────────────────────────────────
# API
# ─────────────────────────────────────────────────────────────

def is_available() -> bool:
    return _HW_AVAILABLE and _pixels is not None


def clear() -> bool:
    if not is_available():
        return False

    _pixels.fill((0, 0, 0))
    _pixels.show()
    return True


def display_holds(holds: List[Dict[str, Any]]) -> int:
    led_colors: Dict[int, str] = {}

    for hold in holds:
        x = hold.get("x")
        y = hold.get("y")
        color = hold.get("color", "blue")

        if x is None or y is None:
            continue

        idx = _nearest_led(float(x), float(y))
        priority = COLOR_PRIORITY.get(color, 0)

        existing = led_colors.get(idx)
        if existing is None or COLOR_PRIORITY.get(existing, 0) < priority:
            led_colors[idx] = color

    if not is_available():
        print(f"[LED] simulated → {led_colors}")
        return len(led_colors)

    _pixels.fill((0, 0, 0))

    for idx, color in led_colors.items():
        _pixels[idx + LED_STRIP_OFFSET] = COLORS.get(color, (255, 255, 255))

    _pixels.show()
    return len(led_colors)


def test_pattern() -> bool:
    if not is_available():
        return False

    import time

    colors = [COLORS["green"], COLORS["blue"], COLORS["yellow"], COLORS["red"]]

    for i in range(LED_COUNT):
        _pixels[i + LED_STRIP_OFFSET] = colors[i % len(colors)]
        _pixels.show()
        time.sleep(0.02)

    time.sleep(1)
    _pixels.fill((0, 0, 0))
    _pixels.show()

    return True