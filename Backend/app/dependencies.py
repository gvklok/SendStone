"""Shared FastAPI dependencies."""
import base64
import hashlib
import hmac
import json
import time
from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)


def _decode_supabase_jwt(token: str) -> Optional[str]:
    """
    Verify a Supabase HS256 JWT and return the user ID (sub claim).

    1. Checks the HS256 signature against SUPABASE_JWT_SECRET
    2. Checks the exp claim (rejects expired tokens)
    3. Returns the sub claim (Supabase user UUID) on success, None on failure
    """
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts

        # --- Signature verification ---
        secret = get_settings().supabase_jwt_secret.encode()
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(secret, signing_input, hashlib.sha256).digest()

        # Base64url-decode the signature from the token
        rem = len(sig_b64) % 4
        actual_sig = base64.urlsafe_b64decode(sig_b64 + '=' * (4 - rem if rem else 0))

        # Constant-time comparison to prevent timing attacks
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        # --- Payload decoding ---
        rem = len(payload_b64) % 4
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + '=' * (4 - rem if rem else 0)))

        # --- Expiration check ---
        exp = payload.get('exp')
        if exp is not None and time.time() > exp:
            return None

        return payload.get('sub') or None

    except Exception:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    Verify the Supabase Bearer JWT and return the authenticated user's ID.
    Raises 401 if the token is missing, invalid, expired, or has a bad signature.
    """
    user_id = _decode_supabase_jwt(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
) -> Optional[str]:
    """
    Like get_current_user but returns None instead of raising if no token is supplied.
    """
    if not credentials:
        return None
    return _decode_supabase_jwt(credentials.credentials)
