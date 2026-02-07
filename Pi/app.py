"""Simple LED test app - 5x10 grid to control LEDs from browser."""
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

# ============== LED SETUP (edit these for your Pi) ==============
LED_COUNT = 50  # 5x10 grid
LED_PIN = 18    # GPIO pin (change if different)

# Try to import neopixel - will fail on non-Pi
try:
    import board
    import neopixel
    pixels = neopixel.NeoPixel(board.D18, LED_COUNT, auto_write=True)
    LED_AVAILABLE = True
    print("NeoPixel initialized!")
except Exception as e:
    print(f"NeoPixel not available: {e}")
    LED_AVAILABLE = False
    pixels = None

# Color map - GRB order (common for WS2811/WS2812)
COLORS = {
    "off": (0, 0, 0),
    "blue": (0, 0, 255),      # GRB: (0, 0, 255)
    "green": (255, 0, 0),     # GRB: green is first byte
    "yellow": (255, 255, 0),  # GRB: green + red
    "red": (0, 255, 0),       # GRB: red is second byte
}

# ============== APP ==============
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def xy_to_index(x: int, y: int) -> int:
    """Convert x,y grid position to LED index. Snake/serpentine wiring, flipped horizontally."""
    # Flip X: mirror left/right
    x_flipped = 4 - x

    # Snake pattern: even rows go left-to-right, odd rows go right-to-left
    if y % 2 == 0:
        return y * 5 + x_flipped
    else:
        return y * 5 + (4 - x_flipped)

@app.get("/set/{x}/{y}/{color}")
def set_led(x: int, y: int, color: str):
    """Set LED at position (x,y) to color."""
    if x < 0 or x >= 5 or y < 0 or y >= 10:
        return {"error": "Invalid position"}

    rgb = COLORS.get(color, (0, 0, 0))
    index = xy_to_index(x, y)

    if LED_AVAILABLE and pixels:
        pixels[index] = rgb

    return {"x": x, "y": y, "color": color, "index": index, "led_available": LED_AVAILABLE}

@app.get("/clear")
def clear_all():
    """Turn off all LEDs."""
    if LED_AVAILABLE and pixels:
        pixels.fill((0, 0, 0))
    return {"status": "cleared"}

@app.get("/", response_class=HTMLResponse)
def index():
    """Serve the grid UI."""
    return """
<!DOCTYPE html>
<html>
<head>
    <title>LED Test Grid</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            background: #1a1a1a;
            color: white;
        }
        h1 { margin-bottom: 10px; }
        .grid {
            display: grid;
            grid-template-columns: repeat(5, 60px);
            gap: 8px;
            padding: 20px;
            background: #333;
            border-radius: 10px;
        }
        .led {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #222;
            border: 3px solid #444;
            cursor: pointer;
            transition: all 0.15s;
        }
        .led:hover {
            transform: scale(1.1);
            border-color: #666;
        }
        .led.blue { background: #0066ff; box-shadow: 0 0 20px #0066ff; }
        .led.green { background: #00ff00; box-shadow: 0 0 20px #00ff00; }
        .led.yellow { background: #ffff00; box-shadow: 0 0 20px #ffff00; }
        .led.red { background: #ff0000; box-shadow: 0 0 20px #ff0000; }
        button {
            margin-top: 20px;
            padding: 10px 30px;
            font-size: 16px;
            cursor: pointer;
            background: #444;
            color: white;
            border: none;
            border-radius: 5px;
        }
        button:hover { background: #555; }
        .info { margin-top: 10px; color: #888; font-size: 14px; }
    </style>
</head>
<body>
    <h1>LED Test Grid (5x10)</h1>
    <p>Click to cycle: off → blue → green → yellow → red → off</p>
    <div class="grid" id="grid"></div>
    <button onclick="clearAll()">Clear All</button>
    <div class="info" id="status">Ready</div>

    <script>
        const colors = ['off', 'blue', 'green', 'yellow', 'red'];
        const grid = document.getElementById('grid');
        const status = document.getElementById('status');

        // Create 5x10 grid (10 rows, 5 columns)
        // y=0 is top row, y=9 is bottom
        for (let y = 9; y >= 0; y--) {
            for (let x = 0; x < 5; x++) {
                const led = document.createElement('div');
                led.className = 'led';
                led.dataset.x = x;
                led.dataset.y = y;
                led.dataset.colorIndex = 0;
                led.title = `(${x}, ${y})`;
                led.onclick = () => cycleLed(led);
                grid.appendChild(led);
            }
        }

        async function cycleLed(led) {
            const x = led.dataset.x;
            const y = led.dataset.y;
            let idx = parseInt(led.dataset.colorIndex);
            idx = (idx + 1) % colors.length;
            led.dataset.colorIndex = idx;

            const color = colors[idx];
            led.className = 'led ' + (color === 'off' ? '' : color);

            status.textContent = `Setting (${x}, ${y}) to ${color}...`;
            try {
                const res = await fetch(`/set/${x}/${y}/${color}`);
                const data = await res.json();
                status.textContent = `Set LED ${data.index} at (${x},${y}) to ${color}`;
            } catch (e) {
                status.textContent = 'Error: ' + e.message;
            }
        }

        async function clearAll() {
            document.querySelectorAll('.led').forEach(led => {
                led.className = 'led';
                led.dataset.colorIndex = 0;
            });
            status.textContent = 'Clearing...';
            await fetch('/clear');
            status.textContent = 'Cleared all LEDs';
        }
    </script>
</body>
</html>
"""

if __name__ == "__main__":
    import uvicorn
    print("Starting LED test server on http://0.0.0.0:8080")
    print("Open this URL from your laptop to control LEDs")
    uvicorn.run(app, host="0.0.0.0", port=8080)
