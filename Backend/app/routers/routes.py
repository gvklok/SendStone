"""Routes API endpoints."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.database import get_supabase_admin
from app.models import RouteResponse, PaginatedRoutes, RouteCreate, Hold

router = APIRouter(prefix="/routes", tags=["routes"])


def _attach_author_usernames(supabase, routes):
    """Populate author_username from profiles using creator_id."""
    if not routes:
        return routes

    creator_ids = list({r.get("creator_id") for r in routes if r.get("creator_id")})
    username_by_id = {}

    if creator_ids:
        try:
            profiles = (
                supabase.table("profiles")
                .select("id, username")
                .in_("id", creator_ids)
                .execute()
            )
            for profile in profiles.data or []:
                username_by_id[profile["id"]] = profile.get("username")
        except Exception:
            # If bulk lookup fails, fallback to per-id lookups below.
            pass

        unresolved_ids = [cid for cid in creator_ids if cid not in username_by_id]
        for creator_id in unresolved_ids:
            try:
                profile = (
                    supabase.table("profiles")
                    .select("username")
                    .eq("id", creator_id)
                    .limit(1)
                    .execute()
                )
                username_by_id[creator_id] = profile.data[0].get("username") if profile and profile.data else None
            except Exception:
                username_by_id[creator_id] = None

    for route in routes:
        creator_id = route.get("creator_id")
        fallback_username = (
            route.get("author_username")
            or route.get("authorUsername")
            or route.get("setter_username")
            or route.get("username")
        )
        route["author_username"] = username_by_id.get(creator_id) or fallback_username or "climber"

    return routes


@router.get("", response_model=PaginatedRoutes)
async def list_routes(
    search: Optional[str] = Query(None, description="Filter by name (partial match)"),
    difficulty: Optional[str] = Query(None, description="Filter by grade (e.g., 'v5')"),
    creator_id: Optional[str] = Query(None, description="Filter by creator user id"),
    include_private: bool = Query(False, description="Include private routes when filtering by creator"),
    sort: str = Query("-created_at", description="Sort field. Prefix '-' for descending"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page")
):
    """
    List all public routes with optional filters.
    
    Queries routes table and fetches holds separately.
    """
    supabase = get_supabase_admin()
    
    # Query routes table directly
    query = supabase.table("routes").select("*", count="exact")
    
    # Default to public-only. Allow private routes only for creator-filtered queries.
    if include_private and creator_id:
        query = query.eq("creator_id", creator_id)
    else:
        query = query.eq("visibility", "public")
    
    if search:
        query = query.ilike("name", f"%{search}%")
    
    if difficulty:
        query = query.eq("difficulty", difficulty.lower())

    if creator_id and not (include_private and creator_id):
        query = query.eq("creator_id", creator_id)
    
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
    
    # Fetch all holds for this page in one query, then group by route_id
    route_ids = [r["id"] for r in response.data if r.get("id")]
    holds_by_route = {}
    if route_ids:
        holds_response = (
            supabase.table("route_holds")
            .select("route_id, x, y, color")
            .in_("route_id", route_ids)
            .order("position")
            .execute()
        )
        for hold in holds_response.data or []:
            rid = hold["route_id"]
            holds_by_route.setdefault(rid, []).append(
                {"x": hold["x"], "y": hold["y"], "color": hold["color"]}
            )

    routes_with_holds = []
    for route in response.data:
        route["holds"] = holds_by_route.get(route["id"], [])
        routes_with_holds.append(route)

    routes_with_holds = _attach_author_usernames(supabase, routes_with_holds)
    
    return PaginatedRoutes(
        items=routes_with_holds,
        page=page,
        total=response.count or 0
    )


@router.get("/meta/saved")
async def get_saved_routes(user_id: str = Query(..., description="User ID")):
    """
    Return full saved routes for a user (with holds + author username).
    """
    supabase = get_supabase_admin()

    saved_res = (
        supabase.table("user_saved_routes")
        .select("route_id, saved_at")
        .eq("user_id", user_id)
        .order("saved_at", desc=True)
        .execute()
    )

    saved_rows = saved_res.data or []
    if not saved_rows:
        return {"items": [], "total": 0}

    route_ids = [row["route_id"] for row in saved_rows if row.get("route_id")]
    if not route_ids:
        return {"items": [], "total": 0}

    routes_res = (
        supabase.table("routes")
        .select("*")
        .in_("id", route_ids)
        .execute()
    )
    routes = routes_res.data or []

    routes_by_id = {r["id"]: r for r in routes if r.get("id")}
    enriched = []
    for row in saved_rows:
        route_id = row.get("route_id")
        route = routes_by_id.get(route_id)
        if not route:
            continue
        holds_res = (
            supabase.table("route_holds")
            .select("x, y, color")
            .eq("route_id", route_id)
            .order("position")
            .execute()
        )
        route["holds"] = holds_res.data or []
        route["saved_at"] = row.get("saved_at")
        enriched.append(route)

    enriched = _attach_author_usernames(supabase, enriched)

    return {"items": enriched, "total": len(enriched)}


@router.get("/meta/sent_ids")
async def get_sent_route_ids(user_id: str = Query(..., description="User ID")):
    """
    Return route IDs ascended by a user.
    """
    supabase = get_supabase_admin()

    sent_res = (
        supabase.table("sends")
        .select("route_id")
        .eq("user_id", user_id)
        .execute()
    )
    route_ids = [row["route_id"] for row in (sent_res.data or []) if row.get("route_id")]
    return {"route_ids": route_ids}


@router.get("/{route_id}", response_model=RouteResponse)
async def get_route(route_id: str):
    """
    Get a single route by ID with its holds.
    """
    supabase = get_supabase_admin()
    
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
    route_data = _attach_author_usernames(supabase, [route_data])[0]
    
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
    supabase = get_supabase_admin()
    
    # 1. Create the route (without holds - they go in separate table)
    route_data = {
        "name": route.name,
        "difficulty": route.difficulty,
        "description": route.description,
        "angle": route.angle,
        "visibility": route.visibility,
        "creator_id": route.creator_id,
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
    
    # 3. Return created route from base tables (avoid view permission dependency)
    created_route = route_response.data[0]
    created_route["holds"] = [
        {"x": hold.x, "y": hold.y, "color": hold.color}
        for hold in route.holds
    ] if route.holds else []
    created_route = _attach_author_usernames(supabase, [created_route])[0]

    return created_route


@router.delete("/{route_id}", status_code=200)
async def delete_route(route_id: str, user_id: str = Query(None, description="User ID (temp until auth)")):
    """
    Delete a route and all its associated data.
    
    TODO: Add auth - only route creator or admin should be able to delete
    """
    supabase = get_supabase_admin()
    
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
    supabase = get_supabase_admin()
    
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
    supabase = get_supabase_admin()
    
    supabase.table("user_saved_routes").delete().eq("user_id", user_id).eq("route_id", route_id).execute()
    
    return {"saved": False}


# ============== SEND ENDPOINTS (completions) ==============

@router.put("/{route_id}/send")
async def send_route(route_id: str, user_id: str = Query(..., description="User ID (temp until auth)")):
    """
    Log a send (mark route as completed by user).

    TODO: Get user_id from auth token instead of query param
    """
    supabase = get_supabase_admin()

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
    supabase = get_supabase_admin()

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
