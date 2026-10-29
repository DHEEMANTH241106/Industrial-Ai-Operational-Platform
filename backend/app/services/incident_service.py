from sqlalchemy.orm import Session
from app.db.models import Incident, IncidentEvidence, IncidentEvent
from datetime import datetime, timezone
from app.core.config import settings

class IncidentService:
    @staticmethod
    def create_incident(db: Session, camera_id, session_id, violation_type, risk_score, severity, track_id=None, description=None, snapshot_path=None, detection_data=None, organization_id=None) -> Incident:
        # Check deduplication
        now = datetime.now(timezone.utc)
        
        recent_incident = None
        if track_id is not None:
            recent_incident = db.query(Incident).filter(
                Incident.session_id == session_id,
                Incident.track_id == track_id,
                Incident.violation_type == violation_type,
                Incident.status == "open"
            ).first()
            
        if recent_incident:
            recent_incident.last_seen = now
            if snapshot_path:
                evidence = IncidentEvidence(
                    incident_id=recent_incident.id,
                    snapshot_path=snapshot_path,
                    timestamp=now,
                    detection_data=detection_data
                )
                db.add(evidence)
            db.commit()
            db.refresh(recent_incident)
            return recent_incident
            
        # Create new incident
        incident = Incident(
            organization_id=organization_id,
            camera_id=camera_id,
            session_id=session_id,
            violation_type=violation_type,
            risk_score=risk_score,
            severity=severity,
            first_seen=now,
            last_seen=now,
            track_id=track_id,
            description=description
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        
        # Add event
        event = IncidentEvent(
            incident_id=incident.id,
            action="created",
            created_at=now
        )
        db.add(event)
        
        # Add evidence
        if snapshot_path:
            evidence = IncidentEvidence(
                incident_id=incident.id,
                snapshot_path=snapshot_path,
                timestamp=now,
                detection_data=detection_data
            )
            db.add(evidence)
            
        db.commit()
        db.refresh(incident)
        return incident
    
    @staticmethod
    def get_incidents(db: Session, camera_id=None, session_id=None, status=None, severity=None, violation_type=None, skip=0, limit=50) -> tuple[list[Incident], int]:
        query = db.query(Incident)
        
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
            
        total = query.count()
        incidents = query.order_by(Incident.first_seen.desc()).offset(skip).limit(limit).all()
        return incidents, total
    
    @staticmethod
    def get_incident(db: Session, incident_id: int) -> Incident | None:
        return db.query(Incident).filter(Incident.id == incident_id).first()
    
    @staticmethod
    def update_incident_status(db: Session, incident_id: int, new_status: str, actor_id: int = None, notes: str = None) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return None
            
        incident.status = new_status
        event = IncidentEvent(
            incident_id=incident.id,
            actor_id=actor_id,
            action=new_status,
            notes=notes,
            created_at=datetime.now(timezone.utc)
        )
        db.add(event)
        db.commit()
        db.refresh(incident)
        return incident
    
    @staticmethod
    def get_summary(db: Session, camera_id=None, start_date=None, end_date=None) -> dict:
        query = db.query(Incident)
        if camera_id:
            query = query.filter(Incident.camera_id == camera_id)
        if start_date:
            query = query.filter(Incident.first_seen >= start_date)
        if end_date:
            query = query.filter(Incident.first_seen <= end_date)
            
        incidents = query.all()
        summary = {
            "total": len(incidents),
            "by_status": {},
            "by_severity": {},
            "by_violation_type": {}
        }
        
        for inc in incidents:
            summary["by_status"][inc.status] = summary["by_status"].get(inc.status, 0) + 1
            summary["by_severity"][inc.severity] = summary["by_severity"].get(inc.severity, 0) + 1
            summary["by_violation_type"][inc.violation_type] = summary["by_violation_type"].get(inc.violation_type, 0) + 1
            
        return summary
