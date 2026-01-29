# SendStone Backend Implementation Plan

---

# Part 1: For Chloe (Database)

## What I Need From the Database

I need to query your database and get data back in specific formats. You can structure the tables however you want internally, but here's what I need to be able to retrieve.

---

### Data Format: Routes

When I query for routes, I need this JSON structure back:

```json
{
  "id": "uuid-string",
  "name": "Bell of the Wall",
  "difficulty": "v5",
  "description": "Optional description text",
  "holds": [
    {"x": 5.0, "y": 7.0, "color": "blue"},
    {"x": 3.0, "y": 4.0, "color": "green"},
    {"x": 6.5, "y": 2.5, "color": "yellow"}
  ],
  "angle": 40,
  "visibility": "public",
  "sends": 42,
  "creator_id": "user-uuid-or-null",
  "quality_average": 2.96,
  "ascensionist_count": 68088,
  "ai_suggested_grade": "v5",
  "created_at": "2025-11-05T08:40:22Z",
  "updated_at": "2025-11-05T08:40:22Z"
}
```

**Field Definitions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Unique identifier |
| `name` | text | Yes | Route name |
| `difficulty` | text | Yes | V-grade lowercase ("v0" through "v12") |
| `description` | text | No | Optional description |
| `holds` | jsonb | Yes | Array of hold objects (see below) |
| `angle` | integer | Yes | Wall angle in degrees (default 40) |
| `visibility` | text | Yes | "public" or "private" |
| `sends` | integer | Yes | Number of likes (default 0) |
| `creator_id` | uuid | No | References users.id, null for imports |
| `quality_average` | numeric | No | Star rating from Kilter data |
| `ascensionist_count` | integer | No | Completions from Kilter data |
| `ai_suggested_grade` | text | No | ML model prediction |
| `created_at` | timestamp | Yes | When created |
| `updated_at` | timestamp | No | When last modified |

**Hold Object Format:**

```json
{"x": 5.0, "y": 7.0, "color": "blue"}
```

| Field | Type | Description |
|-------|------|-------------|
| `x` | float | 0-10 (with 0.5 increments for screw-ons) |
| `y` | float | 0-14 (with 0.5 increments for screw-ons) |
| `color` | text | "green", "blue", "yellow", or "purple" |

**Color Meanings:**
- `green` = start holds
- `blue` = hand holds  
- `yellow` = foot holds
- `purple` = finish holds

---

### Data Format: Users

```json
{
  "id": "uuid-string",
  "name": "Alex Rivera",
  "email": "alex@example.com",
  "username": "alex_climbs",
  "photo_url": "https://...",
  "climber_level": "intermediate",
  "created_at": "2025-10-27T23:28:11Z",
  "updated_at": "2025-10-27T23:28:11Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | Yes | Unique identifier |
| `name` | text | Yes | Display name |
| `email` | text | Yes | Unique email |
| `username` | text | Yes | Unique username for @mentions |
| `photo_url` | text | No | Profile picture URL |
| `climber_level` | text | No | beginner/intermediate/advanced/expert |
| `created_at` | timestamp | Yes | When created |
| `updated_at` | timestamp | No | When last modified |

---

### Data Format: Saved Routes (Bookmarks)

When I query for a user's saved routes:

```json
{
  "user_id": "user-uuid",
  "route_id": "route-uuid",
  "saved_at": "2025-11-05T08:40:22Z"
}
```

I'll also need to get the full route data with it (JOIN or separate query).

---

### Data Format: Sends (Likes)

```json
{
  "user_id": "user-uuid",
  "route_id": "route-uuid",
  "created_at": "2025-11-05T08:40:22Z"
}
```

---

### Queries I Need to Support

**Routes:**
1. Get all public routes (with pagination, sorting)
2. Get routes filtered by difficulty (e.g., all v5 routes)
3. Get routes filtered by search term (name contains "...")
4. Get single route by ID
5. Create new route
6. Update route (for editing)
7. Increment/decrement sends count when liked/unliked

**Users:**
1. Get user by ID
2. Get user by email (for login)
3. Create new user (for registration)
4. Update user (for profile edits)

**Saved Routes:**
1. Get all routes saved by a user (with full route data)
2. Add a saved route (user bookmarks a route)
3. Remove a saved route (user unbookmarks)
4. Check if user has saved a specific route

**Sends:**
1. Add a send (user likes a route) + increment routes.sends
2. Remove a send (user unlikes) + decrement routes.sends
3. Check if user has liked a specific route
4. Get all route IDs a user has liked

---

### My Recommendation (Optional)

The easiest setup for me would be:

**routes table** with `holds` as a JSONB column (not a separate table)

This way I can do:
```python
supabase.table("routes").select("*").execute()
```

And get everything I need in one query.

If you prefer normalized tables, that works too - I'll just need to do JOINs or multiple queries. Let me know how you want to structure it and I'll adapt.

---
---

### Database Recommendations

**Tables we need:**

| Table | Purpose | Notes |
|-------|---------|-------|
| `routes` | Store climbing routes | Add `holds` as JSONB column |
| `users` | User accounts | Add `username`, `photo_url` columns |
| `user_saved_routes` | Bookmarks | Already exists, looks good |
| `sends` | Track likes | Need to create (user_id, route_id, created_at) |

**Tables we DON'T need:**

| Table | Why not |
|-------|---------|
| `colors` | Just storing color as text string in holds ("green", "blue", etc.) |
| `route_nodes` | We can keep this if you decide to keep current structure isntead of using JSONB holds array instead of separate table |
| `routes_stg` | Staging table, can delete |
| `device_commands` | Handling LED control in backend code |

**Columns to add to `routes`:**

| Column | Type | Why |
|--------|------|-----|
| `holds` | jsonb | Store holds array directly: `[{"x": 5, "y": 7, "color": "blue"}, ...]` |
| `visibility` | text | "public" or "private" |
| `sends` | integer | Like count (default 0) |

**Columns to add to `users`:**

| Column | Type | Why |
|--------|------|-----|
| `username` | text (unique) | Display name for @mentions |
| `photo_url` | text | Profile picture from Google OAuth |

**The big recommendation:**

Store holds as JSONB in the routes table, not as a separate `route_nodes` table. This makes queries way simpler - I can get a full route with one query instead of joining tables.

Example of what `holds` column looks like:
```json
[
  {"x": 5.0, "y": 7.0, "color": "blue"},
  {"x": 3.0, "y": 4.0, "color": "green"},
  {"x": 6.0, "y": 14.0, "color": "purple"}
]
```

---


### Data We Need to Import

I have ~5,500 routes from the Kilter database in CSV format. The CSV has:

```csv
name,font_grade,ai_predicted_difficulty,setter_username,holds_json,created_at,is_draft,angle,difficulty_average,quality_average,ascensionist_count,uuid
```

We need to import these into the routes table. I will send you the new CSV soon but i can wait until we make the necessary changes to the DB if you want.

---

---

# Part 2: For Ryan (Frontend)

## API Endpoints You Can Use

Base URL: `http://<pi-ip>:8000` (or whatever we configure)

All responses are JSON. Errors return: `{"error": {"code": "string", "message": "string"}}`

---

### Routes Endpoints

#### GET /routes
List public routes with optional filters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | - | Filter by name (partial match) |
| `difficulty` | string | - | Filter by grade ("v5") |
| `sort` | string | `-created_at` | Sort field. Prefix `-` for descending |
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Results per page (max 100) |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Bell of the Wall",
      "difficulty": "v5",
      "description": null,
      "holds": [
        {"x": 5.0, "y": 7.0, "color": "blue"},
        {"x": 3.0, "y": 4.0, "color": "green"}
      ],
      "angle": 40,
      "visibility": "public",
      "sends": 42,
      "creator_id": null,
      "created_at": "2025-11-05T08:40:22Z"
    }
  ],
  "page": 1,
  "total": 5547
}
```

---

#### GET /routes/{id}
Get single route by ID.

**Response:**
```json
{
  "id": "uuid",
  "name": "Bell of the Wall",
  "difficulty": "v5",
  "holds": [...],
  ...
}
```

---

#### POST /routes
Create new route. **Requires auth.**

**Request Body:**
```json
{
  "name": "My Cool Route",
  "difficulty": "v5",
  "description": "Optional",
  "holds": [
    {"x": 5.0, "y": 7.0, "color": "blue"}
  ],
  "visibility": "public"
}
```

**Response:** The created route object.

---

#### PATCH /routes/{id}
Update a route. **Requires auth. Must be owner.**

**Request Body:** (any fields you want to update)
```json
{
  "name": "New Name",
  "difficulty": "v6"
}
```

---

#### PUT /routes/{id}/save
Save/bookmark a route. **Requires auth.**

**Response:**
```json
{
  "saved": true,
  "saved_at": "2025-11-05T08:40:22Z"
}
```

---

#### DELETE /routes/{id}/save
Remove bookmark. **Requires auth.**

**Response:**
```json
{
  "saved": false
}
```

---

#### PUT /routes/{id}/send
Like a route. **Requires auth.**

**Response:**
```json
{
  "liked": true,
  "sends": 43
}
```

---

#### DELETE /routes/{id}/send
Unlike a route. **Requires auth.**

**Response:**
```json
{
  "liked": false,
  "sends": 42
}
```

---

### User Endpoints

#### GET /users/me
Get current logged-in user. **Requires auth.**

**Response:**
```json
{
  "id": "uuid",
  "name": "Alex Rivera",
  "email": "alex@example.com",
  "username": "alex_climbs",
  "photo_url": "https://...",
  "climber_level": "intermediate",
  "created_at": "2025-10-27T23:28:11Z"
}
```

---

#### PATCH /users/me
Update current user profile. **Requires auth.**

**Request Body:**
```json
{
  "name": "New Name",
  "username": "new_username",
  "climber_level": "advanced"
}
```

---

#### GET /users/me/saved
Get current user's saved routes. **Requires auth.**

**Response:**
```json
{
  "items": [
    {
      "route": { ...full route object... },
      "saved_at": "2025-11-05T08:40:22Z"
    }
  ]
}
```

---

#### GET /users/me/sends
Get IDs of routes current user has liked. **Requires auth.**

**Response:**
```json
{
  "route_ids": ["uuid1", "uuid2", "uuid3"]
}
```

---

### Auth Endpoints

#### POST /auth/register
Create new account.

**Request Body:**
```json
{
  "name": "Alex Rivera",
  "email": "alex@example.com",
  "username": "alex_climbs",
  "password": "securepassword",
  "climber_level": "beginner"
}
```

**Response:**
```json
{
  "token": "jwt-token-string",
  "user": { ...user object... }
}
```

---

#### POST /auth/login
Login with email/password.

**Request Body:**
```json
{
  "email": "alex@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "jwt-token-string",
  "user": { ...user object... }
}
```

---

#### POST /auth/google
Login with Google OAuth token.

**Request Body:**
```json
{
  "google_token": "token-from-google-oauth"
}
```

**Response:** Same as login.

---

### Hardware Endpoints

#### POST /hardware/led/routes/{id}
Display a route on the LED board.

**Request Body (we dont really need a body for this since the data is stored in the route itself so if we have route id we can get all the LED coordinates without any additional information )**


**Response:**
```json
{
  "status": "displayed",
  "route_id": "uuid"
}
```

---

#### POST /hardware/led/preview
Preview arbitrary holds (for route creation screen).

**Request Body:**
```json
{
  "holds": [
    {"x": 5.0, "y": 7.0, "color": "blue"}
  ]
}
```

**Response:**
```json
{
  "status": "previewing",
  "hold_count": 5
}
```

---

#### POST /hardware/led/off
Turn off all LEDs.

**Response:**
```json
{
  "status": "cleared"
}
```

---

#### GET /hardware/led/status
Check if board is online.

**Response:**
```json
{
  "online": true,
  "led_count": 225
}
```

---

### Auth Header Format

For protected endpoints, include:
```
Authorization: Bearer <jwt-token>
```

---

---

# Part 3: For Gabe (Backend Implementation)

## Architecture Overview

```
React (Ryan)  ──HTTP──▶  FastAPI (You)  ──Supabase Client──▶  PostgreSQL (Chloe)
                              │
                              ▼
                         LED Board (GPIO)
                              │
                              ▼
                         ML Model (PyTorch)
```

**FastAPI responsibilities:**
- Receive HTTP requests from React
- Validate request data
- Query Supabase
- Transform data if needed
- Handle auth (JWT tokens)
- Control LEDs
- Run ML predictions
- Return JSON responses

---

## Supabase Connection

You'll use the `supabase-py` library to query the database.

**Install:**
```bash
pip install supabase
```

**Get credentials from Supabase dashboard:**
- Project URL: `https://yvmxxvmzeslhteoohuhv.supabase.co`
- API Key: Settings → API → `anon` key (for normal queries) or `service_role` key (for admin)

**Basic usage pattern:**
```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# SELECT * FROM routes WHERE visibility = 'public' ORDER BY created_at DESC LIMIT 20
response = supabase.table("routes").select("*").eq("visibility", "public").order("created_at", desc=True).limit(20).execute()
routes = response.data  # List of dicts

# SELECT * FROM routes WHERE id = 'uuid'
response = supabase.table("routes").select("*").eq("id", route_id).single().execute()
route = response.data  # Single dict

# INSERT INTO routes (name, difficulty, holds) VALUES (...)
response = supabase.table("routes").insert({"name": "...", "difficulty": "v5", "holds": [...]}).execute()

# UPDATE routes SET sends = 10 WHERE id = 'uuid'
response = supabase.table("routes").update({"sends": 10}).eq("id", route_id).execute()

# DELETE FROM saved_routes WHERE user_id = 'x' AND route_id = 'y'
response = supabase.table("saved_routes").delete().eq("user_id", uid).eq("route_id", rid).execute()
```

---

## Project Structure

```
sendstone-backend/
├── main.py              # FastAPI app setup, CORS, startup
├── config.py            # Environment variables
├── requirements.txt     # Dependencies
├── .env                 # Secrets (don't commit!)
│
├── routers/
│   ├── routes.py        # /routes endpoints
│   ├── users.py         # /users endpoints
│   ├── auth.py          # /auth endpoints
│   └── hardware.py      # /hardware endpoints
│
├── services/
│   ├── db.py            # Supabase client setup
│   ├── auth.py          # JWT creation/validation
│   ├── led.py           # LED control functions
│   └── ml.py            # Grade prediction
│
└── models/
    ├── route.py         # Pydantic models for routes
    ├── user.py          # Pydantic models for users
    └── hardware.py      # Pydantic models for LED requests
```

---

## Implementation Priority

### Priority 1: Core Demo (Do First)

**Goal:** Browse routes on web → Select route → LEDs light up

**Endpoints needed:**
1. `GET /routes` - list routes
2. `GET /routes/{id}` - single route
3. `POST /hardware/led/routes/{id}` - light up route
4. `POST /hardware/led/off` - clear LEDs

**Steps:**
1. Set up FastAPI project structure
2. Connect to Supabase
3. Create routes router with GET endpoints
4. Create hardware router with LED control
5. Test end-to-end

---

### Priority 2: Route Creation

**Goal:** User creates route on frontend → Preview on board → Save to database

**Endpoints needed:**
1. `POST /routes` - create route
2. `POST /hardware/led/preview` - preview holds

**Steps:**
1. Add POST endpoint to routes router
2. Add preview endpoint to hardware router
3. Test route creation flow

---

### Priority 3: Authentication

**Goal:** Users can log in and have persistent accounts

**Endpoints needed:**
1. `POST /auth/register`
2. `POST /auth/login`
3. `POST /auth/google` (if doing OAuth)
4. `GET /users/me`

**Steps:**
1. Set up JWT token creation/validation
2. Create auth router
3. Create auth middleware/dependency
4. Add user endpoints
5. Decide: custom auth or Supabase Auth?

---

### Priority 4: User Interactions

**Goal:** Users can save and like routes

**Endpoints needed:**
1. `PUT /routes/{id}/save`
2. `DELETE /routes/{id}/save`
3. `GET /users/me/saved`
4. `PUT /routes/{id}/send`
5. `DELETE /routes/{id}/send`
6. `GET /users/me/sends`

**Steps:**
1. Add save/unsave endpoints
2. Add send/unsend endpoints (with send count update)
3. Add user's saved/sends list endpoints

---

### Priority 5: AI Grade Prediction

**Goal:** When creating route, get AI-suggested difficulty

**Endpoints needed:**
1. `POST /ml/predict` - predict grade for holds

**Steps:**
1. Load trained model
2. Create prediction endpoint
3. Integrate with route creation flow

---

### AI Grading Endpoint

#### POST /ml/predict
Get AI-suggested difficulty for a set of holds.

**Request Body:**
```json
{
  "holds": [
    {"x": 5.0, "y": 7.0, "color": "blue"},
    {"x": 3.0, "y": 4.0, "color": "green"},
    {"x": 6.0, "y": 14.0, "color": "purple"}
  ],
  "angle": 40
}
```

**Response:**
```json
{
  "suggested_grade": "v5",
  "confidence": 0.72
}
```

**Use cases:**
1. **Creating new route:** User places holds → clicks "Get AI Grade" → sees suggestion → can accept it or enter their own grade
2. **Testing existing routes:** User opens any route → clicks "Test AI" → sees what AI thinks vs actual grade → fun accuracy check

**Notes:**
- This does NOT save anything to database
- Just takes holds in, returns prediction
- User decides what to do with the suggestion
- For imported Kilter routes, we already have the real grade - AI prediction is just for comparison/fun

**Flow - New route creation:**
```
User places holds → POST /ml/predict → "AI says v5" → User types "v6" if they disagree → POST /routes saves with "v6"
```

**Flow - Testing existing route:**
```
User views route (already has grade "v5") → clicks "Test AI" → POST /ml/predict → "AI says v6" → User sees "Actual: v5, AI: v6" → fun comparison
```

---

## LED Mapping

The coordinate-to-LED mapping lives in your code, not the database.

After you wire the board, create a dictionary:

```python
# services/led.py

COORD_TO_LED = {
    (0, 0): 0,
    (1, 0): 1,
    # ... fill in after wiring
    (5.5, 3.5): 180,  # half-steps for screw-ons
    # ...
}

def get_led_index(x: float, y: float) -> int | None:
    return COORD_TO_LED.get((x, y))
```

**Color to RGB:**
```python
COLORS = {
    "green":  (34, 197, 94),
    "blue":   (5, 103, 232),
    "yellow": (234, 179, 8),
    "purple": (147, 51, 234),
}
```

---

## Environment Variables

Create `.env` file:

```
SUPABASE_URL=https://yvmxxvmzeslhteoohuhv.supabase.co
SUPABASE_KEY=your-key-here
JWT_SECRET=random-secret-string-make-it-long
```

Load in `config.py`:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    JWT_SECRET: str
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Data Transformation Notes

If Chloe's DB format matches what Ryan needs, no transformation required.

If there are differences, transform in the endpoint before returning:

**Example:** If DB stores `difficulty` but Ryan wants `grade`:
```python
@router.get("/routes/{id}")
async def get_route(id: str):
    data = supabase.table("routes").select("*").eq("id", id).single().execute()
    route = data.data
    
    # Transform if needed
    # route["grade"] = route.pop("difficulty")
    
    return route
```

**Keep it simple:** Try to align DB format with API format so minimal transformation is needed.

---

## Naming Conventions

**Consistent names across the system:**

| Concept | DB Column | API Field | Notes |
|---------|-----------|-----------|-------|
| Route/Problem | `routes` table | `/routes` endpoint | We call them "routes" everywhere |
| Difficulty | `difficulty` | `difficulty` | Lowercase v-grade: "v5" |
| Holds | `holds` | `holds` | JSONB array |
| Coordinates | `x`, `y` | `x`, `y` | 0-10, 0-14 with 0.5 steps |
| Hold color | `color` | `color` | "green", "blue", "yellow", "purple" |
| Like count | `sends` | `sends` | Number of likes |
| Bookmark | `saved_routes` | `/routes/{id}/save` | User's saved routes |
| Like action | `sends` table | `/routes/{id}/send` | Confusing but "send" is climbing term |

---

## Testing Checklist

**Priority 1 complete when:**
- [ ] Can hit `GET /routes` and see list of routes from DB
- [ ] Can hit `GET /routes/{id}` and see single route with holds
- [ ] Can hit `POST /hardware/led/routes/{id}` and LEDs light up
- [ ] Can hit `POST /hardware/led/off` and LEDs turn off
- [ ] React app can browse routes and light up board

**Priority 2 complete when:**
- [ ] Can create route via `POST /routes`
- [ ] Can preview holds while creating via `POST /hardware/led/preview`

**Priority 3 complete when:**
- [ ] Can register new user
- [ ] Can login and get JWT token
- [ ] Can access `GET /users/me` with token

**Priority 4 complete when:**
- [ ] Can save/unsave routes
- [ ] Can like/unlike routes
- [ ] Like count updates correctly

**Priority 5 complete when:**
- [ ] Can get AI grade prediction for holds

---

## Quick Start Steps

1. **Create project folder and virtual environment**
2. **Install dependencies:** `fastapi`, `uvicorn`, `supabase`, `python-dotenv`, `pydantic-settings`
3. **Create `.env` with Supabase credentials**
4. **Create `main.py` with basic FastAPI app**
5. **Create `services/db.py` with Supabase client**
6. **Create `routers/routes.py` with GET endpoints**
7. **Test with `uvicorn main:app --reload`**
8. **Hit `http://localhost:8000/routes` and verify data comes back**
9. **Add hardware router once LED wiring is done**

---

## Questions to Resolve

1. **Auth strategy:** Custom JWT in FastAPI, or use Supabase Auth?
   - Custom = more control, more code
   - Supabase Auth = easier, but need to learn their system

2. **Holds storage:** JSONB in routes table, or separate table?
   - JSONB = simpler queries
   - Separate = more "proper" but annoying to query

3. **LED wiring pattern:** Need to map coordinates after physical wiring

4. **ML model location:** Run on Pi, or separate service?
   - Pi should be fine for inference, model is small

---

## Summary

**Chloe:** Store routes with holds as JSONB. I'll query your tables directly via Supabase client.

**Ryan:** Hit my API endpoints, I'll return JSON data. Auth uses Bearer token in header.

**Gabe:** Build FastAPI app, connect to Supabase, add LED control, prioritize demo flow first.
