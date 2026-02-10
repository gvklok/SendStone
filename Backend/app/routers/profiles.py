"""Profiles API endpoints."""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_supabase_admin  # Use admin client to bypass RLS
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
        raise HTTPException(status_code=404, detail=f"Profile not found: {str(e)}")
    
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
        raise HTTPException(status_code=500, detail=f"Failed to fetch profiles: {str(e)}")


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
        "climber_level": profile.climber_level or "beginner",
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
        raise HTTPException(status_code=500, detail=f"Failed to create/update profile: {str(e)}")


@router.patch("/{user_id}", response_model=ProfileResponse)
async def update_profile_fields(user_id: str, updates: dict):
    """
    Partially update a profile.
    
    Only the fields provided in the request body will be updated.
    """
    supabase = get_supabase_admin()
    
    # Remove id from updates if present (shouldn't be updated)
    updates.pop("id", None)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
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
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


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
        raise HTTPException(status_code=500, detail=f"Failed to delete profile: {str(e)}")
