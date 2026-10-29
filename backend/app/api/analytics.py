from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.db.models import Incident, MonitoringSession, Camera, User
from app.core.security import get_current_user
from app.api.schemas import AnalyticsSummary
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(
    camera_id: int | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Incident)
    if current_user.organization_id and current_user.role != "superadmin":
        query = query.filter(Incident.organization_id == current_user.organization_id)
    if camera_id:
        query = query.filter(Incident.camera_id == camera_id)
    if start_date:
        query = query.filter(Incident.first_seen >= start_date)
    if end_date:
        query = query.filter(Incident.first_seen <= end_date)
        
    incidents = query.all()
    
    total_incidents = len(incidents)
    open_incidents = sum(1 for i in incidents if i.status == "open")
    acknowledged_incidents = sum(1 for i in incidents if i.status == "acknowledged")
    resolved_incidents = sum(1 for i in incidents if i.status == "resolved")
    false_positives = sum(1 for i in incidents if i.status == "false_positive")
    high_risk_incidents = sum(1 for i in incidents if i.severity == "high" or i.severity == "critical")
    
    by_type = {}
    by_severity = {}
    by_camera = {}
    
    for i in incidents:
        by_type[i.violation_type] = by_type.get(i.violation_type, 0) + 1
        by_severity[i.severity] = by_severity.get(i.severity, 0) + 1
        cam_key = str(i.camera_id)
        by_camera[cam_key] = by_camera.get(cam_key, 0) + 1
        
    recent_incidents = sorted(incidents, key=lambda x: x.first_seen, reverse=True)[:5]
    
    sess_query = db.query(MonitoringSession).filter(MonitoringSession.status == "active")
    cam_query = db.query(Camera)
    if current_user.organization_id and current_user.role != "superadmin":
        sess_query = sess_query.join(Camera).filter(Camera.organization_id == current_user.organization_id)
        cam_query = cam_query.filter(Camera.organization_id == current_user.organization_id)

    active_sessions = sess_query.count()
    total_cameras = cam_query.count()
    
    return AnalyticsSummary(
        total_incidents=total_incidents,
        open_incidents=open_incidents,
        acknowledged_incidents=acknowledged_incidents,
        resolved_incidents=resolved_incidents,
        false_positives=false_positives,
        high_risk_incidents=high_risk_incidents,
        incidents_by_type=by_type,
        incidents_by_severity=by_severity,
        incidents_by_camera=by_camera,
        recent_incidents=recent_incidents,
        active_sessions=active_sessions,
        total_cameras=total_cameras
    )

@router.get("/trends")
def get_trends(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    # This might need adjustment depending on DB dialect for extracting date
    results = db.query(func.date(Incident.first_seen).label('date'), func.count(Incident.id)).filter(Incident.first_seen >= thirty_days_ago).group_by(func.date(Incident.first_seen)).all()
    return [{"date": str(r[0]), "count": r[1]} for r in results]

@router.get("/by-type")
def get_by_type(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(Incident.violation_type, func.count(Incident.id)).group_by(Incident.violation_type).all()
    return [{"type": r[0], "count": r[1]} for r in results]

@router.get("/by-camera")
def get_by_camera(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(Camera.name, func.count(Incident.id)).join(Incident, Camera.id == Incident.camera_id).group_by(Camera.name).all()
    return [{"camera": r[0], "count": r[1]} for r in results]
