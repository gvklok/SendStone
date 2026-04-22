# SendStone — Technical Documentation

Architecture, API reference, database schema, auth, ML model, hardware wiring, and frontend coordinate system — all in one place.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Backend](#2-backend)
   - [Project Structure](#project-structure)
   - [API Endpoints](#api-endpoints)
   - [Authentication](#authentication)
   - [Environment Variables](#environment-variables)
3. [Database](#3-database)
   - [Schema](#schema)
   - [Hold Format](#hold-format)
4. [ML Model](#4-ml-model)
   - [Architecture](#model-architecture)
   - [Coordinate & Type Conversion](#coordinate--type-conversion)
   - [Prediction Endpoint](#prediction-endpoint)
5. [Hardware](#5-hardware)
   - [Wiring](#wiring)
   - [LED Mapping](#led-mapping)
   - [Power](#power)
6. [Frontend](#6-frontend)
   - [Pages & Components](#pages--components)
   - [Coordinate System](#coordinate-system)
   - [Auth Flow](#auth-flow)

---

## 1. System Architecture

```
Browser (React)
      |
      |  REST / JSON (port 3000 → 8000)
      v
FastAPI Backend  ──────────────────────┐
  (Raspberry Pi, port 8000)            |
      |                                |
      ├── Supabase PostgreSQL          |  ML Inference
      |   (cloud, Row Level Security)  |  (ONNX runtime, embedded)
      |                                |
      └── LED Service ─────────────────┘
            |
          GPIO 18
            |
     74AHCT125 level shifter
            |
     225× WS2811 LEDs
```

The FastAPI backend runs directly on the Raspberry Pi and handles everything: REST API calls from the React frontend, database queries to Supabase, ML inference via the embedded ONNX model, and LED control via the Adafruit `neopixel` library over GPIO pin 18 (board pin D18).

---

## 2. Backend

### Project Structure

```
Backend/
├── main.py                  # FastAPI app, CORS config, router registration
├── requirements.txt
├── app/
│   ├── config.py            # Pydantic settings (reads .env)
│   ├── database.py          # Supabase client initialization
│   ├── dependencies.py      # JWT verification dependency (get_current_user)
│   ├── models.py            # Pydantic request/response schemas
│   ├── routers/
│   │   ├── routes.py        # /routes endpoints
│   │   ├── profiles.py      # /users endpoints
│   │   ├── hardware.py      # /hardware/led endpoints
│   │   ├── ml.py            # /ml/predict endpoint
│   │   ├── report.py        # /report endpoint
│   │   └── sendit-api/      # Embedded ML model (ONNX)
│   │       ├── app.py
│   │       ├── sendit_v2_model.py
│   │       ├── sendit_v2_constants.py
│   │       └── models/
│   │           ├── sendit_v2.onnx
│   │           ├── sendit_v2_model.pth
│   │           └── sendit_v2_scalers.pkl
│   └── services/
│       ├── led.py           # LED display logic
│       └── ml_predictor.py  # Model wrapper
└── tests/
    └── test_api.py
```

### API Endpoints

#### Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/routes` | No | List routes. Supports `?search=`, `?difficulty=`, `?sort=`, `?page=`, `?limit=`, `?creator_id=`, `?ids=` |
| GET | `/routes/{id}` | No | Get a single route by ID |
| POST | `/routes` | Yes | Create a new route |
| DELETE | `/routes/{id}` | Yes (owner) | Delete a route and all its holds |
| PUT | `/routes/{id}/save` | Yes | Bookmark a route |
| DELETE | `/routes/{id}/save` | Yes | Remove bookmark |
| PUT | `/routes/{id}/send` | Yes | Log a send (ascent) |
| DELETE | `/routes/{id}/send` | Yes | Remove a send |
| GET | `/routes/meta/saved` | Yes | List full saved routes for the current user |
| GET | `/routes/meta/sent_ids` | Yes | List route IDs the current user has sent |

#### Profiles

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/profiles/{user_id}` | Yes | Get a user's own profile |
| POST | `/profiles` | Yes | Create or update (upsert) a profile |
| PATCH | `/profiles/{user_id}` | Yes | Partially update profile fields (name, username, photo_url, climber_level) |
| DELETE | `/profiles/{user_id}` | Yes | Delete a profile |
| POST | `/profiles/{user_id}/photo` | Yes | Upload a new profile photo (max ~800KB) |
| PATCH | `/profiles/{user_id}/email` | Yes | Update connected email |
| DELETE | `/profiles/{user_id}/account` | Yes | Permanently delete account and all associated data |
| POST | `/profiles/{user_id}/sessions` | Yes | Log a login session |
| GET | `/profiles/{user_id}/dashboard` | Yes | Get dashboard stats (routes created, sends, max grade, etc.) |

#### Hardware

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/hardware/led/routes/{id}` | No | Light up a route on the board |
| POST | `/hardware/led/preview` | No | Preview holds from a JSON payload |
| POST | `/hardware/led/off` | No | Turn all LEDs off |
| GET | `/hardware/led/status` | No | Check LED service status |

#### ML

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ml/predict` | No | Predict difficulty grade for a route |

Request body for `/ml/predict`:
```json
{
  "holds": [
    { "x": 5.0, "y": 7.5, "color": "blue" },
    { "x": 6.5, "y": 10.0, "color": "green" }
  ],
  "angle": 40
}
```

Response:
```json
{
  "suggested_grade": "v5",
  "confidence": 0.85,
  "raw": 4.83,
  "path": [{"x": 5.0, "y": 7.5, "color": "blue"}, ...]
}
```

---

### Authentication

Auth uses Supabase-issued JWTs. The backend doesn't call Supabase to verify a token — it validates locally using `SUPABASE_JWT_SECRET` via HMAC-HS256, which keeps it fast and avoids a network round-trip on every request.

**Flow:**
1. User logs in via Supabase (email/password or Google OAuth)
2. Supabase returns an `access_token` (JWT)
3. Frontend stores it and attaches it to every request: `Authorization: Bearer <token>`
4. `app/dependencies.py` → `get_current_user()` decodes and validates the JWT
5. The `sub` claim becomes the user ID for database queries

**Endpoint auth requirements:**

| Endpoint group | Auth required |
|---|---|
| Browse routes, view route | No |
| Create / delete routes | Yes (delete requires ownership) |
| Save / send routes | Yes |
| Profile read/update | Yes |
| Hardware control | No (local network only) |
| ML prediction | No |

Google OAuth is handled via Supabase's PKCE flow. The frontend initiates the redirect; Supabase handles the callback and issues a standard JWT. No backend changes are needed for OAuth vs email auth.

---

### Environment Variables

**Backend `.env`:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
DEBUG=true
```

**Frontend `.env`:**
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
REACT_APP_API_URL=http://localhost:8000
```

---

## 3. Database

Hosted on Supabase (cloud PostgreSQL). Row Level Security is enabled on all tables.

### Schema

#### `routes`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key, auto-generated |
| `name` | TEXT | Route name |
| `difficulty` | INTEGER | V-scale (0–10+), stored as int |
| `font_grade` | TEXT | Font scale equivalent |
| `holds` | JSONB | Array of hold objects (see below) |
| `angle` | INTEGER | Board angle in degrees |
| `visibility` | TEXT | `public` or `private` |
| `send_count` | INTEGER | Number of times sent |
| `creator_id` | UUID | FK → `profiles.id` |
| `created_at` | TIMESTAMP | Auto-set |
| `description` | TEXT | Optional route description |

#### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | FK → `auth.users.id` |
| `name` | TEXT | Display name |
| `username` | TEXT | Unique handle |
| `email` | TEXT | From auth |
| `photo_url` | TEXT | Avatar URL |
| `climber_level` | TEXT | Self-reported level |

#### `route_holds`

Holds are stored in their own table, not as JSONB on the routes row.

| Column | Type | Notes |
|---|---|---|
| `route_id` | UUID | FK → `routes.id` |
| `x` | FLOAT | Grid x coordinate |
| `y` | FLOAT | Grid y coordinate |
| `color` | TEXT | Hold color / role |
| `position` | INTEGER | Index within the route (insertion order) |

#### `user_saved_routes`

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | FK → `profiles.id` |
| `route_id` | UUID | FK → `routes.id` |
| `saved_at` | TIMESTAMP | |
| `is_favorite` | BOOLEAN | |

#### `sends`

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | FK → `profiles.id` |
| `route_id` | UUID | FK → `routes.id` |
| `sent_at` | TIMESTAMP | |

#### `sessions`

| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID | FK → `profiles.id` |
| `started_at` | TIMESTAMP | Login session timestamp |

### Hold Format

The API returns holds as a plain list attached to each route. The `route_holds` table has only `x`, `y`, `color` — `displayX`/`displayY` are computed on the frontend for rendering and are never stored.

```json
{ "x": 5.0, "y": 7.5, "color": "blue" }
```

- `x` / `y` — grid position (x: 0–10, y: 0–14, 0.5-step increments)
- `color` — `blue` (hand hold), `green` (start hold), `red` (finish hold), `yellow` (foot hold)

---

## 4. ML Model

### Model Architecture

The V4 Hybrid model is trained on ~4,400 Kilter Board routes. It uses two parallel input branches that are concatenated before the final prediction head:

1. **CNN branch** — reads the route as a 15×11 grid image (one channel per hold color), capturing spatial layout and movement patterns
2. **Dense branch** — processes scalar features: hold count, average hold type, hold spacing statistics, board angle, and movement dynamics

The model is exported to ONNX format for inference (`sendit_v2.onnx`) and loaded once at server startup in `services/ml_predictor.py`. Scalers for the dense branch features are stored in `sendit_v2_scalers.pkl`.

### Coordinate & Type Conversion

The frontend sends holds in grid coordinates. The ML service converts them internally:

**Color to role mapping:**
```
green  → ROLE_START  (start hold)
blue   → ROLE_HAND   (hand hold)
yellow → ROLE_FOOT   (foot hold)
red    → ROLE_FINISH (finish hold)
```

### Prediction Endpoint

`POST /ml/predict` accepts the same hold format used throughout the system. The model outputs a continuous float which is rounded and clamped to 0–16 (V0–V10+). The response includes a `suggested_grade` string (e.g. `"v5"`), the raw float, a confidence float, and a `path` array — the holds reordered in the inferred climbing sequence. Has a rate limit of 30 requests/minute per IP.

---

## 5. Hardware

### Wiring

```
Raspberry Pi 4B
  GPIO 18 (data out)
      |
  74AHCT125 level shifter  ← 5V VCC, GND
      |
  WS2811 LED strip (data in)
      |
  225 LEDs in series / parallel chains
      |
  10A 5V regulated power supply
```

The Pi's GPIO outputs 3.3V logic. WS2811 LEDs require 5V data signal. The 74AHCT125 quad bus buffer shifts 3.3V → 5V without inversion and is essential — driving the strips directly from 3.3V GPIO is unreliable.

### LED Mapping

Each hold coordinate maps to a physical LED index via a flat lookup dictionary (`COORD_TO_LED`) in `services/led.py`. The key is a `"x,y"` string and the value is the LED index (25–249). The first 25 indices are unused — they're the wiring lead before the first hold position.

```python
COORD_TO_LED = {
    "0,0": 25, "1,0": 26, "1.5,0.5": 27, ...  # 225 entries total
}
```

When a route is selected, the backend:
1. Fetches the route's holds from `route_holds`
2. Looks up each `"x,y"` key in `COORD_TO_LED` to get the LED index
3. Maps each hold's color to an RGB tuple
4. Pushes the update via the `neopixel` library (Adafruit CircuitPython)

If the backend is running somewhere other than the Pi (dev machine, etc.), the LED calls no-op gracefully and return a `"simulated"` status instead of erroring.

Hold color → LED color:
```
blue   → (0, 0, 255)
green  → (0, 255, 0)
yellow → (255, 255, 0)
red    → (255, 0, 0)
```

The entire route-to-LED pipeline completes in under one second from user selection.

### Power

- **Supply:** 5V, 10A regulated
- **Typical route draw:** ~1.2A (varies with number of lit holds and brightness)
- **Max theoretical draw:** 225 LEDs × 60mA = 13.5A at full white — in practice routes use a fraction of LEDs and never approach this
- **Brightness** is configurable in `services/led.py`; default is set for comfortable indoor visibility

---

## 6. Frontend

### Pages & Components

```
src/
├── App.js                      # Router, auth context
├── supabaseClient.js           # Supabase client init
├── routeCache.js               # In-memory route cache
├── components/
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Navigation.jsx
│   │   ├── MobileMenu.jsx
│   │   └── MobileBottomNav.jsx
│   ├── common/
│   │   ├── AuthModal.jsx       # Login/signup, Google OAuth
│   │   ├── InteractiveBoard.jsx # Click-to-build route creator
│   │   ├── BoardPreview.jsx    # Read-only board display
│   │   ├── ProblemCard.jsx     # Route card (explore view)
│   │   └── StatCard.jsx        # Dashboard stats
│   └── pages/
│       ├── HomePage.jsx        # Landing / hero
│       ├── ExplorePage.jsx     # Browse & filter routes
│       ├── CreatePage.jsx      # Route builder
│       ├── SavedPage.jsx       # Bookmarked routes
│       ├── ProfilePage.jsx     # User profile & stats
│       ├── YourRoutesPage.jsx  # Routes the user created
│       └── partials/
│           └── FullscreenPost.jsx  # Route detail + LED trigger
```

### Coordinate System

The board uses a calibrated grid to map click positions to physical hold locations.

**Grid dimensions:** x: 0–10, y: 0–14, in 0.5-step increments

When a user clicks on `InteractiveBoard.jsx`:
1. The click position is converted to a percentage offset within the board image
2. The percentage is snapped to the nearest 0.5 grid increment
3. The hold is stored with both `x`/`y` (grid) and `displayX`/`displayY` (percentage) values
4. On render, `displayX`/`displayY` positions the hold overlay on the board image

**Hold colors cycle** on repeated clicks of the same hold: Blue → Green → Yellow → Purple → (remove)

**Export format** (sent to backend and ML model):
```json
{ "x": 5.0, "y": 7.5, "color": "blue" }
```

### Auth Flow

1. User clicks Login — `AuthModal.jsx` opens
2. **Email/password:** Supabase `signInWithPassword` → returns session with `access_token`
3. **Google OAuth:** Supabase `signInWithOAuth` initiates PKCE redirect → Supabase handles callback → same session result
4. Session stored by Supabase JS client (localStorage)
5. `App.js` listens to `onAuthStateChange` and provides user context via React Context
6. Authenticated requests attach `Authorization: Bearer <access_token>` header
7. On logout, Supabase `signOut` clears session; protected pages redirect to home
