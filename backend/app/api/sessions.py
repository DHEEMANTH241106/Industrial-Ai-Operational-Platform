from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import MonitoringSession, User, Camera
from app.core.security import get_current_user
from app.api.schemas import SessionCreate, SessionResponse
from datetime import datetime, timezone

from app.core.config import settings
from app.db.database import SessionLocal
from app.services.video_service import SessionManager

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=SessionResponse)
def start_session(session_in: SessionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    camera = db.query(Camera).filter(Camera.id == session_in.camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    source_to_use = session_in.video_source or camera.source_uri or (0 if camera.source_type == "webcam" else "")

    db_session = MonitoringSession(
        camera_id=session_in.camera_id,
        video_source=str(source_to_use),
        status="active",
        started_at=datetime.utcnow(),
        frame_count=0,
        detection_count=0,
        incident_count=0,
        avg_fps=0.0,
        avg_latency_ms=0.0
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Launch real background video & AI processor
    SessionManager.start_session(
        session_id=db_session.id,
        source=str(source_to_use),
        camera_id=camera.id,
        settings=settings,
        db_factory=SessionLocal
    )
    
    return db_session

@router.get("/", response_model=list[SessionResponse])
def list_sessions(camera_id: int | None = None, status: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(MonitoringSession)
    if current_user.organization_id and current_user.role != "superadmin":
        query = query.join(Camera).filter(Camera.organization_id == current_user.organization_id)
    if camera_id:
        query = query.filter(MonitoringSession.camera_id == camera_id)
    if status:
        query = query.filter(MonitoringSession.status == status)
    return query.all()

@router.get("/{id}", response_model=SessionResponse)
def get_session(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session_db = db.query(MonitoringSession).filter(MonitoringSession.id == id).first()
    if not session_db:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_db

@router.post("/{id}/stop")
def stop_session(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session_db = db.query(MonitoringSession).filter(MonitoringSession.id == id).first()
    if not session_db:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session_db.status = "stopped"
    session_db.ended_at = datetime.utcnow()
    db.commit()
    
    # Stop background processor
    SessionManager.stop_session(id)
    return {"status": "success"}

@router.get("/{id}/metrics")
def get_metrics(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    processor = SessionManager.get_session(id)
    if processor:
        m = processor.get_metrics()
        return {
            "fps": m.get("fps", 0.0),
            "latency_ms": m.get("latency_ms", 0.0),
            "frame_count": m.get("frames_processed", 0),
            "detection_count": m.get("detections", 0)
        }

    session_db = db.query(MonitoringSession).filter(MonitoringSession.id == id).first()
    if not session_db:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {
        "fps": session_db.avg_fps,
        "latency_ms": session_db.avg_latency_ms,
        "frame_count": session_db.frame_count,
        "detection_count": session_db.detection_count
    }
