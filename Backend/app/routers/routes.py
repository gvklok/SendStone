"""Routes API endpoints."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.database import get_supabase
from app.models import RouteResponse, PaginatedRoutes, RouteCreate, Hold

router = APIRouter(prefix="/routes", tags=["routes"])


@router.get("", response_model=PaginatedRoutes)
async def list_routes(
    search: Optional[str] = Query(None, description="Filter by name (partial match)"),
    difficulty: Optional[str] = Query(None, description="Filter by grade (e.g., 'v5')"),
    sort: str = Query("-created_at", description="Sort field. Prefix '-' for descending"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page")
):
    """
    List all public routes with optional filters.
    
    Queries routes table and fetches holds separately.
    """
    supabase = get_supabase()
    
    # Query routes table directly
    query = supabase.table("routes").select("*", count="exact")
    
    # Filter to public routes only
    query = query.eq("visibility", "public")
    
    if search:
        query = query.ilike("name", f"%{search}%")
    
    if difficulty:
        query = query.eq("difficulty", difficulty.lower())
    
    # Apply sorting
    if sort.startswith("-"):
        query = query.order(sort[1:], desc=True)
    else:
        query = query.order(sort, desc=False)
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    
    # Execute
    response = query.execute()
    
    # Fetch holds for each route
    routes_with_holds = []
    for route in response.data:
        holds_response = supabase.table("route_holds").select("x, y, color").eq("route_id", route["id"]).order("position").execute()
        route["holds"] = holds_response.data or []
        routes_with_holds.append(route)
    
    return PaginatedRoutes(
        items=routes_with_holds,
        page=page,
        total=response.count or 0
    )


@router.get("/{route_id}", response_model=RouteResponse)
async def get_route(route_id: str):
    """
    Get a single route by ID with its holds.
    """
    supabase = get_supabase()
    
    # Get route - use limit(1) and handle potential None/errors
    try:
        response = (
            supabase.table("routes")
            .select("*")
            .eq("id", route_id)
            .limit(1)
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if response is None or not response.data:
        raise HTTPException(status_code=404, detail="Route not found")
    
    route_data = response.data[0]
    
    # Get holds for this route
    holds_response = supabase.table("route_holds").select("x, y, color").eq("route_id", route_id).order("position").execute()
    route_data["holds"] = holds_response.data if holds_response else []
    
    return route_data


@router.post("", response_model=RouteResponse, status_code=201)
async def create_route(route: RouteCreate):
    """
    Create a new route with holds.
    
    1. Inserts into routes table
    2. Inserts holds into route_holds table
    3. Returns the route from routes_with_holds view
    
    TODO: Add authentication - creator_id should come from auth token
    """
    supabase = get_supabase()
    
    # 1. Create the route (without holds - they go in separate table)
    route_data = {
        "name": route.name,
        "difficulty": route.difficulty,
        "description": route.description,
        "angle": route.angle,
        "visibility": route.visibility,
        "send_count": 0
    }
    
    route_response = supabase.table("routes").insert(route_data).execute()
    
    if not route_response.data:
        raise HTTPException(status_code=500, detail="Failed to create route")
    
    new_route_id = route_response.data[0]["id"]
    
    # 2. Insert holds into route_holds table
    if route.holds:
        holds_data = [
            {
                "route_id": new_route_id,
                "x": hold.x,
                "y": hold.y,
                "color": hold.color,
                "position": idx
            }
            for idx, hold in enumerate(route.holds)
        ]
        
        holds_response = supabase.table("route_holds").insert(holds_data).execute()
        
        if not holds_response.data:
            # Rollback route creation if holds fail
            supabase.table("routes").delete().eq("id", new_route_id).execute()
            raise HTTPException(status_code=500, detail="Failed to create holds")
    
    # 3. Fetch and return from view (includes holds as JSONB)
    final_response = (
        supabase.table("routes_with_holds")
        .select("*")
        .eq("id", new_route_id)
        .single()
        .execute()
    )
    
    return final_response.data


@router.delete("/{route_id}", status_code=200)
async def delete_route(route_id: str, user_id: str = Query(None, description="User ID (temp until auth)")):
    """
    Delete a route and all its associated data.
    
    TODO: Add auth - only route creator or admin should be able to delete
    """
    supabase = get_supabase()
    
    # Check if route exists - handle potential None/errors
    try:
        route = supabase.table("routes").select("id, creator_id").eq("id", route_id).limit(1).execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route is None or not route.data:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # TODO: Check if user is creator or admin
    # if route.data["creator_id"] and route.data["creator_id"] != user_id:
    #     raise HTTPException(status_code=403, detail="Not authorized to delete this route")
    
    # Delete related data first (foreign key constraints)
    supabase.table("route_holds").delete().eq("route_id", route_id).execute()
    supabase.table("user_saved_routes").delete().eq("route_id", route_id).execute()
    supabase.table("sends").delete().eq("route_id", route_id).execute()
    
    # Delete the route
    supabase.table("routes").delete().eq("id", route_id).execute()
    
    return {"deleted": True, "route_id": route_id}


# ============== SAVE/BOOKMARK ENDPOINTS ==============

@router.put("/{route_id}/save")
async def save_route(route_id: str, user_id: str = Query(..., description="User ID (temp until auth)")):
    """
    Save/bookmark a route for a user.
    
    TODO: Get user_id from auth token instead of query param
    """
    supabase = get_supabase()
    
    # Check if route exists - handle potential None/errors
    try:
        route = supabase.table("routes").select("id").eq("id", route_id).limit(1).execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if route is None or not route.data:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Check if already saved
    existing = supabase.table("user_saved_routes").select("*").eq("user_id", user_id).eq("route_id", route_id).execute()
    
    if existing and existing.data:
        return {"saved": True, "saved_at": existing.data[0]["saved_at"], "message": "Already saved"}
    
    # Insert new save - handle foreign key errors
    save_data = {
        "user_id": user_id,
        "route_id": route_id,
        "is_favorite": False
    }
    try:
        response = supabase.table("user_saved_routes").insert(save_data).execute()
    except Exception as e:
        # Foreign key error - user doesn't exist
        if "foreign key" in str(e).lower() or "23503" in str(e):
            raise HTTPException(status_code=400, detail="Invalid user ID - user does not exist")
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"saved": True, "saved_at": response.data[0]["saved_at"]}


@router.delete("/{route_id}/save")
async def unsave_route(route_id: str, user_id: str = Query(..., description="User ID (temp until auth)")):
    """
    Remove a saved/bookmarked route.
    """
    supabase = get_supabase()
    
    supabase.table("user_saved_routes").delete().eq("user_id", user_id).eq("route_id", route_id).execute()
    
    return {"saved": False}


# ============== SEND ENDPOINTS (completions) ==============

@router.put("/{route_id}/send")
async def send_route(route_id: str, user_id: str = Query(..., description="User ID (temp until auth)")):
    """
    Log a send (mark route as completed by user).

    TODO: Get user_id from auth token instead of query param
    """
    supabase = get_supabase()

    # Check if route exists and get current send_count
    try:
        route = supabase.table("routes").select("id, send_count").eq("id", route_id).limit(1).execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Route not found")

    if route is None or not route.data:
        raise HTTPException(status_code=404, detail="Route not found")

    route_data = route.data[0]

    # Check if already sent
    existing = supabase.table("sends").select("*").eq("user_id", user_id).eq("route_id", route_id).execute()

    if existing and existing.data:
        return {"sent": True, "send_count": route_data["send_count"], "message": "Already sent"}

    # Insert into sends table - handle foreign key errors
    try:
        supabase.table("sends").insert({"user_id": user_id, "route_id": route_id}).execute()
    except Exception as e:
        # Foreign key error - user doesn't exist
        if "foreign key" in str(e).lower() or "23503" in str(e):
            raise HTTPException(status_code=400, detail="Invalid user ID - user does not exist")
        raise HTTPException(status_code=500, detail=str(e))

    # Increment send_count on route
    new_count = (route_data["send_count"] or 0) + 1
    supabase.table("routes").update({"send_count": new_count}).eq("id", route_id).execute()

    return {"sent": True, "send_count": new_count}


@router.delete("/{route_id}/send")
async def unsend_route(route_id: str, user_id: str = Query(..., description="User ID (temp until auth)")):
    """
    Remove a send (unmark route completion).
    """
    supabase = get_supabase()

    # Get current send_count
    try:
        route = supabase.table("routes").select("id, send_count").eq("id", route_id).limit(1).execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Route not found")

    if route is None or not route.data:
        raise HTTPException(status_code=404, detail="Route not found")

    route_data = route.data[0]

    # Check if sent
    existing = supabase.table("sends").select("*").eq("user_id", user_id).eq("route_id", route_id).execute()

    if not existing or not existing.data:
        return {"sent": False, "send_count": route_data["send_count"], "message": "Not sent"}

    # Remove from sends
    supabase.table("sends").delete().eq("user_id", user_id).eq("route_id", route_id).execute()

    # Decrement send_count
    new_count = max(0, route_data["send_count"] - 1)
    supabase.table("routes").update({"send_count": new_count}).eq("id", route_id).execute()

    return {"sent": False, "send_count": new_count}
