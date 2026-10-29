"""
Industrial Camera Safety Monitoring - Main Application

FastAPI application with lifespan management, CORS, router registration,
and WebSocket endpoint.
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB, storage dirs, and load model."""
    # Create storage directories
    os.makedirs(settings.evidence_dir, exist_ok=True)
    os.makedirs(settings.upload_dir, exist_ok=True)

    # Initialize database and seed default admin user
    init_db()

    # Load the ML model (singleton)
    try:
        from app.vision.detector import get_detector
        detector = get_detector(
            repo_id=settings.model_repo_id,
            revision=settings.model_revision,
            person_conf=settings.person_confidence,
            ppe_conf=settings.ppe_confidence
        )
        logger.info(f"Model loaded: {settings.model_repo_id}, ready={detector.is_ready()}")

        # Register model in database
        from app.db.database import SessionLocal
        from app.db.models import ModelRegistry
        from datetime import datetime, timezone
        db = SessionLocal()
        try:
            existing = db.query(ModelRegistry).filter_by(
                repository_id=settings.model_repo_id
            ).first()
            if not existing:
                reg = ModelRegistry(
                    repository_id=settings.model_repo_id,
                    revision=settings.model_revision,
                    labels_json=detector.get_labels() if detector.is_ready() else None,
                    validation_status="validated" if detector.is_ready() else "failed",
                    loaded_at=datetime.now(timezone.utc) if detector.is_ready() else None,
                )
                db.add(reg)
            else:
                existing.labels_json = detector.get_labels() if detector.is_ready() else existing.labels_json
                existing.validation_status = "validated" if detector.is_ready() else "failed"
                db.commit()
        except Exception as e:
            logger.error(f"Failed to register model: {e}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to load model: {e}")

    # Save server event loop for background video processor websocket dispatch
    try:
        from app.services.video_service import SessionManager
        import asyncio
        SessionManager.main_loop = asyncio.get_running_loop()
        logger.info("Saved main server event loop to SessionManager")
    except Exception as e:
        logger.warning(f"Could not save running event loop: {e}")

    yield

    # Shutdown: stop all active video sessions
    try:
        from app.services.video_service import SessionManager
        for sid in list(SessionManager._processors.keys()):
            SessionManager.stop_session(sid)
        logger.info("All active sessions stopped")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Unified multi-module industrial intelligence suite: Vision safety, steel defect inspection, vehicle OBD-II diagnostics, semiconductor screening, and predictive maintenance",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve evidence files as static
if os.path.exists(settings.evidence_dir):
    app.mount("/storage/evidence", StaticFiles(directory=settings.evidence_dir), name="evidence")


@app.get("/")
def root():
    """Root endpoint: serves frontend if built, or API info."""
    index_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist", "index.html"))
    if os.path.exists(index_file):
        from fastapi.responses import FileResponse
        return FileResponse(index_file)
    return {
        "app_name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    from app.services.video_service import SessionManager
    try:
        from app.vision.detector import get_detector
        detector = get_detector()
        model_ready = detector.is_ready()
    except Exception:
        model_ready = False

    return {
        "status": "healthy",
        "model_ready": model_ready,
        "database": "connected",
        "active_sessions": len(SessionManager._processors),
        "version": "1.0.0",
    }


# --- Register API routers ---
# Each router defines its own sub-prefix (e.g., /auth, /cameras).
# We mount them all under /api.

try:
    from app.api.auth import router as auth_router
    app.include_router(auth_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not import auth router: {e}")

try:
    from app.api.cameras import router as cameras_router
    app.include_router(cameras_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not import cameras router: {e}")

try:
    from app.api.videos import router as videos_router
    app.include_router(videos_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not import videos router: {e}")

try:
    from app.api.sessions import router as sessions_router
    app.include_router(sessions_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not import sessions router: {e}")

try:
    from app.api.incidents import router as incidents_router
    app.include_router(incidents_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not import incidents router: {e}")

try:
    from app.api.analytics import router as analytics_router
    app.include_router(analytics_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not import analytics router: {e}")

try:
    from app.api.models_api import router as models_router
    app.include_router(models_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not import models router: {e}")

try:
    from app.api.zones import router as zones_router
    app.include_router(zones_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not import zones router: {e}")

try:
    from app.api.organizations import router as organizations_router
    app.include_router(organizations_router, prefix="/api")
except Exception as e:
    logger.warning(f"Could not import organizations router: {e}")

# --- Integrated Team Modules ---
try:
    from app.modules.defect_vision.router import router as defect_router
    app.include_router(defect_router)
    logger.info("Registered DefectVision router")
except Exception as e:
    logger.warning(f"Could not import defect_vision router: {e}")

try:
    from app.modules.aegis_burn.router import router as aegis_router
    app.include_router(aegis_router)
    logger.info("Registered AegisBurn router")
except Exception as e:
    logger.warning(f"Could not import aegis_burn router: {e}")

try:
    from app.modules.previsio.router import router as previsio_router
    app.include_router(previsio_router)
    logger.info("Registered Previsio router")
except Exception as e:
    logger.warning(f"Could not import previsio router: {e}")

try:
    from app.modules.factory_mind.router import router as factory_router
    app.include_router(factory_router)
    logger.info("Registered FactoryMind router")
except Exception as e:
    logger.warning(f"Could not import factory_mind router: {e}")

try:
    from app.modules.aeroguard.router import router as aeroguard_router
    app.include_router(aeroguard_router)
    logger.info("Registered AeroGuard router")
except Exception as e:
    logger.warning(f"Could not import aeroguard router: {e}")

try:
    import sys
    from pathlib import Path
    car_fault_dir = str(Path(__file__).parent / "modules" / "car_fault")
    if car_fault_dir not in sys.path:
        sys.path.insert(0, car_fault_dir)
    from api.main import create_app as create_car_fault_app
    app.mount("/car-fault", create_car_fault_app())
    logger.info("Mounted Car Fault module at /car-fault")
except Exception as e:
    logger.warning(f"Could not mount car_fault app: {e}")


# --- WebSocket endpoint ---
# websocket.py exports a function, not a router
try:
    from app.api.websocket import websocket_endpoint, manager as ws_manager

    @app.websocket("/ws/monitoring/{session_id}")
    async def ws_monitoring(websocket: WebSocket, session_id: int):
        await websocket_endpoint(websocket, session_id)

except Exception as e:
    logger.warning(f"Could not set up websocket endpoint: {e}")


# --- Static Frontend Serving for Production Deployments ---
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    from fastapi import Request
    from fastapi.responses import FileResponse, JSONResponse
    from starlette.exceptions import HTTPException as StarletteHTTPException

    @app.exception_handler(StarletteHTTPException)
    async def custom_spa_404_handler(request: Request, exc: StarletteHTTPException):
        if exc.status_code == 404:
            index_path = os.path.join(frontend_dist, "index.html")
            if os.path.exists(index_path) and not request.url.path.startswith(("/api", "/car-fault", "/ws")):
                return FileResponse(index_path)
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="spa-frontend")
    logger.info(f"Mounted production frontend from {frontend_dist}")
