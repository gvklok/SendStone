"""Supabase database connection."""
from supabase import create_client, Client
from app.config import get_settings


def get_supabase() -> Client:
    """Get Supabase client instance using v2 schema."""
    settings = get_settings()
    client = create_client(
        settings.supabase_url,
        settings.supabase_anon_key
    )
    return client.schema("v2")


def get_supabase_admin() -> Client:
    """Get Supabase client with service role (admin) privileges.
    
    Uses v2 schema for profiles table.
    """
    settings = get_settings()
    client = create_client(
        settings.supabase_url,
        settings.supabase_service_key
    )
    return client.schema("v2")


def get_supabase_admin_raw() -> Client:
    """Get Supabase admin client without forcing a schema.

    Useful when tables/views live outside the v2 schema.
    """
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_key
    )
