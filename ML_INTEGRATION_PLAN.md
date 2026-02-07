# ML Integration & Frontend Route Creation Plan

## Goal
Send route coordinates + angle to backend → get predicted V-grade back.

---

## Current State

### What We Have

| Component | Location | Status |
|-----------|----------|--------|
| FastAPI Backend | `SendStone/Backend/` | ✅ Working (port 8000) |
| Flask ML Server | `UnderstandingDB/finalProject/ui/server.py` | ✅ Working (port 5002) |
| Frontend CreatePage | `SendStone/Frontend/src/components/pages/CreatePage.jsx` | ✅ Has UI, needs API integration |
| InteractiveBoard | `SendStone/Frontend/src/components/common/InteractiveBoard.jsx` | ✅ Click tracking works |

### Coordinate Systems (IMPORTANT)
- **Frontend**: Stores holds as `{ x: 0-100%, y: 0-100%, type: 1-4 }`
- **ML Model**: Expects `{ gridX: 0-10, gridY: 0-14, type: 1-4 }`
- **Backend DB**: Stores as `{ x: 0-10, y: 0-14, color: "blue" }`

### Hold Type Mapping
| Type | Color | Meaning |
|------|-------|---------|
| 1 | Blue | Middle/Regular holds |
| 2 | Green | Start holds |
| 3 | Yellow | Foot-only holds |
| 4 | Red/Purple | Finish holds |

---

## Implementation Plan

### Phase 1: Add ML Endpoint to FastAPI Backend

**File:** `SendStone/Backend/app/routers/ml.py` (new file)

```python
POST /ml/predict
Request:  { "holds": [{"x": 5.0, "y": 7.0, "color": "blue"}, ...], "angle": 40 }
Response: { "suggested_grade": "v4", "confidence": 0.82 }
```

**Options for implementation:**

1. **Option A: Proxy to Flask** (Quick, keeps ML separate)
   - FastAPI calls Flask server internally
   - Pros: No model loading in FastAPI, ML stays isolated
   - Cons: Need both servers running

2. **Option B: Embed Model** (Production-ready, single server)
   - Load PyTorch model directly in FastAPI
   - Pros: Single server, cleaner deployment
   - Cons: More complex, need to move model files

**Recommendation:** Start with Option A for quick integration, migrate to B later.

### Phase 2: Coordinate Conversion in Frontend

**File:** `SendStone/Frontend/src/components/common/InteractiveBoard.jsx`

Add conversion when returning holds:

```javascript
// Convert % coords to grid coords
const toGridCoords = (hold) => ({
  x: (hold.x / 100) * 10,        // 0-100% → 0-10
  y: (hold.y / 100) * 14,        // 0-100% → 0-14
  color: typeToColor(hold.type)  // 1-4 → color name
});

const typeToColor = (type) => {
  const map = { 1: 'blue', 2: 'green', 3: 'yellow', 4: 'purple' };
  return map[type] || 'blue';
};
```

### Phase 3: Connect CreatePage to Backend

**File:** `SendStone/Frontend/src/components/pages/CreatePage.jsx`

1. Add "Predict Grade" button that calls `/ml/predict`
2. Auto-suggest grade based on ML response
3. Connect "Post Problem" to `POST /routes` backend endpoint

```javascript
const predictGrade = async () => {
  const gridHolds = holds.map(toGridCoords);
  const response = await fetch('http://localhost:8000/ml/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holds: gridHolds, angle: selectedAngle })
  });
  const data = await response.json();
  setGrade(data.suggested_grade.toUpperCase());  // "v4" → "V4"
};
```

### Phase 4: Path Tracking (Optional/Later)

The Flask server has a sophisticated path tracking algorithm (`infer_climbing_path_from_ui`) that:
- Infers climbing sequence from unordered holds
- Uses TSP-style optimization
- Considers start/finish hold positions

**Decision needed:** Is path tracking required for MVP?

- **If NO:** Skip for now, holds can be unordered
- **If YES:** Port the algorithm to JavaScript or keep it server-side

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `Backend/app/routers/ml.py` | ML prediction endpoint |

### Modified Files
| File | Changes |
|------|---------|
| `Backend/main.py` | Import and register ml router |
| `Frontend/.../InteractiveBoard.jsx` | Add coordinate conversion utility |
| `Frontend/.../CreatePage.jsx` | Add predict button, connect to APIs |

---

## API Contract

### POST /ml/predict

**Request:**
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
  "suggested_grade": "v4",
  "confidence": 0.82
}
```

**Error Response (422):**
```json
{
  "detail": "At least one hold is required"
}
```

---

## Implementation Order

1. **Create `ml.py` router** - Proxy to Flask server initially
2. **Register router in `main.py`**
3. **Test endpoint** - Run both servers, verify prediction works
4. **Update frontend InteractiveBoard** - Add coord conversion
5. **Update CreatePage** - Add predict button & API calls
6. **Remove skipped ML tests** - Update `test_api.py`

---

## Questions to Resolve

1. **Which model to use?**
   - V4 Hybrid (82% accuracy) - faster, simpler
   - OPUS (85.8% accuracy) - slower, requires more features
   - **Recommendation:** Start with V4 Hybrid

2. **Path tracking needed?**
   - For MVP: probably not
   - For better predictions: yes (model may expect ordered holds)

3. **Angle selector in UI?**
   - Currently hardcoded to 40° in some places
   - Need angle selector in CreatePage if predictions vary by angle
