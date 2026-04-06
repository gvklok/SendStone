"""SendStone Backend - FastAPI Application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import routes, hardware, profiles, ml
from app.services import ml_predictor

# Create FastAPI app
app = FastAPI(
    title="SendStone API",
    description="Backend API for SendStone climbing route manager",
    version="0.1.0"
)

# CORS middleware - allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: Restrict in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes.router)
app.include_router(hardware.router)
app.include_router(profiles.router)
app.include_router(ml.router)


async def _warmup_supabase():
    """Fire a lightweight Supabase query in the background to pre-warm the connection."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        from app.database import get_supabase_admin
        await loop.run_in_executor(
            None,
            lambda: get_supabase_admin().table("routes").select("id").limit(1).execute()
        )
        print("✓ Supabase connection warmed up")
    except Exception as e:
        print(f"⚠️  Supabase warmup failed (will retry on first request): {e}")


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    import asyncio
    print("🚀 Starting SendStone API...")
    ml_predictor.initialize()
    asyncio.create_task(_warmup_supabase())


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "SendStone API is running"}


@app.get("/health")
async def health():
    """Detailed health check."""
    settings = get_settings()
    return {
        "status": "healthy",
        "debug": settings.debug,
        "supabase_configured": bool(settings.supabase_url)
    }


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
