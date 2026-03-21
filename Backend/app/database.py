"""Supabase database connection."""
from supabase import create_client, Client
from app.config import get_settings

_supabase_client: Client | None = None
_supabase_admin_client: Client | None = None
_supabase_admin_raw_client: Client | None = None


def get_supabase() -> Client:
    """Get Supabase client instance using v2 schema (singleton)."""
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_anon_key
        ).schema("v2")
    return _supabase_client


def get_supabase_admin() -> Client:
    """Get Supabase client with service role (admin) privileges, v2 schema (singleton)."""
    global _supabase_admin_client
    if _supabase_admin_client is None:
        settings = get_settings()
        _supabase_admin_client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        ).schema("v2")
    return _supabase_admin_client


def get_supabase_admin_raw() -> Client:
    """Get Supabase admin client without forcing a schema (singleton).

    Useful when tables/views live outside the v2 schema.
    """
    global _supabase_admin_raw_client
    if _supabase_admin_raw_client is None:
        settings = get_settings()
        _supabase_admin_raw_client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        )
    return _supabase_admin_raw_client
