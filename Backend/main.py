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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes.router)
app.include_router(hardware.router)
app.include_router(profiles.router)
app.include_router(ml.router)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print("🚀 Starting SendStone API...")
    ml_predictor.initialize()


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
