"""
SENDIT v2 — Standalone FastAPI Grade Prediction API

POST /grade
  Body:  {"angle": 35, "holds": [{"x": 4, "y": 3, "color": "green"}, ...]}
  Colors: green=start, red=finish, blue=hand, yellow=foot

  Response: {"grade": "V5", "raw": 5.31, "path": [{"x":4,"y":3,"color":"green"}, ...]}
  Path is in climbing order; foot holds (yellow) appended at end.

Run:
    uvicorn app:app --host 0.0.0.0 --port 8000
"""

import os
import sys
import json
import math
import pickle
from contextlib import asynccontextmanager
from typing import List

import numpy as np
from scipy.stats import entropy
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import onnxruntime as ort

# Coordinate helpers and constants from the model file
sys.path.insert(0, os.path.dirname(__file__))
from sendit_v2_constants.py import (
    ROLE_START, ROLE_HAND, ROLE_FINISH, ROLE_FOOT,
    ROLE_MAP_CNN, MAX_HOLD_DIFFICULTY, DEFAULT_UNRATED_HOLD_RATING,
    ui_to_rating_int, ui_to_rating_half, ui_to_cnn,
    CNN_CHANNELS, CNN_HEIGHT, CNN_WIDTH,
)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR       = os.path.dirname(__file__)
ONNX_PATH      = os.path.join(BASE_DIR, 'models', 'sendit_v2.onnx')
SCALERS_PATH   = os.path.join(BASE_DIR, 'models', 'sendit_v2_scalers.pkl')
RATINGS_PATH   = os.path.join(BASE_DIR, 'data', 'holdratings.json')

# ---------------------------------------------------------------------------
# Color → internal role mapping (never exposed in API)
# ---------------------------------------------------------------------------
COLOR_TO_ROLE = {
    'green':  ROLE_START,
    'red':    ROLE_FINISH,
    'blue':   ROLE_HAND,
    'yellow': ROLE_FOOT,
}

# ---------------------------------------------------------------------------
# Global state loaded at startup
# ---------------------------------------------------------------------------
_ratings: dict  = {}
_scalers: dict  = {}
_session: ort.InferenceSession = None


def _load_ratings():
    """Load holdratings.json + generate screw-on foothold positions."""
    ratings = {}
    with open(RATINGS_PATH, 'r') as f:
        data = json.load(f)
    for entry in data:
        try:
            x, y = int(entry['x']), int(entry['y'])
            raw_type = entry.get('type', 'unknown')
            h_type = 'edge' if raw_type == 'regular' else raw_type
            ratings[(float(x), float(y))] = {
                'difficulty': int(entry['difficulty']),
                'type': h_type,
                'rotation': entry.get('rotation', 0),
            }
        except (KeyError, ValueError):
            continue

    # Add screw-on footholds at 0.5 positions (matches training)
    fh_positions = []
    for x in [i + 0.5 for i in range(10)]:
        for y in range(15):
            if (x, float(y)) not in ratings:
                fh_positions.append((x, float(y)))
    for x in range(11):
        for y in [i + 0.5 for i in range(14)]:
            if (float(x), y) not in ratings:
                fh_positions.append((float(x), y))
    for pos in fh_positions[:60]:
        ratings[pos] = {'difficulty': 5, 'type': 'foothold', 'rotation': 0}

    return ratings


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _ratings, _scalers, _session

    _ratings = _load_ratings()
    print(f"✓ Hold ratings loaded ({len(_ratings)} entries)")

    with open(SCALERS_PATH, 'rb') as f:
        _scalers = pickle.load(f)
    print("✓ Scalers loaded")

    _session = ort.InferenceSession(ONNX_PATH, providers=['CPUExecutionProvider'])
    print(f"✓ ONNX session ready ({ONNX_PATH})")

    yield


app = FastAPI(title="SENDIT v2 Grade API", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class Hold(BaseModel):
    x: float
    y: float
    color: str  # "green", "red", "blue", "yellow"


class GradeRequest(BaseModel):
    angle: float
    holds: List[Hold]


# ---------------------------------------------------------------------------
# Hold rating lookup
# ---------------------------------------------------------------------------
def _get_rating(ui_x: float, ui_y: float):
    ix, iy = ui_to_rating_int(ui_x, ui_y)
    r = _ratings.get((float(ix), float(iy)))
    if r:
        return r
    hx, hy = ui_to_rating_half(ui_x, ui_y)
    return _ratings.get((hx, hy))


# ---------------------------------------------------------------------------
# Path inference (row-based climbing algorithm)
# ---------------------------------------------------------------------------
def _infer_path(holds: list):
    """Order holds into a climbing sequence. Returns (ordered, path_info)."""
    start_holds  = [h for h in holds if h['role'] == ROLE_START]
    middle_holds = [h for h in holds if h['role'] == ROLE_HAND]
    finish_holds = [h for h in holds if h['role'] == ROLE_FINISH]

    if not start_holds or not finish_holds:
        return None, {'valid': False}
    if len(start_holds) > 2 or len(finish_holds) > 2:
        return None, {'valid': False}

    def dist(a, b):
        return math.sqrt((a['ui_x'] - b['ui_x'])**2 + (a['ui_y'] - b['ui_y'])**2)

    path = []

    if len(start_holds) == 2:
        sorted_starts = sorted(start_holds, key=lambda h: h['ui_x'])
        path.extend(sorted_starts)
        current = sorted_starts[-1]
    else:
        path.append(start_holds[0])
        current = start_holds[0]

    if middle_holds:
        sorted_middle = sorted(middle_holds, key=lambda h: h['ui_y'])
        y_tolerance, x_tolerance = 1.5, 4.0
        rows, current_row = [], [sorted_middle[0]]

        for hold in sorted_middle[1:]:
            anchor_y = current_row[0]['ui_y']
            if abs(hold['ui_y'] - anchor_y) <= y_tolerance:
                row_xs = sorted(current_row, key=lambda h: h['ui_x'])
                min_x_dist = min(abs(hold['ui_x'] - row_xs[0]['ui_x']),
                                 abs(hold['ui_x'] - row_xs[-1]['ui_x']))
                if min_x_dist > x_tolerance:
                    rows.append(current_row)
                    current_row = [hold]
                else:
                    current_row.append(hold)
            else:
                rows.append(current_row)
                current_row = [hold]
        rows.append(current_row)

        for row in rows:
            if len(row) == 1:
                path.append(row[0])
                current = row[0]
            else:
                row_sorted = sorted(row, key=lambda h: h['ui_x'])
                left_end, right_end = row_sorted[0], row_sorted[-1]
                if dist(current, left_end) <= dist(current, right_end):
                    path.extend(row_sorted)
                    current = right_end
                else:
                    path.extend(reversed(row_sorted))
                    current = left_end

    if len(finish_holds) == 2:
        path.extend(sorted(finish_holds, key=lambda h: dist(current, h)))
    else:
        path.append(finish_holds[0])

    move_dists, move_dys, move_dxs = [], [], []
    for i in range(len(path) - 1):
        dx = path[i+1]['ui_x'] - path[i]['ui_x']
        dy = path[i+1]['ui_y'] - path[i]['ui_y']
        move_dists.append(math.sqrt(dx**2 + dy**2))
        move_dxs.append(dx)
        move_dys.append(dy)

    n_up   = sum(1 for dy in move_dys if dy > 0.5)
    n_down = sum(1 for dy in move_dys if dy < -0.5)
    n_lat  = len(move_dys) - n_up - n_down
    dir_changes = sum(1 for i in range(1, len(move_dxs))
                      if move_dxs[i] * move_dxs[i-1] < 0)

    return path, {
        'valid': True,
        'move_distances': move_dists,
        'move_dys': move_dys,
        'n_up': n_up,
        'n_lateral': n_lat,
        'n_moves': max(len(move_dys), 1),
        'dir_changes': dir_changes,
    }


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------
def _extract_hold_features(holds: list) -> dict:
    default = {
        'avg_difficulty': 3.0, 'max_difficulty': 3.0, 'min_difficulty': 3.0,
        'difficulty_variance': 0.0, 'difficulty_range': 0.0,
        'num_jugs': 0, 'num_edges': 0, 'num_crimps': 0,
        'num_slopers': 0, 'num_pinches': 0, 'num_footholds': 0,
        'pct_jugs': 0.0, 'pct_edges': 0.0, 'pct_crimps': 0.0,
        'pct_slopers': 0.0, 'pct_pinches': 0.0, 'pct_footholds': 0.0,
        'type_diversity': 0.0,
        'avg_rotation_sin': 0.0, 'avg_rotation_cos': 1.0,
        'num_sidepulls': 0,
    }
    if not holds:
        return default

    difficulties, types, rotations = [], [], []
    for h in holds:
        r = _get_rating(h['ui_x'], h['ui_y'])
        if h['role'] == ROLE_FOOT:
            difficulties.append(2 if (r and r['type'] == 'foothold') else
                                 max(1, (r['difficulty'] - 1) if r else 2))
            types.append('foothold')
            rotations.append(0)
        else:
            difficulties.append(r['difficulty'] if r else DEFAULT_UNRATED_HOLD_RATING)
            types.append(r['type'] if r else 'edge')
            rotations.append(r.get('rotation', 0) if r else 0)

    diff_arr = np.array(difficulties, dtype=float)
    total = len(types)
    type_counts = {
        'jugs': types.count('jug'), 'edges': types.count('edge'),
        'crimps': types.count('crimp'), 'slopers': types.count('sloper'),
        'pinches': types.count('pinch'), 'footholds': types.count('foothold'),
    }
    type_probs = np.array([v for v in type_counts.values() if v > 0]) / total
    type_div = float(entropy(type_probs)) if len(type_probs) > 1 else 0.0
    rads = [math.radians(r) for r in rotations]
    num_side = sum(80 <= abs(r) <= 100 for r in rotations)

    return {
        'avg_difficulty': float(np.mean(diff_arr)),
        'max_difficulty': float(np.max(diff_arr)),
        'min_difficulty': float(np.min(diff_arr)),
        'difficulty_variance': float(np.var(diff_arr)),
        'difficulty_range': float(np.max(diff_arr) - np.min(diff_arr)),
        **{f'num_{k}': v for k, v in type_counts.items()},
        **{f'pct_{k}': v / total for k, v in type_counts.items()},
        'type_diversity': type_div,
        'avg_rotation_sin': float(np.mean([math.sin(r) for r in rads])) if rads else 0.0,
        'avg_rotation_cos': float(np.mean([math.cos(r) for r in rads])) if rads else 1.0,
        'num_sidepulls': num_side,
    }


def _extract_global_spacing(holds: list) -> dict:
    default = {k: 0.0 for k in [
        'avg_distance', 'max_distance', 'min_distance', 'total_path_length',
        'distance_variance', 'hold_density', 'vertical_span', 'horizontal_span',
        'span_ratio', 'clustering_coefficient']}
    coords = [(h['ui_x'], h['ui_y']) for h in holds]
    if len(coords) < 2:
        return default

    arr = np.array(coords)
    pairwise = [math.sqrt((arr[i][0]-arr[j][0])**2 + (arr[i][1]-arr[j][1])**2)
                for i in range(len(arr)) for j in range(i+1, len(arr))]
    path_dists = [math.sqrt((arr[i][0]-arr[i+1][0])**2 + (arr[i][1]-arr[i+1][1])**2)
                  for i in range(len(arr)-1)]
    xs, ys = arr[:, 0], arr[:, 1]
    v_span = float(np.max(ys) - np.min(ys))
    h_span = float(np.max(xs) - np.min(xs))
    nn_dists = [min(math.sqrt((arr[i][0]-arr[j][0])**2+(arr[i][1]-arr[j][1])**2)
                    for j in range(len(arr)) if i != j)
                for i in range(len(arr))]

    return {
        'avg_distance': float(np.mean(pairwise)),
        'max_distance': float(np.max(pairwise)),
        'min_distance': float(np.min(pairwise)),
        'total_path_length': float(sum(path_dists)),
        'distance_variance': float(np.var(pairwise)),
        'hold_density': len(arr) / max((v_span + 1) * (h_span + 1), 1),
        'vertical_span': v_span,
        'horizontal_span': h_span,
        'span_ratio': v_span / (h_span + 0.1),
        'clustering_coefficient': float(np.std(nn_dists)) if nn_dists else 0.0,
    }


def _extract_movement_features(path_info: dict, holds_in_path: list) -> dict:
    default = {k: 0.0 for k in [
        'avg_move_distance', 'max_move_distance', 'min_move_distance',
        'move_distance_std', 'num_big_reaches', 'num_dynos',
        'pct_upward_moves', 'pct_lateral_moves', 'num_direction_changes',
        'crux_move_difficulty', 'avg_vertical_gain', 'total_path_length']}
    if not path_info.get('valid') or not path_info.get('move_distances'):
        return default

    dists  = path_info['move_distances']
    dys    = path_info['move_dys']
    n_moves = path_info['n_moves']

    crux = 0.0
    if holds_in_path and len(holds_in_path) > 1:
        for i in range(len(dists)):
            dest = holds_in_path[i+1]
            r = _get_rating(dest['ui_x'], dest['ui_y'])
            dest_diff = r['difficulty'] if r else DEFAULT_UNRATED_HOLD_RATING
            crux = max(crux, dists[i] * dest_diff)

    return {
        'avg_move_distance': float(np.mean(dists)),
        'max_move_distance': float(np.max(dists)),
        'min_move_distance': float(np.min(dists)),
        'move_distance_std': float(np.std(dists)) if len(dists) > 1 else 0.0,
        'num_big_reaches': sum(1 for d in dists if 3.0 <= d < 5.0),
        'num_dynos': sum(1 for d in dists if d >= 5.0),
        'pct_upward_moves': path_info['n_up'] / n_moves,
        'pct_lateral_moves': path_info['n_lateral'] / n_moves,
        'num_direction_changes': path_info['dir_changes'],
        'crux_move_difficulty': crux,
        'avg_vertical_gain': float(np.mean(dys)) if dys else 0.0,
        'total_path_length': float(np.sum(dists)),
    }


def _extract_interaction_features(angle: float, hold_count: int,
                                   hf: dict, sf: dict, mf: dict) -> dict:
    avg_diff  = hf['avg_difficulty']
    max_diff  = hf['max_difficulty']
    avg_dist  = sf['avg_distance']
    max_move  = mf['max_move_distance']
    n_dynos   = mf['num_dynos']
    scarcity  = avg_dist / max(hold_count, 1)

    return {
        'diff_spacing_interaction': avg_diff * avg_dist,
        'angle_diff_interaction': (angle / 70.0) * max_diff,
        'scarcity_factor': scarcity,
        'crux_intensity': max_diff - avg_diff,
        'dyno_difficulty_interaction': (1.0 if max_move >= 5.0 else 0.0) * (max_diff ** 2),
        'scarcity_squared': scarcity ** 2,
        'extreme_move_penalty': n_dynos * avg_diff,
        'multi_big_move_penalty': mf['num_big_reaches'] * 0.5,
    }


def _build_cnn_grid(holds: list, angle: float) -> np.ndarray:
    grid = np.zeros((CNN_CHANNELS, CNN_HEIGHT, CNN_WIDTH), dtype=np.float32)
    for h in holds:
        cx, cy = ui_to_cnn(h['ui_x'], h['ui_y'])
        r = _get_rating(h['ui_x'], h['ui_y'])
        diff = r['difficulty'] if r else DEFAULT_UNRATED_HOLD_RATING
        grid[0, cy, cx] = 1.0
        grid[1, cy, cx] = 1.0 if h.get('is_bolt_on', True) else 0.5
        grid[2, cy, cx] = ROLE_MAP_CNN.get(h['role'], 0.5)
        grid[3, cy, cx] = diff / MAX_HOLD_DIFFICULTY
    return grid


def _vectorize(hf, sf, mf, intf):
    hold_vec = [
        hf['avg_difficulty'], hf['max_difficulty'], hf['min_difficulty'],
        hf['difficulty_variance'], hf['difficulty_range'],
        hf['num_jugs'], hf['num_edges'], hf['num_crimps'],
        hf['num_slopers'], hf['num_pinches'], hf['num_footholds'],
        hf['pct_jugs'], hf['pct_edges'], hf['pct_crimps'],
        hf['pct_slopers'], hf['pct_pinches'], hf['pct_footholds'],
        hf['type_diversity'],
        hf['avg_rotation_sin'], hf['avg_rotation_cos'],
        hf['num_sidepulls'],
    ]
    spacing_vec = [
        sf['avg_distance'], sf['max_distance'], sf['min_distance'],
        sf['total_path_length'], sf['distance_variance'],
        sf['hold_density'], sf['vertical_span'], sf['horizontal_span'],
        sf['span_ratio'], sf['clustering_coefficient'],
    ]
    movement_vec = [
        mf['avg_move_distance'], mf['max_move_distance'], mf['min_move_distance'],
        mf['move_distance_std'], mf['num_big_reaches'], mf['num_dynos'],
        mf['pct_upward_moves'], mf['pct_lateral_moves'], mf['num_direction_changes'],
        mf['crux_move_difficulty'], mf['avg_vertical_gain'], mf['total_path_length'],
    ]
    interaction_vec = [
        intf['diff_spacing_interaction'], intf['angle_diff_interaction'],
        intf['scarcity_factor'], intf['crux_intensity'],
        intf['dyno_difficulty_interaction'], intf['scarcity_squared'],
        intf['extreme_move_penalty'], intf['multi_big_move_penalty'],
    ]
    return hold_vec, spacing_vec, movement_vec, interaction_vec


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------
@app.post('/grade')
def grade(req: GradeRequest):
    if not req.holds:
        raise HTTPException(status_code=400, detail="holds list is empty")

    # Map color → internal role; look up bolt-on status
    holds = []
    foot_holds = []
    for h in req.holds:
        role = COLOR_TO_ROLE.get(h.color.lower())
        if role is None:
            raise HTTPException(status_code=400,
                                detail=f"Unknown color '{h.color}'. Use: green, red, blue, yellow")
        r = _get_rating(h.x, h.y)
        is_bolt_on = not (r and r['type'] == 'foothold')
        internal = {'ui_x': h.x, 'ui_y': h.y, 'role': role,
                    'is_bolt_on': is_bolt_on, 'color': h.color}
        if role == ROLE_FOOT:
            foot_holds.append(internal)
        else:
            holds.append(internal)

    all_holds = holds + foot_holds  # feet included for feature extraction

    # Path inference (start/hand/finish only)
    ordered, path_info = _infer_path(all_holds)
    if ordered is None:
        # Fallback: use input order
        ordered = all_holds
        path_info = {'valid': True, 'move_distances': [], 'move_dys': [],
                     'n_up': 0, 'n_lateral': 0, 'n_moves': max(len(all_holds)-1, 1),
                     'dir_changes': 0}
        for i in range(len(ordered) - 1):
            dx = ordered[i+1]['ui_x'] - ordered[i]['ui_x']
            dy = ordered[i+1]['ui_y'] - ordered[i]['ui_y']
            path_info['move_distances'].append(math.sqrt(dx**2 + dy**2))
            path_info['move_dys'].append(dy)
        path_info['n_up'] = sum(1 for dy in path_info['move_dys'] if dy > 0.5)
        path_info['n_lateral'] = (len(path_info['move_dys']) - path_info['n_up']
                                  - sum(1 for dy in path_info['move_dys'] if dy < -0.5))

    # Feature extraction
    hf   = _extract_hold_features(all_holds)
    sf   = _extract_global_spacing(all_holds)
    mf   = _extract_movement_features(path_info, ordered)
    intf = _extract_interaction_features(req.angle, len(all_holds), hf, sf, mf)
    grid = _build_cnn_grid(all_holds, req.angle)

    hold_vec, spacing_vec, movement_vec, interaction_vec = _vectorize(hf, sf, mf, intf)

    # Scale
    hold_arr     = np.array([hold_vec],       dtype=np.float32)
    spacing_arr  = np.array([spacing_vec],    dtype=np.float32)
    movement_arr = np.array([movement_vec],   dtype=np.float32)
    interact_arr = np.array([interaction_vec],dtype=np.float32)

    if _scalers.get('hold'):
        hold_arr     = _scalers['hold'].transform(hold_arr)
    if _scalers.get('spacing'):
        spacing_arr  = _scalers['spacing'].transform(spacing_arr)
    if _scalers.get('movement'):
        movement_arr = _scalers['movement'].transform(movement_arr)
    if _scalers.get('interaction'):
        interact_arr = _scalers['interaction'].transform(interact_arr)

    # ONNX inference
    grid_input  = grid[np.newaxis].astype(np.float32)        # (1,4,20,22)
    angle_input = np.array([[req.angle]], dtype=np.float32)  # (1,1)

    result = _session.run(['grade'], {
        'grid':        grid_input,
        'angle':       angle_input,
        'hold':        hold_arr.astype(np.float32),
        'spacing':     spacing_arr.astype(np.float32),
        'movement':    movement_arr.astype(np.float32),
        'interaction': interact_arr.astype(np.float32),
    })

    raw = float(result[0][0][0])
    rounded = int(max(0, min(16, round(raw))))

    # Build path response — ordered (start→hand→finish) then feet
    path_non_foot = [h for h in ordered if h['role'] != ROLE_FOOT]
    path_foot     = [h for h in ordered if h['role'] == ROLE_FOOT]
    path_out = [{'x': h['ui_x'], 'y': h['ui_y'], 'color': h['color']}
                for h in path_non_foot + path_foot]

    return {'grade': f'V{rounded}', 'raw': round(raw, 2), 'path': path_out}


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app:app', host='0.0.0.0', port=8000, reload=False)
