"""LED strip control service.

This is a placeholder module. Replace the implementation with your
working LED control script once you're ready to test on the Pi.

The API endpoints call these functions - you just need to fill in
the actual LED control logic.
"""
from typing import List, Dict, Any, Optional

# =============================================================================
# CONFIGURATION - Update these after wiring
# =============================================================================

# Color name to RGB mapping
COLORS: Dict[str, tuple] = {
    "green":  (34, 197, 94),    # Start holds
    "blue":   (5, 103, 232),    # Hand holds
    "yellow": (234, 179, 8),    # Foot holds
    "red":    (239, 68, 68),    # Finish holds
}

# Coordinate (x, y) to LED index mapping
# Fill this in after you wire the board and know which LED is where
# Example: (0, 0) -> LED index 0, (1, 0) -> LED index 1, etc.
COORD_TO_LED: Dict[tuple, int] = {
    # (x, y): led_index
    # Example entries:
    # (0, 0): 0,
    # (1, 0): 1,
    # (0, 1): 2,
    # ...
}

# LED strip configuration
LED_COUNT = 25  # Update to match your setup


# =============================================================================
# PLACEHOLDER: Your LED control code goes here
# =============================================================================

# This will be set to your actual LED strip object
_strip = None


def _init_strip():
    """Initialize the LED strip.

    TODO: Replace with your working LED initialization code.
    Example with rpi_ws281x:
        from rpi_ws281x import PixelStrip, Color
        strip = PixelStrip(LED_COUNT, LED_PIN, LED_FREQ_HZ, LED_DMA,
                           LED_INVERT, LED_BRIGHTNESS, LED_CHANNEL)
        strip.begin()
        return strip
    """
    global _strip
    # Placeholder - replace with your code
    _strip = None
    return False


def is_available() -> bool:
    """Check if LED control is available (running on Pi with GPIO access).

    Returns:
        True if LEDs can be controlled, False otherwise.
    """
    # TODO: Replace with actual check
    # Example: try to import rpi_ws281x and check GPIO access
    try:
        # Placeholder check - replace with your actual availability check
        # import rpi_ws281x
        return False  # Return False until you add your code
    except ImportError:
        return False


def get_led_index(x: float, y: float) -> Optional[int]:
    """Convert board coordinates to LED index.

    Args:
        x: X coordinate (0-10, with 0.5 increments for screw-ons)
        y: Y coordinate (0-14, with 0.5 increments for screw-ons)

    Returns:
        LED index, or None if coordinate not mapped.
    """
    return COORD_TO_LED.get((x, y))


def get_rgb(color: str) -> tuple:
    """Convert color name to RGB tuple.

    Args:
        color: Color name (green, blue, yellow, red)

    Returns:
        RGB tuple (r, g, b), defaults to white if color unknown.
    """
    return COLORS.get(color.lower(), (255, 255, 255))


def clear() -> bool:
    """Turn off all LEDs.

    TODO: Replace with your working LED clear code.

    Returns:
        True if successful, False otherwise.
    """
    if not is_available():
        return False

    # TODO: Replace with your code
    # Example:
    # for i in range(LED_COUNT):
    #     _strip.setPixelColor(i, Color(0, 0, 0))
    # _strip.show()

    return True


def display_holds(holds: List[Dict[str, Any]]) -> int:
    """Display holds on the LED strip.

    Args:
        holds: List of hold objects with x, y, color fields.
               Example: [{"x": 5.0, "y": 7.0, "color": "blue"}]

    Returns:
        Number of LEDs that were lit up.

    TODO: Replace with your working LED display code.
    """
    if not is_available():
        return 0

    lit_count = 0

    # Clear first
    clear()

    for hold in holds:
        x = hold.get("x")
        y = hold.get("y")
        color = hold.get("color", "blue")

        led_index = get_led_index(x, y)
        if led_index is not None:
            r, g, b = get_rgb(color)
            # TODO: Replace with your code
            # _strip.setPixelColor(led_index, Color(r, g, b))
            lit_count += 1

    # TODO: Replace with your code
    # _strip.show()

    return lit_count


def test_pattern() -> bool:
    """Display a test pattern on all LEDs.

    Useful for verifying the LED strip is working.

    TODO: Replace with your working test pattern code.

    Returns:
        True if successful, False otherwise.
    """
    if not is_available():
        return False

    # TODO: Replace with your code
    # Example: Light all LEDs in sequence or rainbow pattern
    # for i in range(LED_COUNT):
    #     _strip.setPixelColor(i, Color(255, 0, 0))
    # _strip.show()

    return True
