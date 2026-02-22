"""Machine Learning endpoints for route grade prediction."""
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import ml_predictor

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
async def predict_grade(request: PredictRequest):
    """Predict the grade of a climbing route based on holds and angle.
    
    Uses the SENDIT v2 neural network model for accurate grade prediction.
    Returns error if the model is not available.
    """
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
