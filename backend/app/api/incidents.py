from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Incident, IncidentEvidence, IncidentEvent, User
from app.core.security import get_current_user
from app.api.schemas import IncidentResponse, IncidentUpdate, EvidenceResponse
from datetime import datetime

router = APIRouter(prefix="/incidents", tags=["incidents"])

@router.get("/", response_model=list[IncidentResponse])
def list_incidents(
    camera_id: int | None = None,
    session_id: int | None = None,
    status: str | None = None,
    severity: str | None = None,
    violation_type: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Incident)
    if current_user.organization_id and current_user.role != "superadmin":
        query = query.filter(Incident.organization_id == current_user.organization_id)
    if camera_id:
        query = query.filter(Incident.camera_id == camera_id)
    if session_id:
        query = query.filter(Incident.session_id == session_id)
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    if violation_type:
        query = query.filter(Incident.violation_type == violation_type)
        
    return query.offset(skip).limit(limit).all()

@router.get("/{id}", response_model=IncidentResponse)
def get_incident(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Incident).filter(Incident.id == id)
    if current_user.organization_id and current_user.role != "superadmin":
        query = query.filter(Incident.organization_id == current_user.organization_id)
    incident = query.first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.patch("/{id}", response_model=IncidentResponse)
def update_incident(id: int, update_in: IncidentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Incident).filter(Incident.id == id)
    if current_user.organization_id and current_user.role != "superadmin":
        query = query.filter(Incident.organization_id == current_user.organization_id)
    incident = query.first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    incident.status = update_in.status
    
    event = IncidentEvent(
        incident_id=incident.id,
        actor_id=current_user.id,
        action=f"status_changed_to_{update_in.status}",
        notes=update_in.notes,
        created_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(incident)
    return incident

@router.get("/{id}/evidence", response_model=list[EvidenceResponse])
def list_evidence(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return db.query(IncidentEvidence).filter(IncidentEvidence.incident_id == id).all()
