"""Machine Learning endpoints for route grade prediction."""
import time
from collections import defaultdict
from typing import List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.services import ml_predictor

# Simple in-memory rate limit: max 20 requests per minute per IP
_rate_limit: dict = defaultdict(list)
_RATE_LIMIT_MAX = 30
_RATE_LIMIT_WINDOW = 60  # seconds

router = APIRouter(prefix="/ml", tags=["ml"])


# =============================================================================
# Request/Response Models
# =============================================================================

class HoldInput(BaseModel):
    """Hold for ML prediction."""
    x: float
    y: float
    color: str


class PredictRequest(BaseModel):
    """Request body for grade prediction."""
    holds: List[HoldInput]
    angle: int


class PredictResponse(BaseModel):
    """ML prediction response."""
    suggested_grade: str
    confidence: float = 0.0
    raw: float = 0.0


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/predict", response_model=PredictResponse)
async def predict_grade(request: PredictRequest, http_request: Request):
    """Predict the grade of a climbing route based on holds and angle.

    Open to all users. Simple IP rate limit to prevent abuse.
    """
    ip = http_request.client.host
    now = time.time()
    timestamps = _rate_limit[ip]
    # Drop timestamps outside the window
    _rate_limit[ip] = [t for t in timestamps if now - t < _RATE_LIMIT_WINDOW]
    if len(_rate_limit[ip]) >= _RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Too many requests — slow down")
    _rate_limit[ip].append(now)

    if not request.holds:
        raise HTTPException(status_code=400, detail="No holds provided")

    # Convert Pydantic models to dicts
    holds_data = [{"x": h.x, "y": h.y, "color": h.color} for h in request.holds]
    
    # Get prediction from ML service
    result = ml_predictor.predict_grade(holds_data, float(request.angle))
    
    # Check if ML model is unavailable
    if result.get('error'):
        raise HTTPException(status_code=503, detail=result['error'])
    
    return PredictResponse(
        suggested_grade=result['suggested_grade'],
        confidence=result['confidence'],
        raw=result.get('raw', 0.0)
    )
