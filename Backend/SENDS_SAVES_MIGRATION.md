# Plan: Simplify Sends/Saves

## Overview

**Before (confusing):**
- `sends` table → actually stores "likes"
- `routes.likes` → like count
- `routes.ascensionist_count` → Kilter completion count
- `user_saved_routes` → bookmarks

**After (clean):**
- `sends` table → stores completions (correct!)
- `routes.send_count` → completion count (includes Kilter data)
- `user_saved_routes` → bookmarks (unchanged)
- NO MORE LIKES

---

## Step 1: Database Changes (Supabase SQL Editor)

Run these SQL commands in Supabase SQL Editor in order:

### 1.1 Add send_count column
```sql
ALTER TABLE routes ADD COLUMN IF NOT EXISTS send_count INTEGER DEFAULT 0;
```

### 1.2 Migrate data from old columns
```sql
UPDATE routes
SET send_count = COALESCE(ascensionist_count, 0) + COALESCE(likes, 0);
```

### 1.3 Verify migration worked
```sql
SELECT id, name, send_count, likes, ascensionist_count FROM routes LIMIT 10;
```

### 1.4 Drop old columns (only after verifying 1.3)
```sql
ALTER TABLE routes DROP COLUMN IF EXISTS likes;
ALTER TABLE routes DROP COLUMN IF EXISTS ascensionist_count;
```

### 1.5 Final verification
```sql
SELECT id, name, send_count FROM routes LIMIT 10;
```

---

## Step 2: Backend Code Changes (DONE)

All code changes have been made to:
- `app/models.py` - `send_count` field
- `app/routers/routes.py` - send/unsend endpoints
- `tests/test_api.py` - updated assertions

---

## Step 3: Verification

After running SQL:
```bash
cd SendStone/Backend
python -m uvicorn main:app --reload
# Then run tests
python -m pytest tests/test_api.py -v
```

---

## Final API Endpoints

| Action | Method | Endpoint | Response |
|--------|--------|----------|----------|
| List routes | GET | `/routes` | includes `send_count` |
| Save route | PUT | `/routes/{id}/save` | `{"saved": true, "saved_at": "..."}` |
| Unsave route | DELETE | `/routes/{id}/save` | `{"saved": false}` |
| Log send | PUT | `/routes/{id}/send` | `{"sent": true, "send_count": N}` |
| Remove send | DELETE | `/routes/{id}/send` | `{"sent": false, "send_count": N}` |
