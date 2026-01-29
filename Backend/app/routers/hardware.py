"""Hardware control endpoints for LED strip."""
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_supabase
from app.services import led

router = APIRouter(prefix="/hardware", tags=["hardware"])


# =============================================================================
# Request/Response Models
# =============================================================================

class HoldPreview(BaseModel):
    """Hold for LED preview."""
    x: float
    y: float
    color: str


class PreviewRequest(BaseModel):
    """Request body for LED preview."""
    holds: List[HoldPreview]


class StatusResponse(BaseModel):
    """LED status response."""
    online: bool
    led_count: int
    message: str


class DisplayResponse(BaseModel):
    """LED display response."""
    status: str
    route_id: str = None
    hold_count: int = 0


class PreviewResponse(BaseModel):
    """LED preview response."""
    status: str
    hold_count: int


class ClearResponse(BaseModel):
    """LED clear response."""
    status: str


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/led/status", response_model=StatusResponse)
async def get_led_status():
    """Check if LED board is online and available.

    Returns LED count and availability status.
    """
    available = led.is_available()

    if available:
        return StatusResponse(
            online=True,
            led_count=led.LED_COUNT,
            message="LED strip ready"
        )
    else:
        return StatusResponse(
            online=False,
            led_count=led.LED_COUNT,
            message="LED control not available (not on Pi or GPIO access denied)"
        )


@router.post("/led/off", response_model=ClearResponse)
async def turn_off_leds():
    """Turn off all LEDs."""
    success = led.clear()

    if success:
        return ClearResponse(status="cleared")
    else:
        # Still return success status even if not available
        # This allows frontend to call without errors
        return ClearResponse(status="cleared (no-op: LEDs not available)")


@router.post("/led/routes/{route_id}", response_model=DisplayResponse)
async def display_route(route_id: str):
    """Display a route's holds on the LED board.

    Fetches the route from the database and lights up the corresponding LEDs.
    """
    supabase = get_supabase()

    # Get route with holds
    try:
        response = (
            supabase.table("routes")
            .select("id, name")
            .eq("id", route_id)
            .limit(1)
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Route not found")

    if not response or not response.data:
        raise HTTPException(status_code=404, detail="Route not found")

    # Get holds for this route
    holds_response = (
        supabase.table("route_holds")
        .select("x, y, color")
        .eq("route_id", route_id)
        .execute()
    )

    holds = holds_response.data if holds_response else []

    if not holds:
        raise HTTPException(status_code=400, detail="Route has no holds")

    # Display on LEDs
    lit_count = led.display_holds(holds)

    if led.is_available():
        return DisplayResponse(
            status="displayed",
            route_id=route_id,
            hold_count=lit_count
        )
    else:
        return DisplayResponse(
            status="simulated (LEDs not available)",
            route_id=route_id,
            hold_count=len(holds)
        )


@router.post("/led/preview", response_model=PreviewResponse)
async def preview_holds(request: PreviewRequest):
    """Preview arbitrary holds on the LED board.

    Used during route creation to show holds as they're being placed.
    """
    if not request.holds:
        raise HTTPException(status_code=400, detail="No holds provided")

    # Convert to dict format expected by LED service
    holds_data = [
        {"x": h.x, "y": h.y, "color": h.color}
        for h in request.holds
    ]

    lit_count = led.display_holds(holds_data)

    if led.is_available():
        return PreviewResponse(
            status="previewing",
            hold_count=lit_count
        )
    else:
        return PreviewResponse(
            status="simulated (LEDs not available)",
            hold_count=len(holds_data)
        )
