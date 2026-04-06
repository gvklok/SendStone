"""Profiles API endpoints."""
import base64
from datetime import datetime, timezone
import re
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from app.database import get_supabase_admin, get_supabase_admin_raw  # Use admin client to bypass RLS
from app.models import ProfileResponse

router = APIRouter(prefix="/profiles", tags=["profiles"])


class ProfileCreateUpdate(BaseModel):
    """Schema for creating or updating a profile."""
    id: str  # Supabase auth user ID
    email: str
    name: str
    username: str
    photo_url: Optional[str] = None
    climber_level: Optional[str] = "beginner"


class DashboardStatsResponse(BaseModel):
    """Dashboard summary counts for a user."""
    problems_created: int
    successful_ascensions: int
    sessions: int
    max_grade: Optional[str] = None
    saved_climbs: int
    community_ascensions: int


class EmailUpdateRequest(BaseModel):
    """Request schema for updating connected email."""
    email: str


def _parse_grade_value(grade: Optional[str]) -> Optional[int]:
    """Convert grade strings like v5/V5 to a comparable numeric value."""
    if not grade:
        return None

    normalized = str(grade).strip().upper()
    if normalized == "VB":
        return -1

    match = re.match(r"^V\s*(\d+)", normalized)
    if not match:
        return None

    return int(match.group(1))


def _format_grade_value(value: Optional[int]) -> Optional[str]:
    """Format a numeric grade value back to display form."""
    if value is None:
        return None
    if value < 0:
        return "VB"
    return f"V{value}"


@router.get("/{user_id}", response_model=ProfileResponse)
async def get_profile(user_id: str):
    """
    Get a user profile by ID.
    """
    supabase = get_supabase_admin()
    
    try:
        response = (
            supabase.table("profiles")
            .select("*")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as e:
        print(f"DB error in get_profile: {e}")
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return response.data[0]


@router.get("", response_model=list[ProfileResponse])
async def list_profiles():
    """
    List all user profiles.
    """
    supabase = get_supabase_admin()
    
    try:
        response = supabase.table("profiles").select("*").execute()
        return response.data or []
    except Exception as e:
        print(f"DB error in list_profiles: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("", response_model=ProfileResponse, status_code=201)
async def create_or_update_profile(profile: ProfileCreateUpdate):
    """
    Create or update a user profile (upsert).
    
    If a profile with the given ID exists, it will be updated.
    Otherwise, a new profile will be created.
    """
    supabase = get_supabase_admin()
    
    profile_data = {
        "id": profile.id,
        "email": profile.email,
        "name": profile.name,
        "username": profile.username,
        "photo_url": profile.photo_url,
        "climber_level": profile.climber_level if profile.climber_level in ("beginner", "intermediate", "advanced", "expert") else "beginner",
    }
    
    try:
        # Try to upsert
        response = (
            supabase.table("profiles")
            .upsert(profile_data)
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create/update profile")
        
        return response.data[0]
    except Exception as e:
        # Log the actual error for debugging
        print(f"Profile upsert error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create/update profile")


@router.patch("/{user_id}", response_model=ProfileResponse)
async def update_profile_fields(user_id: str, updates: dict):
    """
    Partially update a profile.
    
    Only the fields provided in the request body will be updated.
    """
    supabase = get_supabase_admin()
    
    ALLOWED_FIELDS = {"name", "username", "photo_url", "climber_level"}
    updates = {k: v for k, v in updates.items() if k in ALLOWED_FIELDS}

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    try:
        response = (
            supabase.table("profiles")
            .update(updates)
            .eq("id", user_id)
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return response.data[0]
    except Exception as e:
        print(f"DB error in update_profile_fields: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.delete("/{user_id}")
async def delete_profile(user_id: str):
    """
    Delete a user profile.
    """
    supabase = get_supabase_admin()
    
    try:
        response = (
            supabase.table("profiles")
            .delete()
            .eq("id", user_id)
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return {"message": "Profile deleted successfully"}
    except Exception as e:
        print(f"DB error in delete_profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete profile")


@router.post("/{user_id}/photo")
async def update_profile_photo(user_id: str, file: UploadFile = File(...)):
    """
    Update a user's profile photo from an uploaded image file.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file upload")
    if len(data) > 800 * 1024:
        raise HTTPException(status_code=400, detail="Image is too large (max ~800KB)")

    encoded = base64.b64encode(data).decode("ascii")
    photo_url = f"data:{file.content_type};base64,{encoded}"

    updated_row = None
    for client in [get_supabase_admin(), get_supabase_admin_raw()]:
        try:
            res = (
                client.table("profiles")
                .update({"photo_url": photo_url})
                .eq("id", user_id)
                .execute()
            )
            if res and res.data:
                updated_row = res.data[0]
                break
        except Exception:
            continue

    if not updated_row:
        raise HTTPException(status_code=500, detail="Failed to update profile photo")

    return {"photo_url": photo_url}


@router.patch("/{user_id}/email")
async def update_connected_email(user_id: str, payload: EmailUpdateRequest):
    """
    Update a user's connected email in both auth and profile records.
    """
    new_email = payload.email.strip().lower()
    if "@" not in new_email or "." not in new_email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email format")

    auth_updated = False
    auth_error = None
    try:
        raw = get_supabase_admin_raw()
        raw.auth.admin.update_user_by_id(user_id, {"email": new_email})
        auth_updated = True
    except Exception as e:
        auth_error = str(e)

    profile_updated = False
    for client in [get_supabase_admin(), get_supabase_admin_raw()]:
        try:
            res = (
                client.table("profiles")
                .update({"email": new_email})
                .eq("id", user_id)
                .execute()
            )
            if res is not None:
                profile_updated = True
                break
        except Exception:
            continue

    if not profile_updated and not auth_updated:
        raise HTTPException(status_code=500, detail=auth_error or "Failed to update email")

    return {
        "updated": True,
        "email": new_email,
        "auth_updated": auth_updated,
        "auth_error": auth_error,
    }


@router.delete("/{user_id}/account")
async def delete_account(user_id: str):
    """
    Permanently delete a user's account and related records.
    """
    errors = []
    deleted_auth = False

    for client in [get_supabase_admin(), get_supabase_admin_raw()]:
        try:
            created = (
                client.table("routes")
                .select("id")
                .eq("creator_id", user_id)
                .execute()
            )
            route_ids = [row.get("id") for row in (created.data or []) if row.get("id") is not None]

            if route_ids:
                for op in [
                    lambda: client.table("route_holds").delete().in_("route_id", route_ids).execute(),
                    lambda: client.table("user_saved_routes").delete().in_("route_id", route_ids).execute(),
                    lambda: client.table("sends").delete().in_("route_id", route_ids).execute(),
                    lambda: client.table("routes").delete().in_("id", route_ids).execute(),
                ]:
                    try:
                        op()
                    except Exception as e:
                        errors.append(str(e))

            for op in [
                lambda: client.table("user_saved_routes").delete().eq("user_id", user_id).execute(),
                lambda: client.table("sends").delete().eq("user_id", user_id).execute(),
                lambda: client.table("sessions").delete().eq("user_id", user_id).execute(),
                lambda: client.table("attempts").delete().eq("user_id", user_id).execute(),
                lambda: client.table("user_milestones").delete().eq("user_id", user_id).execute(),
                lambda: client.table("profiles").delete().eq("id", user_id).execute(),
            ]:
                try:
                    op()
                except Exception as e:
                    errors.append(str(e))
        except Exception as e:
            errors.append(str(e))

    try:
        raw = get_supabase_admin_raw()
        raw.auth.admin.delete_user(user_id)
        deleted_auth = True
    except Exception as e:
        errors.append(str(e))

    if errors and not deleted_auth:
        raise HTTPException(status_code=500, detail=f"Failed to fully delete account: {errors[0]}")

    return {"deleted": True, "auth_deleted": deleted_auth}


@router.post("/{user_id}/sessions")
async def log_user_session(user_id: str):
    """
    Log a login session for a user.

    Uses the `sessions` table if available. Falls back gracefully if insert fails.
    """
    clients = [get_supabase_admin(), get_supabase_admin_raw()]
    payloads = [
        {"user_id": user_id},
        {"user_id": user_id, "started_at": datetime.now(timezone.utc).isoformat()},
        {"user_id": user_id, "created_at": datetime.now(timezone.utc).isoformat()},
    ]

    for client in clients:
        for payload in payloads:
            try:
                client.table("sessions").insert(payload).execute()
                return {"logged": True}
            except Exception:
                continue

    return {"logged": False}


@router.get("/{user_id}/dashboard", response_model=DashboardStatsResponse)
async def get_dashboard_stats(user_id: str):
    """
    Return database-backed dashboard counts for a user.
    """
    clients = [get_supabase_admin(), get_supabase_admin_raw()]

    created_route_ids = set()
    route_send_count_by_id = {}
    for client in clients:
        try:
            created_res = (
                client.table("routes")
                .select("id, send_count")
                .eq("creator_id", user_id)
                .execute()
            )
            for row in created_res.data or []:
                route_id = row.get("id")
                if route_id is None:
                    continue
                created_route_ids.add(str(route_id))
                route_send_count_by_id[str(route_id)] = max(
                    route_send_count_by_id.get(str(route_id), 0),
                    int(row.get("send_count") or 0),
                )
        except Exception:
            continue

    problems_created = len(created_route_ids)
    community_ascensions = sum(route_send_count_by_id.values())

    ascended_route_ids = set()
    for client in clients:
        try:
            ascended_res = (
                client.table("sends")
                .select("route_id")
                .eq("user_id", user_id)
                .execute()
            )
            for row in ascended_res.data or []:
                route_id = row.get("route_id")
                if route_id is None:
                    continue
                ascended_route_ids.add(str(route_id))
        except Exception:
            continue

    successful_ascensions = len(ascended_route_ids)

    # Highest V grade ascended by the user.
    max_grade_value = None
    if ascended_route_ids:
        route_id_list = list(ascended_route_ids)
        chunk_size = 200
        for client in clients:
            try:
                for start in range(0, len(route_id_list), chunk_size):
                    chunk = route_id_list[start:start + chunk_size]
                    routes_res = (
                        client.table("routes")
                        .select("id, difficulty")
                        .in_("id", chunk)
                        .execute()
                    )
                    for route in routes_res.data or []:
                        grade_value = _parse_grade_value(route.get("difficulty"))
                        if grade_value is None:
                            continue
                        if max_grade_value is None or grade_value > max_grade_value:
                            max_grade_value = grade_value
            except Exception:
                continue
    max_grade = _format_grade_value(max_grade_value)

    saved_route_ids = set()
    for client in clients:
        try:
            saved_res = (
                client.table("user_saved_routes")
                .select("route_id")
                .eq("user_id", user_id)
                .execute()
            )
            for row in saved_res.data or []:
                route_id = row.get("route_id")
                if route_id is None:
                    continue
                saved_route_ids.add(str(route_id))
        except Exception:
            continue
    saved_climbs = len(saved_route_ids)

    sessions = 0
    for client in clients:
        try:
            sessions_res = (
                client.table("sessions")
                .select("*", count="exact")
                .eq("user_id", user_id)
                .execute()
            )
            sessions = max(sessions, sessions_res.count or 0)
        except Exception:
            continue

    return DashboardStatsResponse(
        problems_created=problems_created,
        successful_ascensions=successful_ascensions,
        sessions=sessions,
        max_grade=max_grade,
        saved_climbs=saved_climbs,
        community_ascensions=community_ascensions,
    )
