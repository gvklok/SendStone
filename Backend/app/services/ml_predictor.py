"""ML Grade Prediction Service - SENDIT v2 Model Integration"""

import os
import sys
import json
import math
import pickle
import importlib.util
from typing import List, Dict, Optional, Tuple

import numpy as np
from scipy.stats import entropy

# Import ONNX runtime
try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    ort = None

# Path to sendit-api folder
SENDIT_API_DIR = os.path.join(os.path.dirname(__file__), '..', 'routers', 'sendit-api')
sys.path.insert(0, SENDIT_API_DIR)

try:
    from sendit_v2_constants import (
        ROLE_START, ROLE_HAND, ROLE_FINISH, ROLE_FOOT,
        ROLE_MAP_CNN, MAX_HOLD_DIFFICULTY, DEFAULT_UNRATED_HOLD_RATING,
        ui_to_rating_int, ui_to_rating_half, ui_to_cnn,
        CNN_CHANNELS, CNN_HEIGHT, CNN_WIDTH,
    )
    MODEL_AVAILABLE = True
except ImportError:
    MODEL_AVAILABLE = False
    ROLE_START = ROLE_HAND = ROLE_FINISH = ROLE_FOOT = None
finally:
    # Remove sendit-api from sys.path immediately — leaving it there causes
    # sendit-api/app.py to shadow the project's 'app' package when the
    # WatchFiles reloader spawns child processes.
    try:
        sys.path.remove(SENDIT_API_DIR)
    except ValueError:
        pass

# Paths
ONNX_PATH = os.path.join(SENDIT_API_DIR, 'models', 'sendit_v2.onnx')
SCALERS_PATH = os.path.join(SENDIT_API_DIR, 'models', 'sendit_v2_scalers.pkl')
RATINGS_PATH = os.path.join(SENDIT_API_DIR, 'data', 'holdratings.json')

# Color mapping
COLOR_TO_ROLE = {
    'green': ROLE_START if MODEL_AVAILABLE else 2,
    'red': ROLE_FINISH if MODEL_AVAILABLE else 4,
    'blue': ROLE_HAND if MODEL_AVAILABLE else 1,
    'yellow': ROLE_FOOT if MODEL_AVAILABLE else 3,
}

# Global state
_ratings: Optional[dict] = None
_scalers: Optional[dict] = None
_session: Optional[ort.InferenceSession] = None
_initialized = False

# Cached functions extracted from sendit_app module (loaded once at startup)
_get_rating = None
_infer_path = None
_extract_hold_features = None
_extract_global_spacing = None
_extract_movement_features = None
_extract_interaction_features = None
_build_cnn_grid = None
_vectorize = None


def is_available() -> bool:
    """Check if ML prediction is available."""
    return ONNX_AVAILABLE and MODEL_AVAILABLE and os.path.exists(ONNX_PATH)


def initialize():
    """Load model, scalers, and ratings. Call once at startup."""
    global _ratings, _scalers, _session, _initialized
    global _get_rating, _infer_path, _extract_hold_features, _extract_global_spacing
    global _extract_movement_features, _extract_interaction_features, _build_cnn_grid, _vectorize

    if _initialized:
        return True

    if not is_available():
        print("⚠️  ML prediction not available (missing dependencies or model files)")
        return False

    try:
        # Load ratings
        _ratings = _load_ratings()
        print(f"✓ Hold ratings loaded ({len(_ratings)} entries)")

        # Load scalers
        with open(SCALERS_PATH, 'rb') as f:
            _scalers = pickle.load(f)
        print("✓ Scalers loaded")

        # Load ONNX model
        _session = ort.InferenceSession(ONNX_PATH, providers=['CPUExecutionProvider'])
        print(f"✓ ONNX session ready")

        # Load sendit-api module ONCE and extract functions
        spec = importlib.util.spec_from_file_location("sendit_app_module", os.path.join(SENDIT_API_DIR, 'app.py'))
        sendit_app = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(sendit_app)
        sendit_app._ratings = _ratings
        sendit_app._scalers = _scalers
        sendit_app._session = _session
        _get_rating = sendit_app._get_rating
        _infer_path = sendit_app._infer_path
        _extract_hold_features = sendit_app._extract_hold_features
        _extract_global_spacing = sendit_app._extract_global_spacing
        _extract_movement_features = sendit_app._extract_movement_features
        _extract_interaction_features = sendit_app._extract_interaction_features
        _build_cnn_grid = sendit_app._build_cnn_grid
        _vectorize = sendit_app._vectorize
        print("✓ sendit-api module loaded")

        _initialized = True
        return True
    except Exception as e:
        print(f"❌ Failed to initialize ML predictor: {e}")
        return False


def predict_grade(holds: List[Dict], angle: float) -> Dict:
    """
    Predict climbing route grade.
    
    Args:
        holds: List of dicts with {x, y, color}
        angle: Board angle in degrees
        
    Returns:
        Dict with {suggested_grade: str, raw: float, confidence: float}
    """
    if not _initialized:
        if not initialize():
            # Fallback to heuristic
            return _fallback_prediction(holds, angle)
    
    try:
        
        # Convert holds to internal format
        internal_holds = []
        foot_holds = []
        for h in holds:
            role = COLOR_TO_ROLE.get(h['color'].lower())
            if role is None:
                continue
            r = _get_rating(h['x'], h['y'])
            is_bolt_on = not (r and r['type'] == 'foothold')
            internal = {
                'ui_x': h['x'], 'ui_y': h['y'], 'role': role,
                'is_bolt_on': is_bolt_on, 'color': h['color']
            }
            if role == COLOR_TO_ROLE['yellow']:  # ROLE_FOOT
                foot_holds.append(internal)
            else:
                internal_holds.append(internal)
        
        all_holds = internal_holds + foot_holds
        
        # Path inference
        ordered, path_info = _infer_path(all_holds)
        if ordered is None:
            ordered = all_holds
            path_info = _build_fallback_path_info(all_holds)
        
        # Feature extraction
        hf = _extract_hold_features(all_holds)
        sf = _extract_global_spacing(all_holds)
        mf = _extract_movement_features(path_info, ordered)
        intf = _extract_interaction_features(angle, len(all_holds), hf, sf, mf)
        grid = _build_cnn_grid(all_holds, angle)
        
        hold_vec, spacing_vec, movement_vec, interaction_vec = _vectorize(hf, sf, mf, intf)
        
        # Scale features
        hold_arr = np.array([hold_vec], dtype=np.float32)
        spacing_arr = np.array([spacing_vec], dtype=np.float32)
        movement_arr = np.array([movement_vec], dtype=np.float32)
        interact_arr = np.array([interaction_vec], dtype=np.float32)
        
        if _scalers.get('hold'):
            hold_arr = _scalers['hold'].transform(hold_arr)
        if _scalers.get('spacing'):
            spacing_arr = _scalers['spacing'].transform(spacing_arr)
        if _scalers.get('movement'):
            movement_arr = _scalers['movement'].transform(movement_arr)
        if _scalers.get('interaction'):
            interact_arr = _scalers['interaction'].transform(interact_arr)
        
        # ONNX inference
        grid_input = grid[np.newaxis].astype(np.float32)
        angle_input = np.array([[angle]], dtype=np.float32)
        
        result = _session.run(['grade'], {
            'grid': grid_input,
            'angle': angle_input,
            'hold': hold_arr.astype(np.float32),
            'spacing': spacing_arr.astype(np.float32),
            'movement': movement_arr.astype(np.float32),
            'interaction': interact_arr.astype(np.float32),
        })
        
        raw = float(result[0][0][0])
        rounded = int(max(0, min(16, round(raw))))

        # Build path: ordered non-foot holds then foot holds, excluding yellow
        path_non_foot = [h for h in ordered if h['role'] != COLOR_TO_ROLE['yellow']]
        path_foot     = [h for h in ordered if h['role'] == COLOR_TO_ROLE['yellow']]
        path_out = [{'x': h['ui_x'], 'y': h['ui_y'], 'color': h['color']}
                    for h in path_non_foot + path_foot]

        return {
            'suggested_grade': f'v{rounded}',
            'raw': round(raw, 2),
            'confidence': 0.85,
            'path': path_out,
        }
        
    except Exception as e:
        print(f"❌ ML prediction failed: {e}")
        return _fallback_prediction(holds, angle)


def _fallback_prediction(holds: List[Dict], angle: float) -> Dict:
    """Return unavailable message when ML model isn't available."""
    return {
        'suggested_grade': 'N/A',
        'raw': 0.0,
        'confidence': 0.0,
        'error': 'ML model unavailable'
    }


def _build_fallback_path_info(holds: List[Dict]) -> Dict:
    """Build basic path info when path inference fails."""
    path_info = {
        'valid': True,
        'move_distances': [],
        'move_dys': [],
        'n_up': 0,
        'n_lateral': 0,
        'n_moves': max(len(holds) - 1, 1),
        'dir_changes': 0
    }
    
    for i in range(len(holds) - 1):
        dx = holds[i+1]['ui_x'] - holds[i]['ui_x']
        dy = holds[i+1]['ui_y'] - holds[i]['ui_y']
        path_info['move_distances'].append(math.sqrt(dx**2 + dy**2))
        path_info['move_dys'].append(dy)
    
    path_info['n_up'] = sum(1 for dy in path_info['move_dys'] if dy > 0.5)
    path_info['n_lateral'] = (
        len(path_info['move_dys']) - path_info['n_up'] -
        sum(1 for dy in path_info['move_dys'] if dy < -0.5)
    )
    
    return path_info


def _load_ratings() -> dict:
    """Load holdratings.json + generate screw-on foothold positions."""
    ratings = {}
    
    if not os.path.exists(RATINGS_PATH):
        return ratings
    
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
    
    # Add screw-on footholds
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
