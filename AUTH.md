# SendStone Authentication

## Overview

SendStone uses **JWT Bearer tokens** for authenticating API requests. When a user logs in via the React frontend, Supabase issues a signed JWT. The frontend attaches that token to every sensitive API request as an `Authorization: Bearer <token>` header. The FastAPI backend verifies the token locally — no external network call needed — and extracts the user's ID.

---

## How it works end-to-end

### 1. Login (frontend)
The user logs in via Supabase Auth (email/password or OAuth). Supabase returns a JWT access token and stores it in the browser via `supabase.auth.getSession()`.

### 2. Attaching the token (frontend)
Before any authenticated fetch call, the frontend retrieves the current session token:

```js
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { 'Authorization': `Bearer ${session.access_token}` };
};
```

This header is added to requests like saving a route, viewing your saved routes, fetching dashboard stats, etc.

### 3. Verifying the token (backend)

All protected FastAPI endpoints use one of two dependency functions defined in `app/dependencies.py`:

- `get_current_user` — required auth. Returns the user's UUID or raises a 401.
- `get_optional_user` — optional auth. Returns the UUID if a valid token is present, otherwise `None`.

Example usage in a route:
```python
@router.get("/meta/saved")
async def get_saved_routes(current_user_id: str = Depends(get_current_user)):
    # current_user_id is the verified Supabase UUID
    ...
```

### 4. What the verification actually does

The token is a standard JWT with three parts: `header.payload.signature`, all base64url-encoded.

The backend does three things in `_decode_supabase_jwt()`:

1. **Signature verification** — recomputes the HS256 HMAC using `SUPABASE_JWT_SECRET` and compares it against the signature in the token using `hmac.compare_digest()` (constant-time, immune to timing attacks). If they don't match, the token is rejected.

2. **Expiration check** — reads the `exp` claim from the payload and rejects any token where `time.time() > exp`.

3. **User ID extraction** — reads the `sub` claim, which is the Supabase user UUID. This becomes `current_user_id` in the endpoint.

This is entirely local computation — no HTTP request to Supabase or any external service. It runs in microseconds.

---

## Why Bearer tokens instead of cookies

Cookies are the traditional way to manage sessions in web apps, but they come with a set of problems that Bearer tokens avoid for this app's architecture.

### CSRF attacks
When a browser makes a request to a domain, it automatically includes any cookies for that domain — even if the request was triggered by a different site. This is the basis of Cross-Site Request Forgery (CSRF). A malicious site can trick a logged-in user's browser into making authenticated requests to your API without the user knowing.

Bearer tokens don't have this problem. They live in JavaScript memory or localStorage, not in cookies. The browser never automatically attaches them to requests — the frontend code has to explicitly add the `Authorization` header. A malicious third-party site has no way to do that.

### Cross-origin and multi-client access
This app runs on a Raspberry Pi accessible over Tailscale from multiple devices and ports. Cookies are tied to a domain and require the `SameSite`, `Secure`, and `Domain` attributes to be carefully configured for cross-origin access. With `allow_credentials=True` in CORS, the allowed origins list must be explicit — wildcards don't work.

Bearer tokens have none of these constraints. The frontend just puts the token in a header. It works from any origin, any port, any client — including the Pi served at a local IP and the laptop hitting it over Tailscale.

### Stateless backend
Cookie-based sessions typically require the server to maintain session state — either in a database or in-memory store. The server has to look up every cookie to know who it belongs to.

JWTs are self-contained. The user's ID and expiration are inside the token itself. The backend verifies it and extracts the user ID without any database lookup. The backend is fully stateless with respect to auth — every instance handles every request independently.

### Why not `httpOnly` cookies with the JWT inside?
`httpOnly` cookies (where the cookie is set by the server and not accessible to JavaScript) are a valid, secure approach used by many production apps. The reason we didn't go that route here:

- Supabase's frontend SDK manages the token lifecycle automatically — refresh, storage, expiry. It's designed to work with Bearer tokens, not server-set cookies.
- Setting up a cookie-based flow would require a backend endpoint to set/clear the cookie on login/logout, handle `SameSite=None; Secure` across Tailscale origins, and coordinate with Supabase's token refresh cycle. That's significant complexity for no real security gain in this deployment.
- The threat model here is Tailscale-protected access. CSRF is a meaningful threat when your API is exposed to the open internet. Since access is restricted to your Tailscale network, the risk profile is lower.

---

## What endpoints require auth

| Endpoint | Auth required |
|---|---|
| `GET /routes` | No (public explore) — but `include_private=true` only works if the token matches the `creator_id` |
| `GET /routes/meta/saved` | Yes |
| `GET /routes/meta/sent_ids` | Yes |
| `POST /routes` | Yes |
| `DELETE /routes/{id}` | Yes — must be the creator |
| `PUT /routes/{id}/save` | Yes |
| `DELETE /routes/{id}/save` | Yes |
| `PUT /routes/{id}/send` | Yes |
| `DELETE /routes/{id}/send` | Yes |
| `GET /profiles/{id}/dashboard` | Yes — must be your own ID |
| `POST /profiles/{id}/sessions` | Yes — must be your own ID |
| `PATCH /profiles/{id}` | Yes — must be your own ID |
| `DELETE /profiles/{id}` | Yes — must be your own ID |
| `POST /profiles/{id}/photo` | Yes — must be your own ID |
| `GET /hardware/led/*` | No — Tailscale-only, speed priority |
| `POST /hardware/led/*` | No — Tailscale-only, speed priority |
| `POST /ml/predict` | No — open to all, IP rate-limited (20 req/min) |

---

## Configuration

Add to `Backend/.env`:
```
SUPABASE_JWT_SECRET=your_jwt_secret_here
```

Find it in: Supabase Dashboard → your project → Settings → API → **JWT Secret**.

This is a different value from the anon key and the service role key.
