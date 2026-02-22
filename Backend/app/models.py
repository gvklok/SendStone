"""Pydantic models for request/response validation.

Matches the actual Supabase database schema:
- routes: Main routes table
- routes_with_holds: View with holds as JSONB array
- profiles: User profiles
- route_holds: Individual holds (separate table)
- sends: User completions
- user_saved_routes: Bookmarks
- attempts, sessions, user_milestones: Tracking tables
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# ============== HOLDS ==============

class Hold(BaseModel):
    """A single hold on a route."""
    x: float = Field(..., description="X coordinate (0-10)")
    y: float = Field(..., description="Y coordinate (0-14)")
    color: str = Field(..., description="Hold color: green/blue/yellow/red")


# ============== ROUTES ==============

class RouteBase(BaseModel):
    """Base route fields for creation."""
    name: str = Field(..., min_length=1, max_length=255)
    difficulty: str = Field(..., description="V-grade (e.g., 'v5')")
    description: Optional[str] = None
    angle: int = Field(default=40, ge=0, le=70)
    visibility: str = Field(default="public", description="public or private")
    creator_id: Optional[str] = None


class RouteCreate(RouteBase):
    """Schema for creating a route with holds."""
    holds: List[Hold]


class RouteUpdate(BaseModel):
    """Schema for updating a route (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    difficulty: Optional[str] = None
    description: Optional[str] = None
    angle: Optional[int] = Field(None, ge=0, le=70)
    visibility: Optional[str] = None


class RouteResponse(BaseModel):
    """Schema for route responses (from routes_with_holds view)."""
    id: str
    name: str
    difficulty: str
    description: Optional[str] = None
    angle: int
    visibility: str
    send_count: int = 0
    creator_id: Optional[str] = None
    author_username: Optional[str] = None
    quality_average: Optional[float] = None
    ai_suggested_grade: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    holds: List[Any] = []  # JSONB from view

    class Config:
        from_attributes = True


class PaginatedRoutes(BaseModel):
    """Paginated list of routes."""
    items: List[RouteResponse]
    page: int
    total: int


# ============== PROFILES ==============

class ProfileBase(BaseModel):
    """Base profile fields."""
    name: str
    email: str
    username: str
    photo_url: Optional[str] = None
    climber_level: Optional[str] = None  # beginner/intermediate/advanced/expert


class ProfileResponse(ProfileBase):
    """Profile response schema."""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== SAVES/SENDS ==============

class SaveResponse(BaseModel):
    """Response for save/unsave operations."""
    saved: bool
    saved_at: Optional[datetime] = None


class SendResponse(BaseModel):
    """Response for send/unsend operations (completions)."""
    sent: bool
    send_count: int


# ============== ERRORS ==============

class ErrorDetail(BaseModel):
    """Error response detail."""
    code: str
    message: str


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: ErrorDetail
