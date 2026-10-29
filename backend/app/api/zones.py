from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Zone, User
from app.core.security import get_current_user
from app.api.schemas import ZoneCreate, ZoneResponse

router = APIRouter(prefix="/zones", tags=["zones"])

@router.get("/", response_model=list[ZoneResponse])
def list_zones(camera_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Zone)
    if camera_id:
        query = query.filter(Zone.camera_id == camera_id)
    return query.all()

@router.post("/", response_model=ZoneResponse)
def create_zone(zone_in: ZoneCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_zone = Zone(**zone_in.model_dump())
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone

@router.put("/{id}", response_model=ZoneResponse)
def update_zone(id: int, zone_in: ZoneCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zone = db.query(Zone).filter(Zone.id == id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    for key, value in zone_in.model_dump().items():
        setattr(zone, key, value)
    
    db.commit()
    db.refresh(zone)
    return zone

@router.delete("/{id}")
def delete_zone(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zone = db.query(Zone).filter(Zone.id == id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    db.delete(zone)
    db.commit()
    return {"ok": True}
