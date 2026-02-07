# Click Tracker Integration Plan

## Goal
Replace the current luminance-based hold detection in SendStone's InteractiveBoard with the calibrated grid-based coordinate system from ClickTracker.

---

## What We're Porting

### From: `ClickTracker/routebuilder.html`
- Grid-based coordinate snapping (0-10 x, 0-14 y with 0.5 steps)
- Pre-calibrated `boardConfig` mapping pixel ratios to grid values
- Color cycling: Blue → Green → Yellow → Red → Delete
- Dual storage: pixel coords (for drawing) + grid coords (for data)

### To: `SendStone/Frontend/src/components/common/InteractiveBoard.jsx`

---

## Current State

### ClickTracker (`routebuilder.html`)
```
Coordinate System:
- X: 0 to 10 (21 values with 0.5 steps)
- Y: 0 to 14 (29 values with 0.5 steps)
- Integer coords = bolt-on holds
- Half coords (0.5) = screw-on/foot holds

Hold Format (internal):
{
  pixelX: 234,        // exact click position for drawing
  pixelY: 567,
  x: 4.0,             // snapped grid coord
  y: 7.5,             // snapped grid coord
  color: "blue"       // blue/green/yellow/red
}

Export Format:
{
  x: 4.0,
  y: 7.5,
  color: "blue"
}
```

### SendStone (`InteractiveBoard.jsx`)
```
Current Approach:
- Luminance-based detection (finds bright pixels)
- Stores holds as percentage positions (0-100%)
- Uses numeric type (1-4) for colors

Hold Format:
{
  x: 47.3,            // percentage position
  y: 65.8,            // percentage position
  type: 1             // 1=blue, 2=green, 3=yellow, 4=red
}
```

---

## What Needs to Change

### 1. Add Calibrated Grid Config
Add the pre-calibrated `boardConfig` from `coordinates.json`:
- Maps pixel ratios (0.0-1.0) to grid values
- Already calibrated for the board image

### 2. Replace Snap Logic
**Remove:** `findNearestHoldPixel()` (luminance-based)
**Add:** `findLowerBoundGridValue()` (grid-based bounding box)

### 3. Update Hold Data Structure
```javascript
// Internal format (for React state)
{
  gridX: 4.0,         // grid coord (0-10)
  gridY: 7.5,         // grid coord (0-14)
  displayX: 38.63,    // percentage for CSS positioning
  displayY: 48.41,    // percentage for CSS positioning
  type: 1             // 1-4 for color cycling
}

// Export format (for backend/ML)
{
  x: 4.0,             // grid X
  y: 7.5,             // grid Y
  color: "blue"       // color string
}
```

### 4. Color Mapping
| Type | Color String | Use |
|------|--------------|-----|
| 1 | blue | Middle/regular holds |
| 2 | green | Start holds |
| 3 | yellow | Foot-only holds |
| 4 | purple | Finish holds |

### 5. Fix Render Logic
Update the hold marker rendering to use `displayX`/`displayY` instead of percentage x/y.

---

## Implementation Steps

### Step 1: Add boardConfig constant
- Copy calibrated config from `coordinates.json`
- Add as `BOARD_CONFIG` constant at top of file

### Step 2: Add conversion functions
```javascript
// Grid coord → Display percentage
gridToPercent(gridValue, axis)

// Click ratio → Grid coord (bounding box snap)
findLowerBoundGridValue(ratio, axis)
```

### Step 3: Update click handler
- Get click position as ratio (0-1)
- Flip Y ratio (CSS 0=top, grid 0=bottom)
- Snap to grid using `findLowerBoundGridValue`
- Calculate display percentages
- Store both grid and display coords

### Step 4: Update hold cycling
- Keep same cycle: Blue → Green → Yellow → Purple → Delete
- No change to logic, just the data structure

### Step 5: Update export format
```javascript
// In useEffect that calls onHoldsChange
const exportHolds = holds.map(h => ({
  x: h.gridX,
  y: h.gridY,
  color: TYPE_TO_COLOR[h.type]
}));
onHoldsChange(exportHolds);
```

### Step 6: Update render
- Change `hold.x` → `hold.displayX`
- Change `hold.y` → `hold.displayY`

---

## Files to Modify

| File | Changes |
|------|---------|
| `InteractiveBoard.jsx` | Replace snap logic, update data structure |

---

## What Stays the Same
- Visual appearance (colors, markers, animations)
- UI layout (legend, board, summary)
- Color cycling behavior

---

## What About Path Tracking?

**Decision:** Path tracking stays on backend/ML server.

**Why:**
- ML model needs ordered holds
- Path inference algorithm is complex (TSP-style)
- Frontend just sends unordered holds
- Backend/ML orders them before prediction

**Flow:**
```
Frontend: Click holds (unordered)
    ↓
Backend: POST /routes or /ml/predict
    ↓
ML Server: infer_climbing_path() orders holds
    ↓
Model: Predicts grade from ordered sequence
```

---

## Questions Before Implementation

1. **Board image match?**
   - The calibration in `coordinates.json` is for `ClickTracker/board.png`
   - Is this the same as `SendStone/Frontend/src/assets/board.png`?
   - If different, may need recalibration

2. **Color for finish holds?**
   - ClickTracker uses "red" for finish
   - Backend/ML expects "purple" for finish
   - Which should we use?

3. **Half-step coordinates?**
   - Currently calibrated for 0.5 increments
   - Are footholds (screw-ons) always at half positions?
   - Or can any hold be at any position?

---

## Backend API Contract (for reference)

```
POST /routes
{
  "name": "Route Name",
  "difficulty": "v4",
  "holds": [
    {"x": 5.0, "y": 7.0, "color": "blue"},
    {"x": 3.0, "y": 4.0, "color": "green"},
    {"x": 6.0, "y": 14.0, "color": "purple"}
  ],
  "angle": 40,
  "visibility": "public"
}
```

This matches what the updated InteractiveBoard will export.
